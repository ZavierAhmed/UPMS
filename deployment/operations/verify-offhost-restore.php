<?php

// Restore a decrypted off-host stream into a NEW isolated database only. Never production.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
$o = getopt('', ['prepare','restore']);
$db = 'upms_recovery86';
$user = 'upms_recover86';
$profile = $s.'/runtime/recovery86-profile.json';
$restoring = false;
try {
    if (isset($o['prepare'])) {
        if (file_exists($profile)) {
            throw new RuntimeException('EXISTING_RECOVERY_REVIEW_REQUIRED');
        }
        $password = bin2hex(random_bytes(32));
        api('Mysql', 'create_database', ['name' => $db]);
        api('Mysql', 'create_user', ['name' => $user,'password' => $password]);
        privateJson($profile, ['schema' => $db,'user' => $user,'password' => $password]);
        api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => $db,'privileges' => 'SELECT,INSERT,CREATE,REFERENCES,TRIGGER']);
        echo json_encode(['prepared' => true,'isolatedSchema' => $db,'productionChanged' => false]);
        exit;
    }
    if (!isset($o['restore'])) {
        throw new RuntimeException('EXPLICIT_RESTORE_TEST_MODE_REQUIRED');
    }$restoring = true;
    $c = json_decode(file_get_contents($profile), true, 16, JSON_THROW_ON_ERROR);
    if ($c['schema'] !== $db || $c['user'] !== $user) {
        throw new RuntimeException('ISOLATED_TARGET_REJECTED');
    }
    $p = new PDO('mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname='.$db.';charset=utf8mb4', $user, $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false,PDO::MYSQL_ATTR_MULTI_STATEMENTS => false]);
    if ($p->query('SELECT DATABASE()')->fetchColumn() !== $db || $p->query('SELECT CURRENT_USER()')->fetchColumn() !== $user.'@localhost' || $p->query('SHOW TABLES')->fetchAll()) {
        throw new RuntimeException('FRESH_ISOLATED_TARGET_REQUIRED');
    }
    $plan = [];
    foreach (App\Upms\CleanInitialization::plan()['tables'] as $table) {
        $plan[$table['table']] = $table['sql'];
    }$plan[App\Upms\CleanInitialization::RECEIPT] = App\Upms\CleanInitialization::receiptDdl();
    $p->exec("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION', time_zone='+00:00', FOREIGN_KEY_CHECKS=0");
    $expected = [];
    $sourceDdl = [];
    $counts = [];
    $metadata = null;
    $triggers = null;
    $footer = null;
    while (($line = fgets(STDIN, 16777217)) !== false) {
        $r = json_decode($line, true, 128, JSON_THROW_ON_ERROR);
        switch ($r['type'] ?? '') {
            case 'META':if ($r['schema'] !== 'upms_v1' || $r['guardHash'] !== App\Upms\CrudGuards::hash()) {
                throw new RuntimeException('RESTORE_METADATA_REJECTED');
            }$metadata = $r;
                break;
            case 'TRIGGERS':$triggers = $r['rows'];
                break;
            case 'TABLE':$table = $r['table'];
                if (!isset($plan[$table]) || isset($counts[$table]) || App\Upms\CleanInitialization::normalize($r['ddl']) !== App\Upms\CleanInitialization::normalize($plan[$table])) {
                    throw new RuntimeException('CANONICAL_RESTORE_DDL_REQUIRED');
                }$p->exec($r['ddl']);
                $sourceDdl[$table] = $r['ddl'];
                $counts[$table] = 0;
                $expected[$table] = [];
                break;
            case 'ROW':$table = $r['table'];
                if (!isset($counts[$table])) {
                    throw new RuntimeException('RESTORE_ROW_TABLE_REJECTED');
                }$row = $r['row'];
                $cols = $p->query('SHOW COLUMNS FROM `'.$table.'`')->fetchAll(PDO::FETCH_COLUMN);
                if (array_keys($row) !== $cols) {
                    throw new RuntimeException('RESTORE_COLUMNS_REJECTED');
                }$q = $p->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`', $cols).'`) VALUES('.implode(',', array_fill(0, count($cols), '?')).')');
                $q->execute(array_values($row));
                $counts[$table]++;
                ksort($row);
                $expected[$table][] = json_encode(array_map(fn ($v) => $v === null ? null : (string)$v, $row), JSON_THROW_ON_ERROR);
                break;
            case 'END':$footer = $r;
                break;
            default:throw new RuntimeException('RESTORE_RECORD_REJECTED');
        }
    }
    if (!$metadata || !$footer || $footer['counts'] !== $counts || count($counts) !== 20 || !is_array($triggers) || count($triggers) !== 45) {
        throw new RuntimeException('INCOMPLETE_RESTORE_STREAM');
    }
    $p->exec('SET FOREIGN_KEY_CHECKS=1');
    $rows = 0;
    foreach ($counts as $table => $n) {
        $ddl = $p->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        if (App\Upms\CleanInitialization::normalize($ddl) !== App\Upms\CleanInitialization::normalize($sourceDdl[$table])) {
            throw new RuntimeException('RESTORED_DDL_MISMATCH');
        }$actual = [];
        foreach ($p->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC) as $row) {
            ksort($row);
            $actual[] = json_encode(array_map(fn ($v) => $v === null ? null : (string)$v, $row), JSON_THROW_ON_ERROR);
        }sort($actual);
        sort($expected[$table]);
        if ($actual !== $expected[$table]) {
            throw new RuntimeException('RESTORED_DATA_MISMATCH');
        }$rows += $n;
    }
    $rules = App\Upms\CrudGuards::plan();
    foreach ($triggers as $row) {
        $rule = $rules[$row['TRIGGER_NAME']] ?? null;
        if (!$rule || $row['ACTION_STATEMENT'] !== $rule['body']) {
            throw new RuntimeException('RESTORED_GUARD_SOURCE_REJECTED');
        }$p->exec('CREATE TRIGGER `'.$row['TRIGGER_NAME'].'` BEFORE '.$rule['event'].' ON `'.$rule['table'].'` FOR EACH ROW '.$rule['body']);
    }
    $actual = $p->query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')->fetchAll(PDO::FETCH_ASSOC);
    if (count($actual) !== 45) {
        throw new RuntimeException('RESTORED_GUARD_SET_REJECTED');
    }foreach ($actual as $row) {
        $rule = $rules[$row['TRIGGER_NAME']] ?? null;
        if (!$rule || $row['ACTION_STATEMENT'] !== $rule['body'] || $row['EVENT_OBJECT_TABLE'] !== $rule['table'] || $row['EVENT_MANIPULATION'] !== $rule['event'] || $row['ACTION_TIMING'] !== 'BEFORE') {
            throw new RuntimeException('RESTORED_GUARD_MISMATCH');
        }
    }
    $result = ['passed' => true,'source' => 'encrypted off-host Windows archive, authenticated locally before SSH stdin restore','backupId' => $metadata['backupId'],'restoredTables' => 20,'restoredRows' => $rows,'restoredGuards' => 45,'isolatedSchema' => $db,'productionDatabaseWrites' => 0,'privateKeyUploaded' => false,'plaintextWrittenToDisk' => false,'verifiedUtc' => gmdate('c')];
    api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => $db,'privileges' => '']);
    $result['restorePrivilegesRevoked'] = true;
    privateJson($s.'/runtime/offhost-restore86-evidence.json', $result);
    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    if ($restoring) {
        try {
            api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => $db,'privileges' => '']);
        } catch (Throwable) {
        }
    }
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'ISOLATED_RESTORE_TEST_FAILED','native' => $e instanceof PDOException ? ($e->errorInfo[1] ?? null) : null,'productionChanged' => false]);
    exit(1);
}
