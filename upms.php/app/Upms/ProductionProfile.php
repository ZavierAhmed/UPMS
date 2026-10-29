<?php

declare(strict_types=1);

namespace App\Upms;

/** Explicit private production configuration, independent of synthetic DB variables. */
final class ProductionProfile
{
    public static function load(string $path): array
    {
        $real = realpath($path);
        if (!$real || is_link($path) || !is_file($real) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($real) & 0077))) {
            throw new ApiError(503, 'PRODUCTION_PROFILE_REJECTED');
        }
        try {
            $c = json_decode(file_get_contents($real), true, 32, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw new ApiError(503, 'PRODUCTION_PROFILE_REJECTED');
        }
        self::validate($c);
        $private = realpath($c['privateRoot']);
        if (!$private || is_link($c['privateRoot']) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($private) & 0077))) {
            throw new ApiError(503, 'PRODUCTION_PRIVATE_ROOT_REJECTED');
        }
        foreach ([$real, $private, $c['passwordFile'], $c['caFile']] as $candidate) {
            $file = realpath($candidate);
            if (!$file || is_link($candidate) || ($file !== $private && !str_starts_with($file, $private.DIRECTORY_SEPARATOR)) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($file) & 0077))) {
                throw new ApiError(503, 'PRODUCTION_PRIVATE_PATH_REJECTED');
            }
            foreach ([$c['publicRoot'], $c['managementRoot']] as $webRoot) {
                $web = realpath($webRoot);
                if (!$web || $file === $web || str_starts_with($file, $web.DIRECTORY_SEPARATOR)) {
                    throw new ApiError(503, 'PRODUCTION_WEB_PATH_REJECTED');
                }
            }
        }
        $c['password'] = rtrim(file_get_contents($c['passwordFile']), "\r\n");
        if ($c['password'] === '') {
            throw new ApiError(503, 'PRODUCTION_PASSWORD_REQUIRED');
        }
        return $c;
    }

    public static function validate(mixed $c): void
    {
        if (!is_array($c) || ($c['enabled'] ?? false) !== true || ($c['hostingVerified'] ?? false) !== true || ($c['backupRestoreVerified'] ?? false) !== true || ($c['mode'] ?? '') !== 'approved-production-runtime') {
            throw new ApiError(503, 'PRODUCTION_PROFILE_DISABLED');
        }
        foreach (['privateRoot', 'publicRoot', 'managementRoot', 'schema', 'host', 'user', 'account', 'passwordFile', 'caFile', 'serverVersion', 'serverId', 'origin', 'reference'] as $key) {
            if (!is_string($c[$key] ?? null) || $c[$key] === '') {
                throw new ApiError(503, 'PRODUCTION_PROFILE_INCOMPLETE');
            }
        }
        if (!preg_match('/^[a-zA-Z0-9_]+$/D', $c['schema']) || str_starts_with($c['schema'], 'upms_test_')
            || !preg_match('/^(?:[a-zA-Z0-9][a-zA-Z0-9-]*\.)+[a-zA-Z0-9-]+$/D', $c['host']) || filter_var($c['host'], FILTER_VALIDATE_IP)
            || !is_int($c['port'] ?? null) || $c['port'] < 1 || $c['port'] > 65535
            || !preg_match('/^10\.11\.\d+-MariaDB/', $c['serverVersion']) || !ctype_digit($c['serverId'])
            || $c['origin'] !== 'https://app.unique-plastic.com' || !preg_match('/^[a-zA-Z0-9_-]{12,64}$/D', $c['reference'])
            || !is_array($c['operators'] ?? null)) {
            throw new ApiError(503, 'PRODUCTION_TARGET_REJECTED');
        }
        // Validate exact designated names/IDs before any connection attempt.
        OperatorPolicy::permits(['username' => 'admin', 'id' => $c['operators']['admin'] ?? ''], ['operator_id' => $c['operators']['admin'] ?? null], ['schema' => $c['schema'], 'users' => $c['operators']], $c['schema']);
    }
}
