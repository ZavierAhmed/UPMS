<?php

declare(strict_types=1);

namespace App\Upms;

final class InquiryDelivery
{
    public static function body(array $r, string $reference): string
    {
        return "Unique Plastic Industry — packaging inquiry\nReference: {$reference}\nCustomer: {$r['customerName']}\nCompany: {$r['companyName']}\nEmail: {$r['email']}\nPhone: {$r['phone']}\nCategory: ".InquiryInput::CATEGORIES[$r['productCategory']]."\nApproximate quantity: {$r['quantity']}\nCapacity / size: {$r['capacity']}\n\nCustomer's plain-text message:\n{$r['message']}";
    }

    public function send(array $config, array $input, string $reference): string
    {
        if ($config['mode'] === 'DevelopmentFile' && $config['development']) {
            $dir = $config['storage'].'/outbox';
            if (! is_dir($dir) && ! @mkdir($dir, 0700)) {
                return 'Unavailable';
            }
            if (is_link($dir) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($dir) & 0077))) {
                return 'Unavailable';
            }
            $tmp = $dir.'/'.$reference.'.tmp';
            $f = @fopen($tmp, 'x+b');
            if (! $f) {
                return 'Unavailable';
            }
            try {
                chmod($tmp, 0600);
                $body = self::body($input, $reference);
                if (fwrite($f, $body) !== strlen($body) || ! fflush($f) || ! fsync($f)) {
                    return 'Unknown';
                }
            } finally {
                fclose($f);
            }
            if (! @rename($tmp, $dir.'/'.$reference.'.txt')) {
                @unlink($tmp);

                return 'Unknown';
            }

            return 'DevelopmentSaved';
        }
        $smtp = $config['smtp'];
        if ($config['mode'] !== 'Smtp' || ! $smtp['host'] || preg_match('/\s/', $smtp['host']) || ! in_array($smtp['tls'], ['StartTls', 'SslOnConnect'], true) || ! $smtp['username'] || ! $smtp['password'] || ! InquiryInput::email($smtp['from'] ?? '') || ! InquiryInput::email($smtp['recipient'] ?? '') || ! function_exists('proc_open') || ! function_exists('proc_terminate') || ! function_exists('proc_get_status') || ! function_exists('proc_close')) {
            return 'Unavailable';
        }
        // A supervised CLI child gives a total wall-clock bound, including DNS, TLS,
        // SMTP commands and a server that dribbles replies. Secrets travel only on stdin.
        $binary = $config['php_binary'] ?? dirname(PHP_BINARY).DIRECTORY_SEPARATOR.(PHP_OS_FAMILY === 'Windows' ? 'php.exe' : 'php');
        if (! is_file($binary) || ! is_executable($binary)) {
            return 'Unavailable';
        }
        // Windows anonymous proc_open pipes cannot be made nonblocking. Native
        // private, auto-deleting temporary descriptors avoid blocking either the
        // input write or outcome poll. They contain no web-addressable file.
        $inputFile = tmpfile();
        $outputFile = tmpfile();
        if (! $inputFile || ! $outputFile) {
            if (is_resource($inputFile)) {
                fclose($inputFile);
            }
            if (is_resource($outputFile)) {
                fclose($outputFile);
            }

            return 'Unavailable';
        }
        $process = null;
        $started = microtime(true);
        try {
            foreach ([$inputFile, $outputFile] as $file) {
                $path = realpath(stream_get_meta_data($file)['uri']);
                $public = realpath(public_path());
                $root = ! empty($_SERVER['DOCUMENT_ROOT']) ? realpath($_SERVER['DOCUMENT_ROOT']) : false;
                if (! $path || ($public && str_starts_with(strtolower($path), strtolower($public).DIRECTORY_SEPARATOR)) || ($root && str_starts_with(strtolower($path), strtolower($root).DIRECTORY_SEPARATOR))) {
                    return 'Unavailable';
                }
                if (PHP_OS_FAMILY !== 'Windows' && (fileperms($path) & 0077)) {
                    return 'Unavailable';
                }
            }
            $payload = json_encode(['smtp' => $smtp, 'input' => $input, 'reference' => $reference, 'timeout' => $config['timeout_ms']], JSON_THROW_ON_ERROR);
            if (fwrite($inputFile, $payload) !== strlen($payload) || ! fflush($inputFile) || ! rewind($inputFile)) {
                return 'Unavailable';
            }
            $pipes = [];
            $process = @proc_open([$binary, '-d', 'display_errors=0', '-d', 'log_errors=0', base_path('scripts/inquiry-mail.php')], [$inputFile, $outputFile, ['file', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null', 'a']], $pipes, null, null, ['bypass_shell' => true]);
            if (! is_resource($process)) {
                return 'Unavailable';
            }
            do {
                rewind($outputFile);
                $output = stream_get_contents($outputFile, 64);
                $status = proc_get_status($process);
                if (in_array($output, ['SmtpAccepted', 'Rejected', 'Unavailable', 'Unknown'], true)) {
                    // Final DATA acceptance is authoritative even if later socket
                    // cleanup stalls. Finish the one-shot child within our budget.
                    if ($status['running']) {
                        proc_terminate($process, 9);
                    }

                    return $output;
                }
                if (! $status['running']) {
                    break;
                }
                if ((microtime(true) - $started) * 1000 >= $config['timeout_ms']) {
                    proc_terminate($process, 9);

                    return 'Unknown';
                }
                usleep(10000);
            } while (true);
            rewind($outputFile);
            $output = stream_get_contents($outputFile, 64);

            return in_array($output, ['SmtpAccepted', 'Rejected', 'Unavailable', 'Unknown'], true) ? $output : 'Unknown';
        } finally {
            if (is_resource($process)) {
                proc_close($process);
            }
            fclose($inputFile);
            fclose($outputFile);
        }
    }
}
