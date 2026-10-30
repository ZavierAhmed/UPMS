<?php

declare(strict_types=1);

namespace App\Upms;

/** Explicit private production configuration, independent of synthetic DB variables. */
final class ProductionProfile
{
    public static function load(string $path, string $mode = 'approved-production-runtime'): array
    {
        $real = realpath($path);
        if (!$real || is_link($path) || !is_file($real) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($real) & 0077))) {
            throw new ApiError(503, 'PRODUCTION_PROFILE_REJECTED');
        }
        try {
            $c = json_decode(@file_get_contents($real), true, 32, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw new ApiError(503, 'PRODUCTION_PROFILE_REJECTED');
        }
        self::validate($c, $mode);
        $private = realpath($c['privateRoot']);
        if (!$private || is_link($c['privateRoot']) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($private) & 0077))) {
            throw new ApiError(503, 'PRODUCTION_PRIVATE_ROOT_REJECTED');
        }
        foreach (array_filter([$real, $private, $c['passwordFile'], $c['caFile'] ?? null, $c['approvalFile'] ?? null, $c['credentialsFile'] ?? null, isset($c['credentialsFile']) ? $c['credentialsFile'].'.handoff' : null, $c['receiptFile'] ?? null]) as $candidate) {
            $file = realpath($candidate);
            if (!$file && in_array($candidate, [$c['credentialsFile'] ?? null, isset($c['credentialsFile']) ? $c['credentialsFile'].'.handoff' : null, $c['receiptFile'] ?? null], true) && realpath(dirname($candidate))) {
                $file = realpath(dirname($candidate)).DIRECTORY_SEPARATOR.basename($candidate);
            }
            if (!$file || is_link($candidate) || ($file !== $private && !str_starts_with($file, $private.DIRECTORY_SEPARATOR)) || (PHP_OS_FAMILY !== 'Windows' && (file_exists($file) && (fileperms($file) & 0077)))) {
                throw new ApiError(503, 'PRODUCTION_PRIVATE_PATH_REJECTED');
            }
            foreach ([$c['publicRoot'], $c['managementRoot']] as $webRoot) {
                $web = realpath($webRoot);
                if (!$web || $file === $web || str_starts_with($file, $web.DIRECTORY_SEPARATOR)) {
                    throw new ApiError(503, 'PRODUCTION_WEB_PATH_REJECTED');
                }
            }
        }
        $secret = @file_get_contents($c['passwordFile']);
        if ($secret === false) {
            throw new ApiError(503, 'PRODUCTION_PASSWORD_FILE_UNREADABLE');
        }
        if (str_contains($secret, "\0") || str_starts_with($secret, "\xEF\xBB\xBF") || str_starts_with($secret, "\xFF\xFE") || str_starts_with($secret, "\xFE\xFF")) {
            throw new ApiError(503, 'PRODUCTION_PASSWORD_ENCODING_REJECTED');
        }
        $c['password'] = rtrim($secret, "\r\n");
        if ($c['password'] === '') {
            throw new ApiError(503, 'PRODUCTION_PASSWORD_REQUIRED');
        }
        return $c;
    }

    public static function validate(mixed $c, string $mode = 'approved-production-runtime'): void
    {
        $readOnly = $mode === 'read-only-transport-verification';
        $approved = is_array($c) && ($readOnly ? ($c['readOnlyMetadataApproved'] ?? false) === true : (($c['hostingVerified'] ?? false) === true && (($c['backupRestoreVerified'] ?? false) === true || LegacyRecoveryWaiver::valid($c))));
        if (!is_array($c) || !$approved || ($c['enabled'] ?? false) !== true || ($c['mode'] ?? '') !== $mode || !in_array($mode, ['approved-production-runtime','one-time-production-maintenance','one-time-clean-initialization','reviewed-clean-activation','read-only-transport-verification','one-time-sql-import-finalization'], true)) {
            throw new ApiError(503, 'PRODUCTION_PROFILE_DISABLED');
        }
        foreach (['privateRoot', 'publicRoot', 'managementRoot', 'schema', 'user', 'account', 'passwordFile', 'serverVersion', 'serverId', 'origin', 'reference'] as $key) {
            if (!is_string($c[$key] ?? null) || $c[$key] === '') {
                throw new ApiError(503, 'PRODUCTION_PROFILE_INCOMPLETE');
            }
        }
        if (!preg_match('/^[a-zA-Z0-9_]+$/D', $c['schema']) || str_starts_with($c['schema'], 'upms_test_')

            || !preg_match('/^10\.11\.\d+-MariaDB/', $c['serverVersion']) || !ctype_digit($c['serverId'])
            || $c['origin'] !== 'https://app.unique-plastic.com' || !preg_match('/^[a-zA-Z0-9_-]{12,64}$/D', $c['reference'])
            || ($mode === 'approved-production-runtime' && !is_array($c['operators'] ?? null))) {
            throw new ApiError(503, 'PRODUCTION_TARGET_REJECTED');
        }
        if (substr_count($c['account'], '@') !== 1 || explode('@', $c['account'], 2)[0] !== $c['user'] || preg_match('/\s/', $c['account'])) {
            throw new ApiError(503, 'PRODUCTION_ACCOUNT_PIN_REJECTED');
        }
        ProductionConnection::transport($c);
        if ($mode !== 'approved-production-runtime') {
            return;
        }
        // Validate exact designated names/IDs before any connection attempt.
        OperatorPolicy::permits(['username' => 'admin', 'id' => $c['operators']['admin'] ?? ''], ['operator_id' => $c['operators']['admin'] ?? null], ['schema' => $c['schema'], 'users' => $c['operators']], $c['schema']);
    }
}
