<?php

// Private CLI only. Owner-authorized PHP-8.4 finalization/provisioning preparation.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}
umask(0077);
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
$backend = $stage.'/php84-release/private/backend';
require $backend.'/vendor/autoload.php';
require __DIR__.'/support.php';
try {
    $c = App\Upms\ProductionProfile::load($stage.'/runtime/read-only.json', 'read-only-transport-verification');
    $user = 'upms_maint84';
    $passwordPath = $stage.'/runtime/maintenance84-password';
    $users = api('Mysql', 'list_users', []);
    if (in_array($user, array_column($users, 'user'), true) || file_exists($passwordPath)) {
        throw new RuntimeException('MAINTENANCE_IDENTITY_EXISTS_REVIEW_REQUIRED');
    }
    $password = bin2hex(random_bytes(32));
    $f = fopen($passwordPath, 'xb');
    chmod($passwordPath, 0600);
    fwrite($f, $password);
    fflush($f);
    fsync($f);
    fclose($f);
    api('Mysql', 'create_user', ['name' => $user,'password' => $password]);
    api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => 'upms_v1','privileges' => 'SELECT,INSERT,UPDATE']);
    unset($c['password'],$c['readOnlyMetadataApproved'],$c['effectivePrivilegesReviewed']);
    $c['user'] = $user;
    $c['account'] = $user.'@localhost';
    $c['passwordFile'] = $passwordPath;
    $c['hostingVerified'] = true;
    $c['backupRestoreVerified'] = false;
    $c['reference'] = 'php84_owner_go_live_20261030';
    $c['receiptFile'] = $stage.'/runtime/finalization84-receipt.json';
    $c['legacyRecoveryWaiver'] = ['status' => 'OWNER_APPROVED_LEGACY_RECOVERY_WAIVER','retiredSchema' => 'upms','productionSchema' => 'upms_v1','reference' => $c['reference'],'legacyExportReportedByOwner' => 'upms.sql','legacyRestoreVerified' => false,'productionRecoveryVerified' => false,'activationAuthorized' => false,'ownerApprovalSource' => 'PHP-8.4 owner request: retire dummy upms and finalize clean upms_v1','reason' => 'Owner retires historical dummy data and accepts that the reported upms.sql export has no independently verified restore. New production recovery remains a separate activation gate.'];
    foreach (['finalization84' => 'one-time-sql-import-finalization','provisioning84' => 'one-time-production-maintenance'] as $name => $mode) {
        $c['mode'] = $mode;
        $c['enabled'] = true;
        $c['approvalFile'] = $stage.'/runtime/'.$name.'-approval.json';
        if ($name === 'provisioning84') {
            $c['credentialsFile'] = $stage.'/runtime/administrators84.json';
        }
        $approval = ['status' => 'APPROVED_FINAL_CUTOVER','operation' => $name === 'finalization84' ? 'finalize-clean-sql-import' : 'provision-clean-administrators','reference' => $c['reference'],'targetHash' => App\Upms\MaintenanceApproval::targetHash($c),'planHash' => App\Upms\CleanInitialization::hash(),'legacyRecoveryWaiver' => $c['legacyRecoveryWaiver'],'sqlSha256' => App\Upms\CleanSqlImport::digest(),'manifestSha256' => hash_file('sha256', $stage.'/php84-import-tools/upms-production-clean-manifest.json')];
        privateJson($c['approvalFile'], $approval);
        privateJson($stage.'/runtime/'.$name.'.json', $c);
        $loaded = App\Upms\ProductionProfile::load($stage.'/runtime/'.$name.'.json', $mode);
        $pdo = App\Upms\ProductionConnection::connect($loaded);
        foreach ($pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN) as $grant) {
            if (str_contains($grant, 'ALL PRIVILEGES') || str_contains($grant, 'WITH GRANT OPTION') || preg_match('/\b(DROP|CREATE|ALTER|DELETE)\b/', $grant)) {
                throw new RuntimeException('MAINTENANCE_GRANTS_REJECTED');
            }
        }
    }
    echo json_encode(['prepared' => true,'maintenanceAccount' => $user.'@localhost','legacyRestoreWaived' => true,'productionRecoveryVerified' => false,'activationAuthorized' => false,'passwordsPrinted' => false])."\n";
} catch (Throwable $e) {
    echo json_encode(['prepared' => false,'code' => preg_match('/^[A-Za-z0-9_]+$/D', $e->getMessage()) ? $e->getMessage() : 'PRIVATE_PREPARATION_REVIEW_REQUIRED','passwordsPrinted' => false])."\n";
    exit(1);
}
