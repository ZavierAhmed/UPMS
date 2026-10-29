<?php
declare(strict_types=1);
namespace { if (PHP_SAPI!=="cli") { http_response_code(404); exit; } }
namespace App\Upms {




final class ApiError extends \RuntimeException
{
    public function __construct(public readonly int $status, public readonly string $apiCode, public readonly ?array $fieldErrors = null, public readonly ?string $publicMessage = null, public readonly bool $entry = true, public readonly ?array $details = null)
    {
        parent::__construct($apiCode);
    }
}

}
namespace App\Upms {




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

}
namespace App\Upms {




final class OperatorPolicy
{
    public static function permits(array $user, array $control, mixed $policy, string $schema): bool
    {
        if ($policy === null || $policy === '') {
            return (string) ($control['operator_id'] ?? '') === $user['id'];
        }
        if (is_string($policy)) {
            try {
                $policy = json_decode($policy, true, 16, JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                throw new ApiError(503, 'V1_OPERATOR_POLICY_REJECTED');
            }
        }
        $users = is_array($policy) ? ($policy['users'] ?? null) : null;
        $keys = is_array($policy) ? array_keys($policy) : [];
        sort($keys);
        $names = is_array($users) ? array_keys($users) : [];
        sort($names);
        if ($keys !== ['schema', 'users'] || ($policy['schema'] ?? null) !== $schema || $names !== ['admin', 'haris']
            || !is_string($users['admin']) || !is_string($users['haris'])
            || !preg_match('/^[1-9][0-9]*$/D', $users['admin']) || !preg_match('/^[1-9][0-9]*$/D', $users['haris'])
            || $users['admin'] === $users['haris'] || !in_array((string) ($control['operator_id'] ?? ''), $users, true)) {
            throw new ApiError(503, 'V1_OPERATOR_POLICY_REJECTED');
        }
        return isset($users[$user['username']]) && $users[$user['username']] === $user['id'];
    }
}

}
namespace App\Upms {




use PDO;

/** No plaintext TCP mode and no host/port fallback for explicitly reviewed local sockets. */
final class ProductionConnection
{
    public static function transport(array $c): string
    {
        $mode = $c['transport'] ?? 'tls';
        if ($mode === 'tls') {
            if (!is_string($c['host'] ?? null) || filter_var($c['host'], FILTER_VALIDATE_IP) || !preg_match('/^(?:[a-zA-Z0-9][a-zA-Z0-9-]*\.)+[a-zA-Z0-9-]+$/D', $c['host']) || !is_int($c['port'] ?? null) || $c['port'] < 1 || $c['port'] > 65535 || !is_string($c['caFile'] ?? null) || $c['caFile'] === '' || isset($c['socket'])) {
                throw new ApiError(503, 'VERIFIED_TLS_TARGET_REQUIRED');
            }
            return $mode;
        }
        if ($mode !== 'unix_socket' || isset($c['host']) || isset($c['port']) || isset($c['caFile']) || ($c['localSocketVerified'] ?? false) !== true || !is_string($c['socket'] ?? null) || !preg_match('~^/[a-zA-Z0-9_./-]+$~D', $c['socket']) || str_contains($c['socket'], '/../') || !ctype_digit((string)($c['socketOwnerUid'] ?? '')) || !is_string($c['serverHostname'] ?? null) || $c['serverHostname'] === '') {
            throw new ApiError(503, 'VERIFIED_LOCAL_SOCKET_REQUIRED');
        }
        return $mode;
    }
    public static function socketProperties(array $c): array
    {
        self::transport($c);
        if (PHP_OS_FAMILY !== 'Linux') {
            throw new ApiError(503, 'LOCAL_SOCKET_REQUIRES_LINUX');
        }
        $path = $c['socket'];
        clearstatcache(true, $path);
        $stat = @lstat($path);
        if (!$stat || is_link($path) || realpath($path) !== $path || filetype($path) !== 'socket' || (string)$stat['uid'] !== (string)$c['socketOwnerUid']) {
            throw new ApiError(503, 'LOCAL_SOCKET_PATH_REJECTED');
        }
        for ($parent = dirname($path);; $parent = dirname($parent)) {
            $s = @lstat($parent);
            if (!$s || is_link($parent) || !in_array((string)$s['uid'], ['0',(string)$c['socketOwnerUid']], true) || ($s['mode'] & 0022)) {
                throw new ApiError(503, 'LOCAL_SOCKET_PARENT_REJECTED');
            }
            if ($parent === '/') {
                break;
            }
        }
        if (gethostname() !== $c['serverHostname']) {
            throw new ApiError(503, 'LOCAL_SERVER_HOSTNAME_REJECTED');
        }
        return ['device' => $stat['dev'],'inode' => $stat['ino'],'uid' => $stat['uid']];
    }
    public static function connect(array $c, ?\Closure $progress = null): PDO
    {
        $progress?->__invoke('transport_validation');
        $mode = self::transport($c);
        $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false,PDO::ATTR_STRINGIFY_FETCHES => false,PDO::ATTR_TIMEOUT => 3,PDO::MYSQL_ATTR_MULTI_STATEMENTS => false];
        if ($mode === 'tls') {
            $dsn = 'mysql:host='.$c['host'].';port='.$c['port'];
            $options[PDO::MYSQL_ATTR_SSL_CA] = $c['caFile'];
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        } else {
            $progress?->__invoke('socket_validation');
            $before = self::socketProperties($c);
            $dsn = 'mysql:unix_socket='.$c['socket'];
        }
        $progress?->__invoke('pdo_connect');
        $pdo = new PDO($dsn.';dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], $options);
        $progress?->__invoke('identity_query');
        $target = $pdo->query('SELECT VERSION() version,DATABASE() schema_name,CURRENT_USER() account,@@server_id server_id,@@hostname server_hostname,@@socket socket_path,@@character_set_database charset_name')->fetch(PDO::FETCH_ASSOC);
        $progress?->__invoke('identity_validation');
        if ($target['version'] !== $c['serverVersion'] || $target['schema_name'] !== $c['schema'] || $target['account'] !== $c['account'] || (string)$target['server_id'] !== $c['serverId']) {
            throw new ApiError(503, 'PRODUCTION_IDENTITY_REJECTED', details: ['checks' => ['version' => $target['version'] === $c['serverVersion'],'schema' => $target['schema_name'] === $c['schema'],'account' => $target['account'] === $c['account'],'serverId' => (string)$target['server_id'] === $c['serverId']]]);
        }
        if ($mode === 'tls') {
            $ssl = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_ASSOC);
            if (empty($ssl['Value'])) {
                throw new ApiError(503, 'PRODUCTION_TLS_REQUIRED');
            }
        } else {
            $progress?->__invoke('pdo_transport');
            if (self::socketProperties($c) !== $before || $target['socket_path'] !== $c['socket'] || $target['server_hostname'] !== $c['serverHostname'] || !preg_match('/via UNIX socket/i', (string)$pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS))) {
                throw new ApiError(503, 'LOCAL_SOCKET_TRANSPORT_REJECTED');
            }
        }
        $progress?->__invoke('session_configuration');
        $pdo->exec("SET SESSION time_zone = '+00:00', innodb_lock_wait_timeout=3, sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
        $pdo->exec('SET SESSION max_statement_time=5');
        return $pdo;
    }
}

}
namespace App\Upms {




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
        $approved = is_array($c) && ($readOnly ? ($c['readOnlyMetadataApproved'] ?? false) === true : (($c['hostingVerified'] ?? false) === true && ($c['backupRestoreVerified'] ?? false) === true));
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

}
namespace {

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$o = getopt('', ['profile:','library:','diagnose']);
$stage = 'library_loading';
try {
    // Standalone reviewed library embedded; no application bootstrap.
    $stage = 'pdo_capabilities';
    if (!extension_loaded('pdo_mysql')) {
        throw new App\Upms\ApiError(503, 'PDO_MYSQL_EXTENSION_UNAVAILABLE');
    }
    $stage = 'profile_loading';
    if (!is_string($o['profile'] ?? null)) {
        throw new App\Upms\ApiError(503, 'EXPLICIT_PRIVATE_METADATA_PROFILE_REQUIRED');
    }
    $c = App\Upms\ProductionProfile::load($o['profile'], 'read-only-transport-verification');
    $tool = realpath(__FILE__);
    $private = realpath($c['privateRoot']);
    if (!$tool || !$private || !str_starts_with($tool, $private.DIRECTORY_SEPARATOR)) {
        throw new App\Upms\ApiError(503, 'PRODUCTION_DIAGNOSTIC_PATH_REJECTED');
    }
    $pdo = App\Upms\ProductionConnection::connect($c, static function (string $s) use (&$stage) {
        $stage = $s;
    });
    $stage = 'read_only_transaction';
    $pdo->exec('START TRANSACTION READ ONLY');
    $identity = $pdo->query('SELECT DATABASE() schema_name,CURRENT_USER() account,VERSION() version,@@server_id server_id,@@hostname server_hostname,@@socket advertised_socket')->fetch(PDO::FETCH_ASSOC);
    $ssl = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_ASSOC);
    $pdo->rollBack();
    $stage = 'pdo_transport';
    $driver = $pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS);
    echo json_encode(['passed' => true,'scope' => 'metadata-only','transport' => $c['transport'] ?? 'tls','driverTransport' => $driver,'tlsCipherPresent' => !empty($ssl['Value']),'identity' => $identity,'businessRowsRead' => 0,'recordsChanged' => 0,'productionActivationApproved' => false], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    $failure = class_exists(App\Upms\DiagnosticFailure::class) ? App\Upms\DiagnosticFailure::describe($e, $stage) : ['code' => 'DIAGNOSTIC_LIBRARY_UNAVAILABLE','category' => 'diagnostic_installation','stage' => $stage];
    $r = ['passed' => false,'code' => $failure['code'],'category' => $failure['category'],'stage' => $failure['stage'],'recordsChanged' => 0,'credentialsPrinted' => false];
    if (isset($o['diagnose'])) {
        $r['diagnosis'] = $failure;
    }echo json_encode($r, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
    exit(1);
}

}
