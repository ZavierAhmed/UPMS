<?php

declare(strict_types=1);

namespace App\Upms;

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
