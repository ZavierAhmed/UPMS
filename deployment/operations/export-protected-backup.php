<?php

// Protected consistent database snapshot: only ciphertext is written to disk or handed off.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
$stage = 'bootstrap';
$pdo = null;
function backupWrite($f, string $bytes): void
{
    for ($i = 0,$n = strlen($bytes);$i < $n;) {
        $written = fwrite($f, substr($bytes, $i));
        if ($written === false || $written === 0) {
            throw new RuntimeException('BACKUP_WRITE_FAILED');
        }$i += $written;
    }
}
try {
    $o = getopt('', ['recipient-sha256:']);
    $pk = base64_decode(trim(file_get_contents($s.'/runtime/offhost-recipient.pub')), true);
    if ($pk === false || strlen($pk) !== SODIUM_CRYPTO_BOX_PUBLICKEYBYTES || !hash_equals(hash('sha256', $pk), $o['recipient-sha256'] ?? '')) {
        throw new RuntimeException('RECIPIENT_KEY_PIN_REJECTED');
    }
    $c = App\Upms\ProductionProfile::load($s.'/runtime/accounts84.json', 'read-only-transport-verification');
    $pdo = App\Upms\ProductionConnection::connect($c);
    $g = App\Upms\ProductionProfile::load($s.'/runtime/guard85-profile.json', 'read-only-transport-verification');
    $guard = App\Upms\ProductionConnection::connect($g);
    $guards = App\Upms\CrudGuards::verify($guard);
    $triggers = $guard->query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,DEFINER,SQL_MODE,CHARACTER_SET_CLIENT,COLLATION_CONNECTION,DATABASE_COLLATION FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')->fetchAll(PDO::FETCH_ASSOC);
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    sort($tables);
    $expected = [...array_keys(App\Upms\Schema::TABLES),App\Upms\CleanInitialization::RECEIPT];
    sort($expected);
    if ($tables !== $expected) {
        throw new RuntimeException('BACKUP_TABLE_SET_REJECTED');
    }
    $dir = $s.'/protected-backups';
    if (is_link($dir)) {
        throw new RuntimeException('BACKUP_PATH_REJECTED');
    }if (!is_dir($dir)) {
        mkdir($dir, 0700);
    }if (realpath($dir) !== $dir || (fileperms($dir) & 0077)) {
        throw new RuntimeException('PRIVATE_BACKUP_DIRECTORY_REQUIRED');
    }
    $id = 'upms-'.gmdate('Ymd\THis\Z').'-'.bin2hex(random_bytes(6));
    $temp = $dir.'/'.$id.'.partial';
    $final = $dir.'/'.$id.'.upmsbk';
    $f = fopen($temp, 'xb');
    chmod($temp, 0600);
    $key = sodium_crypto_secretstream_xchacha20poly1305_keygen();
    [$state,$header] = sodium_crypto_secretstream_xchacha20poly1305_init_push($key);
    $envelope = ['format' => 'UPMS_SECRETSTREAM_V1','backupId' => $id,'recipientSha256' => hash('sha256', $pk),'sealedKey' => base64_encode(sodium_crypto_box_seal($key, $pk)),'streamHeader' => base64_encode($header)];
    sodium_memzero($key);
    backupWrite($f, json_encode($envelope, JSON_THROW_ON_ERROR)."\n");
    $digest = hash_init('sha256');
    $frames = 0;
    $push = static function (array $record, bool $last = false) use (&$state, $digest, $f, &$frames) {
        $plain = json_encode($record, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        if (strlen($plain) > 16777216) {
            throw new RuntimeException('BACKUP_RECORD_TOO_LARGE');
        }if (!$last) {
            hash_update($digest, $plain."\n");
        }$cipher = sodium_crypto_secretstream_xchacha20poly1305_push($state, $plain, 'Unique Plastic Industry UPMS backup v1', $last ? SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL : SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_MESSAGE);
        backupWrite($f, pack('N', strlen($cipher)).$cipher);
        $frames++;
    };
    $stage = 'snapshot';
    $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    $push(['type' => 'META','backupId' => $id,'schema' => 'upms_v1','createdUtc' => gmdate('c'),'serverVersion' => $pdo->query('SELECT VERSION()')->fetchColumn(),'targetHash' => App\Upms\CleanInitialization::target($pdo),'planHash' => App\Upms\CleanInitialization::hash(),'guardHash' => $guards['guardHash'],'state' => $pdo->query('SELECT state FROM upms_production_migrations WHERE id=1')->fetchColumn()]);
    $push(['type' => 'TRIGGERS','rows' => $triggers]);
    $counts = [];
    foreach ($tables as $table) {
        $stage = 'table_'.$table;
        $ddl = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        $push(['type' => 'TABLE','table' => $table,'ddl' => $ddl]);
        $counts[$table] = 0;
        $q = $pdo->query('SELECT * FROM `'.$table.'`');
        while ($row = $q->fetch(PDO::FETCH_ASSOC)) {
            $push(['type' => 'ROW','table' => $table,'row' => $row]);
            $counts[$table]++;
        }$q->closeCursor();
    }
    $pdo->rollBack();
    App\Upms\CrudGuards::verify($guard);
    $contentDigest = hash_final($digest);
    $push(['type' => 'END','counts' => $counts,'contentSha256' => $contentDigest,'recordsBeforeFooter' => $frames], true);
    sodium_memzero($state);
    if (!fflush($f) || !fsync($f)) {
        throw new RuntimeException('BACKUP_SYNC_FAILED');
    }fclose($f);
    if (!rename($temp, $final)) {
        throw new RuntimeException('BACKUP_FINALIZE_FAILED');
    }
    $report = ['passed' => true,'file' => $final,'bytes' => filesize($final),'sha256' => hash_file('sha256', $final),'recipientSha256' => $envelope['recipientSha256'],'contentSha256' => $contentDigest,'tables' => count($tables),'triggers' => count($triggers),'rowCounts' => $counts,'plaintextWrittenToDisk' => false,'databaseWrites' => 0,'createdUtc' => gmdate('c')];
    file_put_contents($final.'.receipt.json', json_encode($report, JSON_PRETTY_PRINT));
    chmod($final.'.receipt.json', 0600);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }echo json_encode(['passed' => false,'stage' => $stage,'code' => preg_match('/^[A-Z_]+$/D',$e->getMessage()) ? $e->getMessage() : 'PROTECTED_BACKUP_FAILED','secretsPrinted' => false])."\n";
    exit(1);
}
