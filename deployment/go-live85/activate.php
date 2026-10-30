<?php

// Dormant owner-executable activation. DO NOT invoke with approval until owner reviews final readiness.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
require __DIR__.'/readiness-support.php';
$o = getopt('', ['owner-approve:']);
$approval = $o['owner-approve'] ?? '';
if (!preg_match('/^[a-f0-9]{64}$/D', $approval)) {
    echo json_encode(['activated' => false,'code' => 'EXPLICIT_OWNER_ACTIVATION_APPROVAL_REQUIRED','databaseContacted' => false])."\n";
    exit(2);
}
try {
    $r = readiness85($s);
    if (!hash_equals($r['readinessDigest'], $approval)) {
        throw new RuntimeException('OWNER_APPROVAL_DIGEST_STALE');
    }
    [$runtime,$p] = runtime85($s);
    unset($runtime['password'],$runtime['readOnlyMetadataApproved']);
    $runtime['enabled'] = true;
    $runtime['mode'] = 'approved-production-runtime';
    $runtime['privilegePolicy'] = App\Upms\RuntimePrivileges::GODADDY;
    $runtime['crudRiskApprovalFile'] = $s.'/runtime/crud-risk85-approval.json';
    $runtime['guardEvidenceFile'] = $s.'/runtime/guard85-evidence.json';
    $risk = ['status' => 'OWNER_APPROVED_GODADDY_CRUD_ACTIVATION','riskDigest' => App\Upms\CrudRiskApproval::digest(),'reference' => $runtime['reference'],'targetHash' => App\Upms\MaintenanceApproval::targetHash($runtime),'residualRisks' => App\Upms\CrudRiskApproval::RISKS,'readinessDigest' => $approval,'approvedUtc' => gmdate('c'),'approvalSource' => 'Explicit owner invocation after final PHP-8.5 readiness review'];
    privateJson($runtime['crudRiskApprovalFile'], $risk);
    privateJson($s.'/runtime/runtime85.json', $runtime);
    privateJson($s.'/runtime/activation85-intent.json', ['reference' => $runtime['reference'],'readinessDigest' => $approval,'state' => 'APPROVED_ACTIVATION_INTENT','createdUtc' => gmdate('c')]);
    $env = $s.'/php84-release/private/backend/.env';
    if (!copy($env, $s.'/runtime/pre-activation85.env')) {
        throw new RuntimeException('PRIVATE_ENV_BACKUP_FAILED');
    }chmod($s.'/runtime/pre-activation85.env', 0600);
    $maintenance = $runtime;
    unset($maintenance['privilegePolicy'],$maintenance['crudRiskApprovalFile'],$maintenance['guardEvidenceFile'],$maintenance['operators']);
    $maintenance['mode'] = 'reviewed-clean-activation';
    $maintenance['user'] = 'upms_maint84';
    $maintenance['account'] = 'upms_maint84@localhost';
    $maintenance['passwordFile'] = $s.'/runtime/maintenance84-password';
    $maintenance['approvalFile'] = $s.'/runtime/activation85-approval.json';
    $a = ['status' => 'APPROVED_FINAL_CUTOVER','operation' => 'activate-clean-production','reference' => $maintenance['reference'],'targetHash' => App\Upms\MaintenanceApproval::targetHash($maintenance),'planHash' => App\Upms\CleanInitialization::hash(),'backupSha256' => $r['recovery']['backupSha256'],'restoreReference' => $r['recovery']['restoreReference'],'readinessDigest' => $approval];
    privateJson($maintenance['approvalFile'], $a);
    privateJson($s.'/runtime/activation85-profile.json', $maintenance);
    api('Mysql', 'set_privileges_on_database', ['user' => 'upms_maint84','database' => 'upms_v1','privileges' => 'SELECT,INSERT,UPDATE']);
    try {
        $c = App\Upms\ProductionProfile::load($s.'/runtime/activation85-profile.json', 'reviewed-clean-activation');
        App\Upms\MaintenanceApproval::read($c, 'activate-clean-production');
        $db = App\Upms\ProductionConnection::connect($c);
        $gates = ['ownerApproved' => hash_equals($r['readinessDigest'], $approval),'backupRestoreVerified' => $r['recovery']['passed'],'transportVerified' => $r['grants']['passed'],'managementTrustVerified' => $r['https']['app.unique-plastic.com'],'hostnameIsolationVerified' => $r['hostedChecks'] === 30,'linuxReleaseVerified' => $r['release']['passed']];
        $result = App\Upms\CleanInitialization::activate($db, $c['reference'], $gates);
    } finally {
        api('Mysql', 'set_privileges_on_database', ['user' => 'upms_maint84','database' => 'upms_v1','privileges' => '']);
    }
    $loaded = App\Upms\ProductionProfile::load($s.'/runtime/runtime85.json');
    App\Upms\CrudRiskApproval::verify($p, $loaded);
    $bytes = file_get_contents($env);
    if (substr_count($bytes, "UPMS_ENABLED=false\n") !== 1 || str_contains($bytes, 'UPMS_PRODUCTION_PROFILE=')) {
        throw new RuntimeException('PRIVATE_ENV_PREIMAGE_CHANGED');
    }
    $bytes = str_replace("UPMS_ENABLED=false\n", "UPMS_ENABLED=true\nUPMS_PRODUCTION_PROFILE=".$s."/runtime/runtime85.json\n", $bytes);
    $temp = $env.'.activation85-pending';
    $f = fopen($temp, 'xb');
    chmod($temp, 0600);
    if (fwrite($f, $bytes) !== strlen($bytes) || !fflush($f) || !fsync($f)) {
        throw new RuntimeException('PRIVATE_ENV_WRITE_FAILED');
    }fclose($f);
    if (!rename($temp, $env)) {
        throw new RuntimeException('PRIVATE_ENV_SWAP_FAILED');
    }
    echo json_encode(['activated' => true,'databaseState' => $result['state'],'runtimeEnabled' => true,'smtpEnabled' => false,'administratorPasswordsPrinted' => false,'liveAcceptanceStillRequired' => true])."\n";
} catch (Throwable $e) {
    echo json_encode(['activated' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'ACTIVATION_FAILED_INSPECT_PRIVATE_INTENT','mayRequirePrivateIntentReview' => true,'credentialsPrinted' => false])."\n";
    exit(1);
}
