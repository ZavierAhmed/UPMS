<?php

declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
final class UpmsStaging
{
    public static ?string $logDirectory = null;
    public static function layout(array $c): array
    {
        if (($c['destinationReviewed'] ?? false) !== true || ($c['runtimeEnabled'] ?? true) !== false || ($c['accountQuotaReviewed'] ?? false) !== true || ($c['schema'] ?? '') !== 'upms_v1') {
            throw new RuntimeException('REVIEWED_DISABLED_STAGING_PLAN_REQUIRED');
        }
        $paths = [];
        foreach (['home','publicRoot','managementRoot','diagnosticRoot','stagingRoot'] as $key) {
            $raw = $c[$key] ?? '';
            $real = is_string($raw) ? realpath($raw) : false;
            if (!$real || $real !== $raw || is_link($raw) || !is_dir($real)) {
                throw new RuntimeException('VERIFIED_ABSOLUTE_DIRECTORIES_REQUIRED');
            }
            $paths[$key] = $real;
        }
        if (dirname($paths['stagingRoot']) !== $paths['home'] || (fileperms($paths['stagingRoot']) & 0077) || (fileperms($paths['home']) & 0022)) {
            throw new RuntimeException('PRIVATE_STAGING_PARENT_OR_MODE_REJECTED');
        }
        if (fileowner($paths['stagingRoot']) !== fileowner($paths['home'])) {
            throw new RuntimeException('STAGING_HOME_OWNER_MISMATCH');
        }
        if (function_exists('posix_geteuid') && fileowner($paths['stagingRoot']) !== posix_geteuid()) {
            throw new RuntimeException('STAGING_OWNER_REJECTED');
        }
        foreach (['publicRoot','managementRoot','diagnosticRoot'] as $key) {
            if (self::within($paths['stagingRoot'], $paths[$key]) || self::within($paths[$key], $paths['stagingRoot'])) {
                throw new RuntimeException('STAGING_ISOLATION_REJECTED');
            }
        }
        return $paths;
    }
    public static function within(string $path, string $root): bool
    {
        return $path === $root || str_starts_with($path, $root.'/');
    }
    public static function readOnlyGrants(array $rows, string $schema): void
    {
        $selected = false;
        foreach ($rows as $row) {
            $grant = is_array($row) ? (string)array_values($row)[0] : (string)$row;
            if (stripos($grant, 'WITH GRANT OPTION') !== false || !preg_match('/^GRANT (.+?) ON (.+?) TO /i', $grant, $m)) {
                throw new RuntimeException('SELECT_ONLY_ACCOUNT_REQUIRED');
            }
            if ($m[1] === 'USAGE' && $m[2] === '*.*') {
                continue;
            }
            if ($m[1] !== 'SELECT' || $m[2] !== '`'.str_replace('_', '\\_', $schema).'`.*') {
                throw new RuntimeException('SELECT_ONLY_EXACT_SCHEMA_REQUIRED');
            }
            $selected = true;
        }
        if (!$selected) {
            throw new RuntimeException('SELECT_ON_UPMS_V1_REQUIRED');
        }
    }
    public static function digestTree(string $root, array $manifest): int
    {
        $expected = [];
        foreach ($manifest['files'] ?? [] as $row) {
            $name = $row['path'] ?? '';
            if (!is_string($name) || !preg_match('~^[a-zA-Z0-9_./@+-]+$~D', $name) || preg_match('~(^|/)\.\.(/|$)~', $name) || str_starts_with($name, '/') || isset($expected[$name])) {
                throw new RuntimeException('BUNDLE_PATH_REJECTED');
            }
            $path = realpath($root.'/'.$name);
            if (!$path || !self::within($path, $root) || is_link($root.'/'.$name) || !is_file($path) || filesize($path) !== $row['bytes'] || !hash_equals($row['sha256'], hash_file('sha256', $path))) {
                throw new RuntimeException('BUNDLE_CHECKSUM_REJECTED');
            }
            $expected[$name] = true;
        }
        $actual = [];
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $f) {
            if ($f->isLink()) {
                throw new RuntimeException('BUNDLE_SYMLINK_REJECTED');
            }
            if ($f->isFile()) {
                $name = substr($f->getPathname(), strlen($root) + 1);
                if ($name !== 'STAGING-MANIFEST.json') {
                    $actual[$name] = true;
                }
            }
        }
        ksort($actual);
        ksort($expected);
        if (!$expected || $expected !== $actual) {
            throw new RuntimeException('BUNDLE_FILE_SET_REJECTED');
        }
        return count($expected);
    }
    public static function child(array $command): array
    {
        $p = proc_open($command, [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes, null, null, ['bypass_shell' => true]);
        if (!is_resource($p)) {
            throw new RuntimeException('PRIVATE_CHILD_UNAVAILABLE');
        }fclose($pipes[0]);
        $out = stream_get_contents($pipes[1]);
        $err = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($p);
        if ($exit !== 0) {
            if (self::$logDirectory) {
                $f = fopen(self::$logDirectory.'/failed-check-'.bin2hex(random_bytes(8)).'.log', 'xb');
                if ($f) {
                    chmod(stream_get_meta_data($f)['uri'], 0600);
                    fwrite($f, $out."\n".$err);
                    fflush($f);
                    fclose($f);
                }
            }throw new RuntimeException('PRIVATE_CHECK_FAILED_REVIEW_RESTRICTED_LOG');
        }
        return json_decode(trim($out), true, 512, JSON_THROW_ON_ERROR);
    }
}
