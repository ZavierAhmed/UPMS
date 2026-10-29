<?php

// Private consolidated verifier. No initialize/finalize/provision/activate/import operation.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/support.php';
$o = getopt('', ['plan:','manifest-sha:','database-profile:']);
$report = ['productionReady' => false,'runtime' => 'DISABLED','administratorProvisioning' => 'NOT_AUTHORIZED','finalization' => 'BLOCKED','publicActivation' => 'BLOCKED','database' => 'PENDING_SELECT_ONLY_PROFILE','backupRestore' => 'PENDING_INDEPENDENT_EVIDENCE','webPhp' => 'PENDING_HOSTED_WEB_EVIDENCE','apache' => 'PENDING_HOSTED_WEB_EVIDENCE','smtp' => 'PENDING_APPROVED_ENDPOINT','managementTrust' => 'BLOCKED_SELF_SIGNED_PUBLIC_ENDPOINT'];
$phase = 'plan';
try {
    if (PHP_OS_FAMILY !== 'Linux' || PHP_MAJOR_VERSION !== 8 || PHP_MINOR_VERSION !== 3) {
        throw new RuntimeException('LINUX_PHP83_REQUIRED');
    }
    $plan = $o['plan'] ?? '';
    if (!is_string($plan) || is_link($plan) || !is_file($plan) || (fileperms($plan) & 0077)) {
        throw new RuntimeException('PRIVATE_REVIEWED_PLAN_REQUIRED');
    }
    $c = json_decode(file_get_contents($plan), true, 32, JSON_THROW_ON_ERROR);
    $paths = UpmsStaging::layout($c);
    if (!UpmsStaging::within(realpath($plan), $paths['stagingRoot'])) {
        throw new RuntimeException('PLAN_OUTSIDE_STAGING_REJECTED');
    }
    $payload = realpath(__DIR__.'/..');
    if ($payload !== $paths['stagingRoot'].'/payload') {
        throw new RuntimeException('EXACT_STAGING_PAYLOAD_REQUIRED');
    }
    $manifest = $payload.'/STAGING-MANIFEST.json';
    $pin = $o['manifest-sha'] ?? '';
    if (!is_string($pin) || !preg_match('/^[a-f0-9]{64}$/D', $pin) || !hash_equals($pin, hash_file('sha256', $manifest))) {
        throw new RuntimeException('INDEPENDENT_BUNDLE_DIGEST_REQUIRED');
    }
    $m = json_decode(file_get_contents($manifest), true, 512, JSON_THROW_ON_ERROR);
    $report['files'] = UpmsStaging::digestTree($payload, $m);
    $report['sourceCommit'] = $m['sourceCommit'];
    $report['sqlSha256'] = $m['sqlSha256'];
    $report['releaseManifestSha256'] = $m['releaseManifestSha256'];
    $report['stagingPaths'] = $paths;
    if (($m['targetStagingRoot'] ?? null) !== $paths['stagingRoot']) {
        throw new RuntimeException('TARGET_PATH_PIN_REJECTED');
    }
    $runtime = realpath($paths['stagingRoot'].'/runtime');
    if (!$runtime || (fileperms($runtime) & 0077)) {
        throw new RuntimeException('PRIVATE_RUNTIME_PREPARATION_REQUIRED');
    }UpmsStaging::$logDirectory = $runtime;
    $release = $payload.'/release';
    $backend = $release.'/private/backend';
    $report['release'] = UpmsStaging::child([PHP_BINARY,$release.'/check-release.php',$release,$m['releaseManifestSha256']]);
    foreach (['public/inquiry.php','management/gateway.php'] as $entry) {
        $code = file_get_contents($release.'/'.$entry);
        if (str_contains($code, 'REPLACE_WITH_') || !str_contains($code, "'".$backend."'")) {
            throw new RuntimeException('STAGING_ENTRY_PATH_REJECTED');
        }
    }
    $report['cliRuntime'] = UpmsStaging::child([PHP_BINARY,__DIR__.'/runtime-check.php',$backend,$runtime]);
    if (isset($o['database-profile'])) {
        require $backend.'/vendor/autoload.php';
        $c = App\Upms\ProductionProfile::load($o['database-profile'], 'read-only-transport-verification');
        if ($c['schema'] !== 'upms_v1' || $c['transport'] !== 'unix_socket' || $c['privateRoot'] !== $paths['stagingRoot'] || ($c['effectivePrivilegesReviewed'] ?? false) !== true) {
            throw new RuntimeException('EXACT_READ_ONLY_UPMS_V1_PROFILE_REQUIRED');
        }
        $phase = 'database_connect';
        $pdo = App\Upms\ProductionConnection::connect($c, static function ($value) use (&$phase) {
            $phase = $value;
        });
        UpmsStaging::readOnlyGrants($pdo->query('SHOW GRANTS FOR CURRENT_USER')->fetchAll(PDO::FETCH_NUM), 'upms_v1');
        $report['databaseGrantReview'] = ['visibleGrantsSelectOnly' => true,'effectivePrivilegeReview' => 'OWNER_PROVIDER_REVIEW_REQUIRED_AND_ASSERTED'];
        $pdo = null;
        $report['database'] = UpmsStaging::child([PHP_BINARY,$payload.'/import-tools/verify-clean-import.php','--backend',$backend,'--profile',$o['database-profile']]);
    }
    $report['privateStagingChecksPassed'] = true;
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    $code = $e instanceof RuntimeException && preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'STAGING_CHECK_FAILED_PRIVATE_REVIEW';
    $report['privateStagingChecksPassed'] = false;
    if (class_exists(App\Upms\DiagnosticFailure::class)) {
        $safe = App\Upms\DiagnosticFailure::describe($e, $phase);
        $report['diagnosis'] = $safe;
        if ($code === 'STAGING_CHECK_FAILED_PRIVATE_REVIEW') {
            $code = $safe['code'];
        }
    }
    $report['failure'] = $code;
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
    exit(1);
}
