<?php

declare(strict_types=1);

namespace App\Upms;

use PDOException;
use Throwable;

final class DiagnosticFailure
{
    public static function describe(Throwable $e, string $stage): array
    {
        $code = 'DIAGNOSTIC_INTERNAL_FAILURE';
        $category = 'internal';
        $native = null;
        $state = null;
        if ($e instanceof ApiError) {
            $code = $e->apiCode;
            $category = match(true) {
                str_contains($code, 'EXTENSION') => 'pdo_configuration',str_contains($code, 'PASSWORD') => 'secret_file',str_contains($code, 'IDENTITY') || str_contains($code, 'HOSTNAME') => 'identity_mismatch',str_contains($code, 'TLS') => 'tls_verification',str_contains($code, 'TRANSPORT') => 'socket_driver_mismatch',str_contains($code, 'SOCKET') => 'socket_filesystem',str_contains($code, 'PATH') || str_contains($code, 'ROOT') || str_contains($code, 'PERMISSION') => 'filesystem_permissions',default => 'profile_validation'
            };
        } elseif ($e instanceof PDOException) {
            $native = (int)($e->errorInfo[1] ?? 0);
            $candidate = $e->errorInfo[0] ?? $e->getCode();
            $state = is_string($candidate) && preg_match('/^[A-Z0-9]{5}$/D', $candidate) ? $candidate : null;
            $code = match($native) {
                1045 => 'PDO_AUTHENTICATION_FAILED',1044 => 'PDO_SCHEMA_ACCESS_DENIED',1049 => 'PDO_SCHEMA_NOT_FOUND',2002,2003 => 'PDO_SOCKET_CONNECT_FAILED',2026 => 'PDO_TLS_VERIFICATION_FAILED',1142,1143,1227 => 'PDO_PERMISSION_DENIED',default => $state === 'IM001' ? 'PDO_ATTRIBUTE_UNSUPPORTED' : ($stage === 'session_configuration' ? 'PDO_SESSION_CONFIGURATION_FAILED' : 'PDO_CONFIGURATION_OR_QUERY_FAILED')
            };
            $category = match($native) {
                1045 => 'authentication',1044,1142,1143,1227 => 'database_permissions',1049 => 'schema_selection',2002,2003 => 'socket_connection',2026 => 'tls_verification',default => 'pdo_configuration'
            };
        } elseif ($e instanceof \JsonException) {
            $code = 'PROFILE_JSON_INVALID';
            $category = 'profile_format';
        } elseif ($e instanceof \TypeError || $e instanceof \ValueError) {
            $code = 'DIAGNOSTIC_CONFIGURATION_TYPE_ERROR';
            $category = 'profile_or_pdo_configuration';
        } elseif ($stage === 'library_loading') {
            $code = 'DIAGNOSTIC_LIBRARY_UNAVAILABLE';
            $category = 'diagnostic_installation';
        }
        $r = ['code' => $code,'category' => $category,'stage' => $stage];
        if ($native !== null) {
            $r['nativeError'] = $native;
        }if ($state !== null) {
            $r['sqlState'] = $state;
        }
        if ($e instanceof ApiError && is_array($e->details['checks'] ?? null)) {
            foreach (['version','schema','account','serverId'] as $key) {
                if (is_bool($e->details['checks'][$key] ?? null)) {
                    $r['pinChecks'][$key] = $e->details['checks'][$key];
                }
            }
        }
        return $r;
    }
}
