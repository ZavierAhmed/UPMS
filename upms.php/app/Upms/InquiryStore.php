<?php

declare(strict_types=1);

namespace App\Upms;

/** Private single-host journal. Stable lock inode + fsynced atomic replacement; never hold lock during SMTP. */
final class InquiryStore
{
    public function __construct(private readonly string $directory)
    {
    }

    public function transaction(callable $work): mixed
    {
        $dir = $this->directory;
        if (! is_dir($dir) && ! @mkdir($dir, 0700, true) && ! is_dir($dir)) {
            throw new \RuntimeException('Private storage unavailable');
        }
        $real = realpath($dir);
        $public = realpath(public_path());
        if (! $real || is_link($dir) || ($public && str_starts_with(strtolower($real).DIRECTORY_SEPARATOR, strtolower($public).DIRECTORY_SEPARATOR))) {
            throw new \RuntimeException('Private storage required');
        }
        $documentRoot = ! empty($_SERVER['DOCUMENT_ROOT']) ? (realpath($_SERVER['DOCUMENT_ROOT']) ?: null) : null;
        if ($documentRoot && str_starts_with(strtolower($real).DIRECTORY_SEPARATOR, strtolower($documentRoot).DIRECTORY_SEPARATOR)) {
            throw new \RuntimeException('Storage must be outside the web root');
        }
        if (PHP_OS_FAMILY !== 'Windows' && (fileperms($dir) & 0077)) {
            throw new \RuntimeException('Private permissions required');
        }
        $lockPath = $dir.'/state.lock';
        $path = $dir.'/state.json';
        if (is_link($lockPath) || is_link($path)) {
            throw new \RuntimeException('Invalid storage');
        }
        $lock = @fopen($lockPath, 'c+b');
        if (! $lock) {
            throw new \RuntimeException('Storage unavailable');
        }
        @chmod($lockPath, 0600);
        $deadline = microtime(true) + 2;
        try {
            while (! flock($lock, LOCK_EX | LOCK_NB)) {
                if (microtime(true) >= $deadline) {
                    throw new \RuntimeException('Storage busy');
                }
                usleep(10000);
            }
            // Only a lock owner can create a journal temporary file. With this
            // exclusive lock held, any such leftover belongs to a stopped writer.
            // Clean it before creating another, bounding crash debris as well.
            foreach (new \DirectoryIterator($dir) as $file) {
                if (preg_match('/^[a-f0-9]{32}\.tmp$/D', $file->getFilename())) {
                    if ($file->isLink() || ! $file->isFile() || ! @unlink($file->getPathname())) {
                        throw new \RuntimeException('Storage unavailable');
                    }
                }
            }
            $state = ['rates' => [], 'keys' => []];
            if (file_exists($path)) {
                if (filesize($path) > 2000000) {
                    throw new \RuntimeException('Invalid storage');
                }
                $state = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($state['rates'] ?? null) || ! is_array($state['keys'] ?? null)) {
                    throw new \RuntimeException('Invalid storage');
                }
                if (count($state['rates']) > 10000 || count($state['keys']) > 1000) {
                    throw new \RuntimeException('Invalid storage');
                }
                foreach ($state['rates'] as $v) {
                    if (! is_array($v) || ! is_int($v['count'] ?? null) || $v['count'] < 0 || ! is_numeric($v['expires'] ?? null)) {
                        throw new \RuntimeException('Invalid storage');
                    }
                }
                foreach ($state['keys'] as $v) {
                    if (! is_array($v) || ! preg_match('/^[a-f0-9]{64}$/D', $v['fingerprint'] ?? '') || ! preg_match('/^[a-f0-9]{32}$/D', $v['reference'] ?? '') || ! is_numeric($v['expires'] ?? null) || ! is_numeric($v['deadline'] ?? null) || ! array_key_exists('outcome', $v) || ! in_array($v['outcome'], [null, 'SmtpAccepted', 'DevelopmentSaved', 'Rejected', 'Unavailable', 'Unknown'], true)) {
                        throw new \RuntimeException('Invalid storage');
                    }
                }
            }
            $now = microtime(true);
            foreach ($state['rates'] as $ip => $v) {
                if ($v['expires'] <= $now) {
                    unset($state['rates'][$ip]);
                }
            }
            foreach ($state['keys'] as $key => $v) {
                if ($v['expires'] <= $now) {
                    unset($state['keys'][$key]);
                }
            }
            $result = $work($state, $now);
            $tmp = $dir.'/'.bin2hex(random_bytes(16)).'.tmp';
            $f = @fopen($tmp, 'x+b');
            if (! $f) {
                throw new \RuntimeException('Storage unavailable');
            }
            try {
                chmod($tmp, 0600);
                $bytes = json_encode($state, JSON_THROW_ON_ERROR);
                if (fwrite($f, $bytes) !== strlen($bytes) || ! fflush($f) || ! fsync($f)) {
                    throw new \RuntimeException('Storage unavailable');
                }
            } finally {
                fclose($f);
            }
            if (! @rename($tmp, $path)) {
                @unlink($tmp);
                throw new \RuntimeException('Storage unavailable');
            }

            return $result;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    public function rate(string $ip, int $limit): ?int
    {
        return $this->transaction(function (&$s, $now) use ($ip, $limit) {
            $ip = hash('sha256', $ip);
            $v = $s['rates'][$ip] ?? ['count' => 0, 'expires' => $now + 600];
            if ((! isset($s['rates'][$ip]) && count($s['rates']) >= 10000) || $v['count'] >= $limit) {
                return max(1, (int) ceil($v['expires'] - $now));
            }
            $v['count']++;
            $s['rates'][$ip] = $v;

            return null;
        });
    }

    public function submit(string $key, array $input, int $timeout, callable $deliver): array
    {
        $fingerprint = hash('sha256', json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $reservation = $this->transaction(function (&$s, $now) use ($key, $fingerprint, $timeout) {
            if (isset($s['keys'][$key])) {
                return ['owner' => false, 'entry' => $s['keys'][$key]];
            }
            if (count($s['keys']) >= 1000) {
                return ['error' => 'busy'];
            }
            $entry = ['fingerprint' => $fingerprint, 'reference' => bin2hex(random_bytes(16)), 'outcome' => null, 'deadline' => $now + $timeout / 1000 + 3, 'expires' => $now + 1800 + $timeout / 1000 + 3];
            $s['keys'][$key] = $entry;

            return ['owner' => true, 'entry' => $entry];
        });
        if (isset($reservation['error'])) {
            return $reservation;
        }
        $entry = $reservation['entry'];
        if ($entry['fingerprint'] !== $fingerprint) {
            return ['error' => 'idempotency_conflict'];
        }
        if ($reservation['owner']) {
            try {
                $outcome = $deliver($entry['reference']);
            } catch (\Throwable) {
                $outcome = 'Unknown';
            }
            // If completion cannot be persisted, leave the durable pending tombstone; never resend.
            $entry = $this->transaction(function (&$s) use ($key, $outcome) {
                $s['keys'][$key]['outcome'] = $outcome;

                return $s['keys'][$key];
            });
        } else {
            while ($entry['outcome'] === null && microtime(true) < $entry['deadline']) {
                usleep(25000);
                $entry = $this->transaction(fn (&$s) => $s['keys'][$key]);
            }
        }

        return ['reference' => $entry['reference'], 'outcome' => $entry['outcome'] ?? 'Unknown'];
    }
}
