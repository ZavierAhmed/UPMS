<?php

declare(strict_types=1);

// Private CLI only. No environment-database fallback and no production defaults.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../vendor/autoload.php';
try {
    if ($argc !== 3 || $argv[1] !== '--approved-production-profile') {
        throw new RuntimeException('EXPLICIT_PRODUCTION_MODE_REQUIRED');
    }
    $path = realpath($argv[2]);
    if (!$path || is_link($argv[2]) || (PHP_OS_FAMILY !== 'Windows' && (fileperms($path) & 0077))) {
        throw new RuntimeException('PRIVATE_PROFILE_REQUIRED');
    }
    $c = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
    if (($c['enabled'] ?? false) !== true || ($c['hostingVerified'] ?? false) !== true || ($c['backupRestoreVerified'] ?? false) !== true || ($c['mode'] ?? '') !== 'one-time-production-maintenance') {
        throw new RuntimeException('PROVISIONING_DISABLED');
    }
    foreach (['privateRoot','publicRoot','managementRoot','approvalFile','credentialsFile','schema','host','user','account','passwordFile','caFile','serverVersion','serverId','reference'] as $key) {
        if (!is_string($c[$key] ?? null) || $c[$key] === '') {
            throw new RuntimeException('PROFILE_INCOMPLETE');
        }
    }
    $private = realpath($c['privateRoot']);
    $port = $c['port'] ?? 3306;
    if (!ctype_digit((string) $port) || (int) $port < 1 || (int) $port > 65535) {
        throw new RuntimeException('PORT_REJECTED');
    }
    if (!$private) {
        throw new RuntimeException('PRIVATE_ROOT_REQUIRED');
    }
    foreach ([$path, $private, $c['approvalFile'], $c['credentialsFile'], $c['credentialsFile'].'.handoff', $c['passwordFile'], $c['caFile']] as $candidate) {
        $absolute = realpath($candidate) ?: (realpath(dirname($candidate)) ? realpath(dirname($candidate)).DIRECTORY_SEPARATOR.basename($candidate) : false);
        if (!$absolute || is_link($candidate)) {
            throw new RuntimeException('PRIVATE_PATH_REJECTED');
        }
        if (file_exists($absolute) && PHP_OS_FAMILY !== 'Windows' && (fileperms($absolute) & 0077)) {
            throw new RuntimeException('PRIVATE_PERMISSIONS_REQUIRED');
        }
        foreach ([$c['publicRoot'],$c['managementRoot']] as $root) {
            $web = realpath($root);
            if (!$web || $absolute === $web || str_starts_with($absolute, $web.DIRECTORY_SEPARATOR)) {
                throw new RuntimeException('WEB_PATH_REJECTED');
            }
        }
        if ($absolute !== $private && !str_starts_with($absolute, $private.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('PRIVATE_PATH_REJECTED');
        }
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/D', $c['schema']) || str_starts_with($c['schema'], 'upms_test_') || !preg_match('/^10\.11\.\d+-MariaDB/', $c['serverVersion']) || !ctype_digit((string)$c['serverId']) || filter_var($c['host'], FILTER_VALIDATE_IP) || !preg_match('/^[a-zA-Z0-9.-]+$/D', $c['host'])) {
        throw new RuntimeException('PINNED_TARGET_REQUIRED');
    }
    $approval = json_decode(file_get_contents($c['approvalFile']), true, 16, JSON_THROW_ON_ERROR);
    if (($approval['status'] ?? '') !== 'APPROVED_FINAL_CUTOVER' || ($approval['reference'] ?? '') !== $c['reference'] || ($approval['schema'] ?? '') !== $c['schema'] || ($approval['serverId'] ?? '') !== $c['serverId']) {
        throw new RuntimeException('EXPLICIT_CUTOVER_APPROVAL_REQUIRED');
    }
    // Prepared credentials survive a crash; they are never regenerated on a retry.
    if (is_file($c['credentialsFile'])) {
        $credentials = json_decode(file_get_contents($c['credentialsFile']), true, 16, JSON_THROW_ON_ERROR);
        if (($credentials['reference'] ?? '') !== $c['reference']) {
            throw new RuntimeException('CREDENTIAL_RECEIPT_CONFLICT');
        }
        foreach (['admin', 'haris'] as $name) {
            if (!is_string($credentials[$name] ?? null) || strlen($credentials[$name]) < 24 || strlen($credentials[$name]) > 128) {
                throw new RuntimeException('CREDENTIAL_RECEIPT_CONFLICT');
            }
        }
    } else {
        $credentials = ['reference' => $c['reference'],'admin' => rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='),'haris' => rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=')];
        $stream = fopen($c['credentialsFile'], 'xb');
        if (!$stream) {
            throw new RuntimeException('PRIVATE_HANDOFF_REQUIRED');
        } chmod($c['credentialsFile'], 0600);
        fwrite($stream, json_encode($credentials, JSON_THROW_ON_ERROR));
        fflush($stream);
        if (function_exists('fsync')) {
            fsync($stream);
        } fclose($stream);
    }
    $password = rtrim(file_get_contents($c['passwordFile']), "\r\n");
    $pdo = new PDO('mysql:host='.$c['host'].';port='.($c['port'] ?? 3306).';dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false,PDO::MYSQL_ATTR_MULTI_STATEMENTS => false,PDO::MYSQL_ATTR_SSL_CA => $c['caFile'],PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true,PDO::ATTR_TIMEOUT => 5]);
    $identity = $pdo->query('SELECT VERSION() version,DATABASE() schema_name,CURRENT_USER() account,@@server_id server_id')->fetch(PDO::FETCH_ASSOC);
    $ssl = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_ASSOC);
    if ($identity['version'] !== $c['serverVersion'] || $identity['schema_name'] !== $c['schema'] || $identity['account'] !== ($c['account'] ?? null) || (string)$identity['server_id'] !== $c['serverId'] || empty($ssl['Value'])) {
        throw new RuntimeException('TARGET_IDENTITY_REJECTED');
    }
    $result = App\Upms\AdminProvisioning::apply($pdo, $c['reference'], $credentials);
    // Generated candidates are only valid for accounts created by this receipt.
    // Existing account hashes are preserved; their generated candidates must never be used.
    $handoff = ['reference' => $c['reference'], 'users' => $result['users'], 'created' => $result['created'], 'existingAccountsKeepCurrentPassword' => array_values(array_diff(['admin', 'haris'], $result['created']))];
    foreach ($result['created'] as $name) {
        $handoff[$name] = $credentials[$name];
    }
    $handoffPath = $c['credentialsFile'].'.handoff';
    if (file_exists($handoffPath)) {
        if (json_decode(file_get_contents($handoffPath), true, 16, JSON_THROW_ON_ERROR) !== $handoff) {
            throw new RuntimeException('PRIVATE_HANDOFF_CONFLICT_RECEIPT_COMMITTED');
        }
    } else {
        $stream = fopen($handoffPath, 'xb');
        if (!$stream) {
            throw new RuntimeException('PRIVATE_HANDOFF_REQUIRED');
        }
        chmod($handoffPath, 0600);
        fwrite($stream, json_encode($handoff, JSON_THROW_ON_ERROR));
        fflush($stream);
        if (function_exists('fsync')) {
            fsync($stream);
        }
        fclose($stream);
    }
    $c['enabled'] = false;
    $temp = $path.'.disabled-pending';
    if (file_exists($temp)) {
        throw new RuntimeException('DISABLE_MAINTENANCE_MANUALLY_RECEIPT_COMMITTED');
    }$f = fopen($temp, 'xb');
    chmod($temp, 0600);
    fwrite($f, json_encode($c, JSON_THROW_ON_ERROR));
    fflush($f);
    if (function_exists('fsync')) {
        fsync($f);
    }fclose($f);
    if (!rename($temp, $path)) {
        throw new RuntimeException('DISABLE_MAINTENANCE_MANUALLY_RECEIPT_COMMITTED');
    }
    echo json_encode(['completed' => true,'users' => $result['users'],'changed' => $result['changed'],'credentialsPrinted' => false,'maintenanceDisabled' => true]).PHP_EOL;
} catch (Throwable $error) {
    $code = preg_match('/^[A-Z_]+$/D', $error->getMessage()) ? $error->getMessage() : 'PROVISIONING_FAILED_PRIVATE_REVIEW_REQUIRED';
    fwrite(STDERR, json_encode(['completed' => false,'code' => $code,'credentialsPrinted' => false]).PHP_EOL);
    exit(1);
}
