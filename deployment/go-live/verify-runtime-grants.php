<?php

// Read-only verifier, safe before activation. Never enables the HTTP runtime.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
require __DIR__.'/support.php';
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
require $stage.'/php84-release/private/backend/vendor/autoload.php';
$temp = $stage.'/runtime/runtime84-check-'.bin2hex(random_bytes(6)).'.json';
try {
    $path = $stage.'/runtime/runtime84.DISABLED.json';
    if (is_link($path) || (fileperms($path) & 0077)) {
        throw new RuntimeException('PRIVATE_PROFILE_REQUIRED');
    }
    $c = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
    if (($c['enabled'] ?? null) !== false) {
        throw new RuntimeException('DISABLED_RUNTIME_REQUIRED');
    }
    $c['enabled'] = true;
    privateJson($temp, $c);
    $c = App\Upms\ProductionProfile::load($temp);
    $pdo = App\Upms\ProductionConnection::connect($c);
    $pdo->exec('START TRANSACTION READ ONLY');
    $policy = json_decode(file_get_contents(__DIR__.'/runtime84-policy.json'), true, 32, JSON_THROW_ON_ERROR)['runtime'];
    $expected = ['SCHEMA|upms\\_v1|||SELECT'];
    foreach (['insert','delete'] as $verb) {
        foreach ($policy[$verb] as $table) {
            $expected[] = 'TABLE|upms_v1|'.$table.'||'.strtoupper($verb);
        }
    }
    foreach (['sessions','login_attempts'] as $table) {
        $expected[] = 'TABLE|upms_v1|'.$table.'||UPDATE';
    }
    foreach ($policy['updateColumns'] as $table => $columns) {
        foreach ($columns as $column) {
            $expected[] = 'COLUMN|upms_v1|'.$table.'|'.$column.'|UPDATE';
        }
    }
    $actual = [];
    $grantee = "'".$c['user']."'@'localhost'";
    foreach (['USER','SCHEMA','TABLE','COLUMN'] as $scope) {
        $q = $pdo->prepare('SELECT * FROM information_schema.'.$scope.'_PRIVILEGES WHERE GRANTEE=?');
        $q->execute([$grantee]);
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if ($scope === 'USER' && $r['PRIVILEGE_TYPE'] === 'USAGE' && $r['IS_GRANTABLE'] === 'NO') {
                continue;
            }
            $actual[] = $scope.'|'.($r['TABLE_SCHEMA'] ?? '').'|'.($r['TABLE_NAME'] ?? '').'|'.($r['COLUMN_NAME'] ?? '').'|'.$r['PRIVILEGE_TYPE'].($r['IS_GRANTABLE'] === 'YES' ? '|GRANTABLE' : '');
        }
    }
    sort($expected);
    sort($actual);
    $pdo->rollBack();
    $missing = array_values(array_diff($expected, $actual));
    $extra = array_values(array_diff($actual, $expected));
    $report = ['passed' => !$missing && !$extra,'account' => $c['account'],'expectedPrivileges' => count($expected),'actualPrivileges' => count($actual),'missing' => $missing,'unexpected' => $extra,'databaseWrites' => 0,'runtimeEnabled' => false,'activationExecuted' => false,'verifiedUtc' => gmdate('c')];
    file_put_contents($stage.'/runtime/runtime84-grants-report.json', json_encode($report, JSON_PRETTY_PRINT));
    chmod($stage.'/runtime/runtime84-grants-report.json', 0600);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
    unlink($temp);
    exit($report['passed'] ? 0 : 2);
} catch (Throwable $e) {
    if (is_file($temp)) {
        unlink($temp);
    }echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'GRANT_VERIFICATION_REVIEW_REQUIRED','credentialsPrinted' => false])."\n";
    exit(1);
}
