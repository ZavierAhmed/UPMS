<?php

// Genuine snapshot/restore verification of the NEW production schema only.
// Recovery uses a distinct isolated database; neither upms nor upms_v1 is written.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
require __DIR__.'/support.php';
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
$backend = $stage.'/php84-release/private/backend';
require $backend.'/vendor/autoload.php';
try {
    $c = App\Upms\ProductionProfile::load($stage.'/runtime/accounts84.json', 'read-only-transport-verification');
    $source = App\Upms\ProductionConnection::connect($c);
    $source->exec('START TRANSACTION READ ONLY');
    $tables = $source->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    sort($tables);
    $snapshot = ['sourceSchema' => 'upms_v1','capturedUtc' => gmdate('c'),'tables' => []];
    foreach ($tables as $table) {
        if (!preg_match('/^[a-z0-9_]+$/D', $table)) {
            throw new RuntimeException('TABLE_REJECTED');
        }
        $snapshot['tables'][$table] = ['ddl' => $source->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1],'rows' => $source->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC)];
    }$source->rollBack();
    $path = $stage.'/runtime/upms-v1-backup84.json';
    privateJson($path, $snapshot);
    $sha = hash_file('sha256', $path);
    // Restore reads the persisted artifact afresh, not the live in-memory snapshot.
    unset($snapshot);
    $snapshot = json_decode(file_get_contents($path), true, 128, JSON_THROW_ON_ERROR);
    if (!hash_equals($sha, hash_file('sha256', $path))) {
        throw new RuntimeException('BACKUP_CHANGED');
    }
    $db = 'upms_recovery84';
    $user = 'upms_restore84';
    $password = bin2hex(random_bytes(32));
    api('Mysql', 'create_database', ['name' => $db]);
    api('Mysql', 'create_user', ['name' => $user,'password' => $password]);
    $pw = $stage.'/runtime/restore84-password';
    $f = fopen($pw, 'xb');
    chmod($pw, 0600);
    fwrite($f, $password);
    fflush($f);
    fsync($f);
    fclose($f);
    api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => $db,'privileges' => 'SELECT,CREATE,INSERT,REFERENCES']);
    $restore = new PDO('mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname='.$db.';charset=utf8mb4', $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false]);
    if ($restore->query('SELECT DATABASE()')->fetchColumn() !== $db || $restore->query('SHOW TABLES')->fetchAll()) {
        throw new RuntimeException('FRESH_ISOLATED_RESTORE_REQUIRED');
    }
    $restore->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach ($snapshot['tables'] as $table => $data) {
        $restore->exec($data['ddl']);
        foreach ($data['rows'] as $row) {
            $cols = array_keys($row);
            $q = $restore->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`', $cols).'`) VALUES ('.implode(',', array_fill(0, count($cols), '?')).')');
            $q->execute(array_values($row));
        }
    }$restore->exec('SET FOREIGN_KEY_CHECKS=1');
    $restored = $restore->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    sort($restored);
    if ($restored !== array_keys($snapshot['tables'])) {
        throw new RuntimeException('RESTORE_TABLE_SET_MISMATCH');
    }
    $normalize = static function (array $rows): array {
        $rows = array_map(static function ($row) {
            ksort($row);
            return json_encode(array_map(static fn ($v) => $v === null ? null : (string)$v, $row), JSON_THROW_ON_ERROR);
        }, $rows);
        sort($rows);
        return $rows;
    };
    $rows = 0;
    foreach ($snapshot['tables'] as $table => $data) {
        $ddl = $restore->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        if ($ddl !== $data['ddl'] || $normalize($restore->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC)) !== $normalize($data['rows'])) {
            throw new RuntimeException('RESTORE_CONTENT_MISMATCH');
        }$rows += count($data['rows']);
    }
    api('Mysql', 'set_privileges_on_database', ['user' => $user,'database' => $db,'privileges' => '']);
    $report = ['verified' => true,'sourceSchema' => 'upms_v1','recoverySchema' => $db,'backupFile' => $path,'backupSha256' => $sha,'restoreReference' => 'php84_new_production_restore_20261030','tables' => count($restored),'rowsCompared' => $rows,'sourceWrites' => 0,'retiredDatabaseAccessed' => false,'restorePrivilegesRevoked' => true,'capturedUtc' => $snapshot['capturedUtc'],'verifiedUtc' => gmdate('c')];
    privateJson($stage.'/runtime/recovery84-evidence.json', $report);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['verified' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'RECOVERY_REVIEW_REQUIRED','secretsPrinted' => false])."\n";
    exit(1);
}
