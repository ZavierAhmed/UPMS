<?php

// Private read-only verification: explicit --policy preserves the original default.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
$o = getopt('', ['policy:']);
$policy = $o['policy'] ?? App\Upms\RuntimePrivileges::STRICT;
$temp = $s.'/runtime/grant85-check-'.bin2hex(random_bytes(8)).'.json';
try {
    $p = $s.'/runtime/runtime84.DISABLED.json';
    if (is_link($p) || (fileperms($p) & 0077)) {
        throw new RuntimeException('PRIVATE_PROFILE_REQUIRED');
    }
    $c = json_decode(file_get_contents($p), true, 32, JSON_THROW_ON_ERROR);
    $c['mode'] = 'read-only-transport-verification';
    $c['enabled'] = true;
    $c['readOnlyMetadataApproved'] = true;
    privateJson($temp, $c);
    $c = App\Upms\ProductionProfile::load($temp, 'read-only-transport-verification');
    $pdo = App\Upms\ProductionConnection::connect($c);
    $pdo->exec('START TRANSACTION READ ONLY');
    $r = App\Upms\RuntimePrivileges::verify($pdo, $c, $policy);
    $pdo->rollBack();
    $r += ['databaseWrites' => 0,'runtimeEnabled' => false,'activationExecuted' => false,'verifiedUtc' => gmdate('c')];
    file_put_contents($s.'/runtime/grants85-'.$policy.'.json', json_encode($r, JSON_PRETTY_PRINT));
    chmod($s.'/runtime/grants85-'.$policy.'.json', 0600);
    unlink($temp);
    echo json_encode($r, JSON_PRETTY_PRINT)."\n";
    exit($r['passed'] ? 0 : 2);
} catch (Throwable $e) {
    if (is_file($temp)) {
        unlink($temp);
    }echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'PRIVATE_GRANT_VERIFICATION_FAILED'])."\n";
    exit(1);
}
