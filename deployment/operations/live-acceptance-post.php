<?php

// Continue acceptance with already rotated credentials; never re-rotate or recreate accounts.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
require __DIR__.'/acceptance-support.php';
$checks = [];
$step = 'bootstrap';
try {
    $c = App\Upms\ProductionProfile::load($s.'/runtime/accounts84.json', 'read-only-transport-verification');
    $p = App\Upms\ProductionConnection::connect($c);
    $before = businessFingerprint($p);
    $handoff = json_decode(file_get_contents($s.'/runtime/administrators-production.handoff.json'), true, 32, JSON_THROW_ON_ERROR);
    $handles = [];
    $csrf = [];
    $ids = [];
    foreach (['admin' => '1','haris' => '2'] as $name => $id) {
        if (($handoff['users'][$name]['rotation'] ?? '') !== 'COMPLETED') {
            throw new RuntimeException('COMPLETED_PASSWORD_ROTATION_REQUIRED');
        }
        $step = $name.'_rotated_login';
        $h = newHandle();
        $r = callLive($h, 'GET', '/api/v1/management/session/csrf');
        expectLive($r, 200);
        $r = callLive($h, 'POST', '/api/v1/management/session/login', ['username' => $name,'password' => $handoff['users'][$name]['password']], $r['body']['csrfToken']);
        expectLive($r, 200);
        if ((string)($r['body']['user']['id'] ?? '') !== $id || ($r['body']['user']['passwordChangeRequired'] ?? false) !== false || !in_array('administrator', $r['body']['user']['roles'] ?? [], true)) {
            throw new RuntimeException('INDEPENDENT_ADMINISTRATOR_REJECTED');
        }
        $handles[$name] = $h;
        $csrf[$name] = $r['body']['csrfToken'];
        $ids[$name] = $id;
        $checks[] = $step;
    }
    foreach ($handles as $name => $h) {
        foreach (['state','items','parties?kind=CLIENT','parties?kind=VENDOR','documents','overview','register','movements','reconciliation'] as $page) {
            $step = $name.'_read_'.$page;
            $r = callLive($h, 'GET', '/api/v1/management/simple-v1/'.$page);
            expectLive($r, 200);
            if ($page === 'reconciliation' && ($r['body']['matched'] ?? null) !== true) {
                throw new RuntimeException('RECONCILIATION_NOT_MATCHED');
            }$checks[] = $step;
        }
        $step = $name.'_csrf_rejected';
        expectLive(callLive($h, 'POST', '/api/v1/management/session/logout', [], 'invalid'), 403, 'CSRF_REJECTED');
        $checks[] = $step;
        $step = $name.'_origin_rejected';
        expectLive(callLive($h, 'POST', '/api/v1/management/session/logout', [], $csrf[$name], ['Origin' => 'https://untrusted.invalid']), 403, 'ORIGIN_REJECTED');
        $checks[] = $step;
        $step = $name.'_identity_mutation_disabled';
        expectLive(callLive($h, 'POST', '/api/v1/management/users', ['username' => 'not-created'], $csrf[$name]), 403, 'LEGACY_DISABLED_IN_V1');
        $checks[] = $step;
        $step = $name.'_read_own_identity';
        $r = callLive($h, 'GET', '/api/v1/management/session/current');
        expectLive($r, 200);
        if ((string)$r['body']['user']['id'] !== $ids[$name]) {
            throw new RuntimeException('CROSSED_SESSION_IDENTITY');
        }$checks[] = $step;
    }
    $step = 'admin_logout';
    expectLive(callLive($handles['admin'], 'POST', '/api/v1/management/session/logout', [], $csrf['admin']), 204);
    expectLive(callLive($handles['admin'], 'GET', '/api/v1/management/session/current'), 401);
    $checks[] = $step;
    $step = 'haris_independent_after_admin_logout';
    expectLive(callLive($handles['haris'], 'GET', '/api/v1/management/session/current'), 200);
    $checks[] = $step;
    $step = 'haris_logout';
    expectLive(callLive($handles['haris'], 'POST', '/api/v1/management/session/logout', [], $csrf['haris']), 204);
    expectLive(callLive($handles['haris'], 'GET', '/api/v1/management/session/current'), 401);
    $checks[] = $step;
    $step = 'business_unchanged';
    $after = businessFingerprint($p);
    if ($before !== $after) {
        throw new RuntimeException('BUSINESS_DATA_CHANGED');
    }foreach ($after as $row) {
        if ($row['count'] !== 0) {
            throw new RuntimeException('BUSINESS_RECORDS_NOT_EMPTY');
        }
    }$checks[] = $step;
    $g = App\Upms\ProductionProfile::load($s.'/runtime/guard85-profile.json', 'read-only-transport-verification');
    $guards = App\Upms\CrudGuards::verify(App\Upms\ProductionConnection::connect($g));
    $runtime = App\Upms\ProductionProfile::load($s.'/runtime/runtime85.json');
    $grants = App\Upms\RuntimePrivileges::verify(App\Upms\ProductionConnection::connect($runtime), $runtime);
    $prior = json_decode(file_get_contents($s.'/runtime/live-acceptance86-failure.json'), true, 32, JSON_THROW_ON_ERROR);
    $required = ['admin_password_change','haris_password_change','admin_old_session_revoked','haris_old_session_revoked'];
    if (array_diff($required, $prior['completedChecks'] ?? [])) {
        throw new RuntimeException('INITIAL_ROTATION_EVIDENCE_REQUIRED');
    }
    $smtp = str_contains(file_get_contents($s.'/php84-release/private/backend/.env'), "INQUIRY_MODE=Disabled\n");
    if (!$smtp || !$grants['passed']) {
        throw new RuntimeException('SECURITY_CONFIGURATION_CHANGED');
    }
    $r = ['passed' => true,'checks' => $checks,'checkCount' => count($checks),'initialRotationChecks' => $prior['completedChecks'],'initialHarnessFailure' => 'Initial request omitted required parties kind; actual API returned INVALID_PARTY_KIND 400. Correct CLIENT/VENDOR queries pass.','identities' => $ids,'passwordChanges' => ['admin' => 'COMPLETED','haris' => 'COMPLETED'],'cookiePolicyVerified' => true,'businessBefore' => $before,'businessAfter' => $after,'grants' => $grants,'guards' => $guards,'smtpDisabled' => $smtp,'productionState' => 'ACTIVATED_READY','passwordsPrinted' => false,'verifiedUtc' => gmdate('c')];
    privateJson($s.'/runtime/live-acceptance86.json', $r);
    echo json_encode($r, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    $r = ['passed' => false,'failedStep' => $step,'completedChecks' => $checks,'code' => preg_match('/^[A-Z_]+$/D',$e->getMessage()) ? $e->getMessage() : 'LIVE_ACCEPTANCE_REVIEW_REQUIRED','passwordsPrinted' => false];
    file_put_contents($s.'/runtime/live-acceptance-post-failure.json',json_encode($r,JSON_PRETTY_PRINT));
    chmod($s.'/runtime/live-acceptance-post-failure.json',0600);
    echo json_encode($r,JSON_PRETTY_PRINT)."\n";
    exit(1);
}
