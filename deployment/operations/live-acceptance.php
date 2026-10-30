<?php

// Actual HTTPS acceptance. Credentials/cookies remain private; no business writes.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
$checks = [];
$step = 'bootstrap';
require __DIR__.'/acceptance-support.php';
try {
    $c = App\Upms\ProductionProfile::load($s.'/runtime/accounts84.json', 'read-only-transport-verification');
    $p = App\Upms\ProductionConnection::connect($c);
    $before = businessFingerprint($p);
    if ($p->query('SELECT state FROM upms_production_migrations WHERE id=1')->fetchColumn() !== 'ACTIVATED' || $p->query('SELECT state FROM v1_control WHERE id=1')->fetchColumn() !== 'READY') {
        throw new RuntimeException('ACTIVATED_STATE_REQUIRED');
    }
    $old = json_decode(file_get_contents($s.'/runtime/administrators84.json.handoff'), true, 32, JSON_THROW_ON_ERROR);
    $handoffPath = $s.'/runtime/administrators-production.handoff.json';
    if (file_exists($handoffPath)) {
        throw new RuntimeException('EXISTING_ACCEPTANCE_HANDOFF_REVIEW_REQUIRED');
    }
    $handoff = ['reference' => $c['reference'],'createdUtc' => gmdate('c'),'users' => ['admin' => ['id' => '1','password' => bin2hex(random_bytes(24)),'rotation' => 'PREPARED'],'haris' => ['id' => '2','password' => bin2hex(random_bytes(24)),'rotation' => 'PREPARED']]];
    privateJson($handoffPath, $handoff);
    $handles = [];
    $csrf = [];
    $identities = [];
    foreach (['admin' => '1','haris' => '2'] as $name => $id) {
        $step = $name.'_bootstrap';
        $h = newHandle();
        $handles[$name] = $h;
        $r = callLive($h, 'GET', '/api/v1/management/session/csrf');
        expectLive($r, 200);
        $token = $r['body']['csrfToken'] ?? '';
        if (strlen($token) !== 64) {
            throw new RuntimeException('CSRF_TOKEN_REQUIRED');
        }$checks[] = $step;
        $anon = curl_getinfo($h, CURLINFO_COOKIELIST);
        $step = $name.'_initial_login';
        $r = callLive($h, 'POST', '/api/v1/management/session/login', ['username' => $name,'password' => $old[$name]], $token);
        expectLive($r, 200);
        if ((string)($r['body']['user']['id'] ?? '') !== $id || ($r['body']['user']['username'] ?? '') !== $name || ($r['body']['user']['passwordChangeRequired'] ?? false) !== true) {
            throw new RuntimeException('BOOTSTRAP_IDENTITY_ROTATION_REQUIRED');
        }
        if ($anon === curl_getinfo($h, CURLINFO_COOKIELIST)) {
            throw new RuntimeException('LOGIN_SESSION_NOT_ROTATED');
        }$token = $r['body']['csrfToken'];
        $checks[] = $step;
        $step = $name.'_mandatory_change';
        expectLive(callLive($h, 'GET', '/api/v1/management/simple-v1/state'), 403, 'PASSWORD_CHANGE_REQUIRED');
        $checks[] = $step;
        $step = $name.'_csrf_rejection';
        expectLive(callLive($h, 'POST', '/api/v1/management/profile/password', ['currentPassword' => $old[$name],'newPassword' => $handoff['users'][$name]['password']], 'invalid'), 403, 'CSRF_REJECTED');
        $checks[] = $step;
        $step = $name.'_origin_rejection';
        expectLive(callLive($h, 'POST', '/api/v1/management/profile/password', ['currentPassword' => $old[$name],'newPassword' => $handoff['users'][$name]['password']], $token, ['Origin' => 'https://untrusted.invalid']), 403, 'ORIGIN_REJECTED');
        $checks[] = $step;
        $step = $name.'_password_change';
        expectLive(callLive($h, 'POST', '/api/v1/management/profile/password', ['currentPassword' => $old[$name],'newPassword' => $handoff['users'][$name]['password']], $token), 204);
        $handoff['users'][$name]['rotation'] = 'COMPLETED';
        file_put_contents($handoffPath, json_encode($handoff, JSON_PRETTY_PRINT));
        chmod($handoffPath, 0600);
        $checks[] = $step;
        $step = $name.'_old_session_revoked';
        expectLive(callLive($h, 'GET', '/api/v1/management/session/current'), 401);
        $checks[] = $step;
        $h = newHandle();
        $handles[$name] = $h;
        $r = callLive($h, 'GET', '/api/v1/management/session/csrf');
        expectLive($r, 200);
        $token = $r['body']['csrfToken'];
        $step = $name.'_new_password_login';
        $r = callLive($h, 'POST', '/api/v1/management/session/login', ['username' => $name,'password' => $handoff['users'][$name]['password']], $token);
        expectLive($r, 200);
        if (($r['body']['user']['passwordChangeRequired'] ?? false) !== false || (string)$r['body']['user']['id'] !== $id) {
            throw new RuntimeException('ROTATED_IDENTITY_REJECTED');
        }$csrf[$name] = $r['body']['csrfToken'];
        $identities[$name] = $r['body']['user']['id'];
        $checks[] = $step;
    }
    foreach ($handles as $name => $h) {
        $step = $name.'_independent_session';
        $r = callLive($h, 'GET', '/api/v1/management/session/current');
        expectLive($r, 200);
        if ((string)$r['body']['user']['id'] !== (string)$identities[$name]) {
            throw new RuntimeException('SESSION_IDENTITY_CROSSED');
        }$checks[] = $step;
        $step = $name.'_read_only_dashboard';
        foreach (['state','items','parties?kind=CLIENT','parties?kind=VENDOR','documents','overview','register','movements','reconciliation'] as $page) {
            expectLive(callLive($h, 'GET', '/api/v1/management/simple-v1/'.$page), 200);
        }$checks[] = $step;
        $step = $name.'_identity_mutation_forbidden';
        expectLive(callLive($h, 'POST', '/api/v1/management/users', ['username' => 'not-created'], $csrf[$name]), 403, 'LEGACY_DISABLED_IN_V1');
        $checks[] = $step;
        $step = $name.'_csrf_logout_rejection';
        expectLive(callLive($h, 'POST', '/api/v1/management/session/logout', [], 'invalid'), 403, 'CSRF_REJECTED');
        $checks[] = $step;
    }
    $step = 'admin_logout';
    expectLive(callLive($handles['admin'], 'POST', '/api/v1/management/session/logout', [], $csrf['admin']), 204);
    expectLive(callLive($handles['admin'], 'GET', '/api/v1/management/session/current'), 401);
    $checks[] = $step;
    $step = 'haris_session_independent_after_admin_logout';
    expectLive(callLive($handles['haris'], 'GET', '/api/v1/management/session/current'), 200);
    $checks[] = $step;
    $step = 'haris_logout';
    expectLive(callLive($handles['haris'], 'POST', '/api/v1/management/session/logout', [], $csrf['haris']), 204);
    expectLive(callLive($handles['haris'], 'GET', '/api/v1/management/session/current'), 401);
    $checks[] = $step;
    $step = 'business_unchanged';
    $after = businessFingerprint($p);
    if ($before !== $after) {
        throw new RuntimeException('BUSINESS_DATA_CHANGED_DURING_ACCEPTANCE');
    }$checks[] = $step;
    $g = App\Upms\ProductionProfile::load($s.'/runtime/guard85-profile.json', 'read-only-transport-verification');
    $guards = App\Upms\CrudGuards::verify(App\Upms\ProductionConnection::connect($g));
    $report = ['passed' => true,'checks' => $checks,'checkCount' => count($checks),'identities' => $identities,'passwordChanges' => ['admin' => 'COMPLETED','haris' => 'COMPLETED'],'privateHandoff' => $handoffPath,'passwordsPrinted' => false,'httpsValidationBypassed' => false,'businessBefore' => $before,'businessAfter' => $after,'guards' => $guards,'smtpDisabled' => str_contains(file_get_contents($s.'/php84-release/private/backend/.env'), "INQUIRY_MODE=Disabled\n"),'state' => 'ACTIVATED_READY','verifiedUtc' => gmdate('c')];
    privateJson($s.'/runtime/live-acceptance86.json', $report);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    $r = ['passed' => false,'failedStep' => $step,'completedChecks' => $checks,'code' => preg_match('/^[A-Z_]+$/D',$e->getMessage()) ? $e->getMessage() : 'LIVE_ACCEPTANCE_REVIEW_REQUIRED','passwordsPrinted' => false,'noAutomaticReset' => true];
    file_put_contents($s.'/runtime/live-acceptance86-failure.json',json_encode($r,JSON_PRETTY_PRINT));
    chmod($s.'/runtime/live-acceptance86-failure.json',0600);
    echo json_encode($r,JSON_PRETTY_PRINT)."\n";
    exit(1);
}
