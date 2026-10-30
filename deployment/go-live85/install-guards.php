<?php

// Explicit owner-approved guard deployment only; never activates UPMS or modifies application records.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
try {
    $o = getopt('', ['guard-hash:']);
    if (!hash_equals(App\Upms\CrudGuards::hash(), $o['guard-hash'] ?? '')) {
        throw new RuntimeException('EXPLICIT_GUARD_DIGEST_REQUIRED');
    }
    $test = json_decode(file_get_contents($s.'/runtime/security85-api-evidence.json'), true, 32, JSON_THROW_ON_ERROR);
    if (($test['passed'] ?? false) !== true || ($test['allGuardEventsExecuted'] ?? 0) !== 45 || ($test['guardHash'] ?? '') !== App\Upms\CrudGuards::hash()) {
        throw new RuntimeException('ALL_GUARD_TESTS_REQUIRED');
    }
    $c = App\Upms\ProductionProfile::load($s.'/runtime/accounts84.json', 'read-only-transport-verification');
    $readonly = App\Upms\ProductionConnection::connect($c);
    App\Upms\CleanSqlImport::accounts($readonly, $c['reference']);
    $fingerprint = static function (PDO $p): string {
        $data = [];
        $tables = $p->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        sort($tables);
        foreach ($tables as $t) {
            $rows = $p->query('SELECT * FROM `'.$t.'`')->fetchAll(PDO::FETCH_ASSOC);
            $serialized = array_map(fn ($r) => json_encode($r, JSON_THROW_ON_ERROR), $rows);
            sort($serialized);
            $data[$t] = $serialized;
        }return hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
    };
    $before = $fingerprint($readonly);
    $user = 'upms_guard85';
    $password = bin2hex(random_bytes(32));
    $pw = $s.'/runtime/guard85-password';
    if (file_exists($pw)) {
        throw new RuntimeException('EXISTING_GUARD_IDENTITY_REVIEW_REQUIRED');
    }
    $h = fopen($pw, 'xb');
    chmod($pw, 0600);
    fwrite($h, $password);
    fflush($h);
    fsync($h);
    fclose($h);
    api('Mysql', 'create_user', ['name' => $user,'password' => $password]);
    api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => 'upms_v1','privileges' => 'SELECT,TRIGGER']);
    $c['user'] = $user;
    $c['account'] = $user.'@localhost';
    $c['passwordFile'] = $pw;
    unset($c['password']);
    privateJson($s.'/runtime/guard85-profile.json', $c);
    $c = App\Upms\ProductionProfile::load($s.'/runtime/guard85-profile.json', 'read-only-transport-verification');
    $g = App\Upms\ProductionConnection::connect($c);
    App\Upms\CleanInitialization::verifySchema($g);
    $r = App\Upms\CrudGuards::install($g);
    $after = $fingerprint($readonly);
    if (!hash_equals($before, $after)) {
        throw new RuntimeException('GUARD_DEPLOYMENT_CHANGED_RECORDS');
    }
    $r += ['targetHash' => App\Upms\CleanInitialization::target($g),'recordsBeforeSha256' => $before,'recordsAfterSha256' => $after,'applicationRecordsChanged' => false,'runtimeDdlGranted' => false,'definerAccount' => $user.'@localhost','verifiedUtc' => gmdate('c')];
    privateJson($s.'/runtime/guard85-evidence.json', $r);
    echo json_encode($r, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'GUARD_INSTALL_FAILED_REVIEW_PARTIAL_STATE','native' => $e instanceof PDOException ? ($e->errorInfo[1] ?? null) : null])."\n";
    exit(1);
}
