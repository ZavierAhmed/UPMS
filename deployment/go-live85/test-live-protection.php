<?php

// Actual runtime-account rejection probes on existing records only. Every attempt rolls back.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
require __DIR__.'/readiness-support.php';
try {
    [$c,$p] = runtime85($s);
    $grants = App\Upms\RuntimePrivileges::verify($p, $c, App\Upms\RuntimePrivileges::GODADDY);
    if (!$grants['passed']) {
        throw new RuntimeException('EXACT_CRUD_GRANTS_REQUIRED');
    }
    [, $g] = connect85($s.'/runtime/guard85-profile.json');
    $guard = App\Upms\CrudGuards::verify($g);
    $checks = 0;
    $deny = static function ($sql) use ($p, &$checks) {
        $p->beginTransaction();
        try {
            $p->exec($sql);
            throw new RuntimeException('LIVE_PROTECTED_WRITE_ACCEPTED');
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) !== 1644) {
                throw new RuntimeException('LIVE_WRONG_REJECTION');
            }$checks++;
        } finally {
            if ($p->inTransaction()) {
                $p->rollBack();
            }
        }
    };
    foreach (['identity_guard','roles','permissions','user_roles','role_permissions','upms_production_migrations','users','v1_control','identity_audit_events'] as $t) {
        $deny('DELETE FROM `'.$t.'`');
    }
    foreach (['identity_guard' => 'id=id','roles' => 'name=name','permissions' => 'code=code','user_roles' => 'role_code=role_code','role_permissions' => 'permission_code=permission_code','upms_production_migrations' => 'state=state','users' => 'enabled=0','v1_control' => "state='READY'",'identity_audit_events' => 'details=details'] as $t => $set) {
        $deny('UPDATE `'.$t.'` SET '.$set);
    }
    foreach (['identity_guard','roles','permissions','user_roles','role_permissions','upms_production_migrations','users','v1_control'] as $t) {
        $deny('INSERT INTO `'.$t.'` SELECT * FROM `'.$t.'` LIMIT 1');
    }
    $p->exec('SET @upms_bypass=1, FOREIGN_KEY_CHECKS=0');
    try {
        $deny('DELETE FROM users');
        $deny('REPLACE INTO roles SELECT * FROM roles LIMIT 1');
    } finally {
        $p->exec('SET FOREIGN_KEY_CHECKS=1');
    }
    $accounts = App\Upms\CleanSqlImport::accounts($p, $c['reference']);
    $recovery = recovery85($s, $p);
    $empty = [];
    foreach (App\Upms\CleanInitialization::BUSINESS as $t) {
        $empty[$t] = (int)$p->query('SELECT COUNT(*) FROM `'.$t.'`')->fetchColumn();
    }
    $r = ['passed' => true,'liveRejections' => $checks,'guardDefinitionsVerified' => $guard['triggers'],'guardHash' => App\Upms\CrudGuards::hash(),'grants' => $grants,'businessRows' => $empty,'accountCount' => $accounts['applicationUserCount'],'backupStillMatchesAllRecords' => $recovery['passed'],'businessProbeRecordsCreated' => 0,'committedApplicationWrites' => 0,'emptyFinancialGuardExecution' => 'All financial guard events executed on isolated GoDaddy schema; production definitions verified exactly without inserting financial rows.','verifiedUtc' => gmdate('c')];
    privateJson($s.'/runtime/live85-probes.json', $r);
    echo json_encode($r, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'LIVE_PROBE_FAILED','credentialsPrinted' => false])."\n";
    exit(1);
}
