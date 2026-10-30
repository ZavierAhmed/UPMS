<?php

// Prepare a disabled runtime profile. cPanel can grant only SELECT; provider applies scoped SQL separately.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
require __DIR__.'/support.php';
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
$backend = $stage.'/php84-release/private/backend';
require $backend.'/vendor/autoload.php';
try {
    $e = json_decode(file_get_contents($stage.'/runtime/recovery84-evidence.json'), true, 32, JSON_THROW_ON_ERROR);
    if (($e['verified'] ?? false) !== true || ($e['sourceSchema'] ?? '') !== 'upms_v1' || !hash_equals($e['backupSha256'], hash_file('sha256', $e['backupFile']))) {
        throw new RuntimeException('GENUINE_NEW_RECOVERY_REQUIRED');
    }
    $c = json_decode(file_get_contents($stage.'/runtime/accounts84.json'), true, 32, JSON_THROW_ON_ERROR);
    $user = 'upms_runtime84';
    $password = bin2hex(random_bytes(32));
    $pw = $stage.'/runtime/runtime84-password';
    if (file_exists($pw) || in_array($user, array_column(api('Mysql', 'list_users', []), 'user'), true)) {
        throw new RuntimeException('EXISTING_RUNTIME_IDENTITY_REVIEW_REQUIRED');
    }
    $f = fopen($pw, 'xb');
    chmod($pw, 0600);
    fwrite($f, $password);
    fflush($f);
    fsync($f);
    fclose($f);
    api('Mysql', 'create_user', ['name' => $user,'password' => $password]);
    api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => 'upms_v1','privileges' => 'SELECT']);
    unset($c['readOnlyMetadataApproved'],$c['effectivePrivilegesReviewed']);
    $c['enabled'] = false;
    $c['mode'] = 'approved-production-runtime';
    $c['hostingVerified'] = true;
    $c['backupRestoreVerified'] = true;
    $c['user'] = $user;
    $c['account'] = $user.'@localhost';
    $c['passwordFile'] = $pw;
    $c['operators'] = ['admin' => '1','haris' => '2'];
    $c['productionRecoveryEvidenceFile'] = $stage.'/runtime/recovery84-evidence.json';
    privateJson($stage.'/runtime/runtime84.DISABLED.json', $c);
    $check = $c;
    $check['enabled'] = true;
    App\Upms\ProductionProfile::validate($check);
    $check['password'] = $password;
    $pdo = App\Upms\ProductionConnection::connect($check);
    $grants = $pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN);
    privateJson($stage.'/runtime/runtime84-initial-grants.json', ['account' => $c['account'],'grants' => $grants,'productionEnabled' => false]);
    echo json_encode(['prepared' => true,'account' => $c['account'],'grants' => 'SELECT_ONLY_PENDING_PROVIDER_SCOPED_GRANTS','runtimeEnabled' => false,'productionRecoveryVerified' => true,'credentialsPrinted' => false])."\n";
} catch (Throwable $e) {
    echo json_encode(['prepared' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'RUNTIME_PREPARATION_REVIEW_REQUIRED','credentialsPrinted' => false])."\n";
    exit(1);
}
