<?php

declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{CleanInitialization,CleanSqlImport,CrudGuards,MoneySchema,MoneyRecovery,ExpenseSchema,ExpenseRecovery,ExpenseGuards,MoneyGuards,FinancialRecovery};

$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (($c['port'] ?? 0) !== 3330 || !preg_match('/^upms_test_php_money_[0-9]+(?:_restore)?$/D', $c['schema'] ?? '') || !preg_match('/^money_rt_[0-9]+$/D', $c['runtime'] ?? '')) {
    throw new RuntimeException('ISOLATED_MONEY_ONLY');
}
$p = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false]);
if (!str_starts_with($p->query('SELECT VERSION()')->fetchColumn(), '10.11.19-MariaDB')) {
    throw new RuntimeException('ISOLATED_ENGINE_ONLY');
}
switch ($c['action']) {
    case 'archiveAcceptance':
        $kp = base64_decode($c['keyPair'], true);
        $snapshot = FinancialRecovery::decrypt(base64_decode($c['cipher'], true), $kp);
        $cipher = \App\Upms\FinancialArchive::encrypt($snapshot, sodium_crypto_box_publickey($kp));
        $decoded = \App\Upms\FinancialArchive::decrypt($cipher, $kp);
        if ($decoded !== $snapshot) {
            throw new RuntimeException('ARCHIVE_ROUNDTRIP_MISMATCH');
        }
        $tests = [];
        $expectRejected = static function (string $label, callable $test) use (&$tests): void {
            try {
                $test();
            } catch (Throwable) {
                $tests[] = $label;
                return;
            }
            throw new RuntimeException('ARCHIVE_INVALID_INPUT_ACCEPTED');
        };
        $expectRejected('truncated ciphertext', fn () => \App\Upms\FinancialArchive::decrypt(substr($cipher, 0, -11), $kp));
        $broken = $cipher;
        $broken[100] = chr(ord($broken[100]) ^ 1);
        $expectRejected('corrupted ciphertext', fn () => \App\Upms\FinancialArchive::decrypt($broken, $kp));
        $expectRejected('wrong recipient', fn () => \App\Upms\FinancialArchive::decrypt($cipher, sodium_crypto_box_keypair()));
        foreach (['unsupported version' => ['format' => 'V999'], 'inconsistent manifest' => ['format' => \App\Upms\FinancialArchive::FORMAT, 'manifest' => ['tables' => 20], 'snapshot' => $snapshot]] as $label => $bad) {
            $expectRejected($label, fn () => \App\Upms\FinancialArchive::decrypt(ExpenseRecovery::encrypt($bad, sodium_crypto_box_publickey($kp)), $kp));
        }
        $expectRejected('legacy format refused by new consumer', fn () => \App\Upms\FinancialArchive::decrypt(base64_decode($c['cipher'], true), $kp));
        $r = FinancialRecovery::restoreIsolated($p, $decoded, $c['runtime']);
        sodium_memzero($kp);
        echo json_encode(['passed' => true, 'rejections' => $tests, 'restored' => $r]);
        break;
    case 'base':
        if ($p->query('SHOW TABLES')->fetchAll()) {
            throw new RuntimeException('EMPTY_BASE_REQUIRED');
        }
        foreach (CleanInitialization::plan()['tables'] as $t) {
            $p->exec($t['sql']);
        }$p->exec(CleanInitialization::receiptDdl());
        foreach (CleanSqlImport::seeds() as $table => $rows) {
            foreach ($rows as $r) {
                $q = $p->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`', array_keys($r)).'`) VALUES('.implode(',', array_fill(0, count($r), '?')).')');
                $q->execute(array_values($r));
            }
        }
        echo json_encode(['passed' => true,'tables' => 20]);
        break;
    case 'guards':echo json_encode(CrudGuards::install($p, $c['runtime']));
        break;
    case 'extension':
        $r = MoneySchema::installIsolated($p, $c['accounts'] ?? MoneySchema::defaults(), $c['runtime'], 'SYNTHETIC-P32A-ONLY');
        $hashes = [];
        foreach (MoneySchema::plan()['tables'] as $table => $ddl) {
            $hashes[$table] = hash('sha256', CleanInitialization::normalize($p->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1]));
        }
        $r['schemaHashes'] = $hashes;
        $r['runtime'] = $c['runtime'].'@localhost';
        $r['targetHash'] = CleanInitialization::target($p);
        echo json_encode($r);
        break;
    case 'verifyExpense': echo json_encode([...ExpenseGuards::verify($p, $c['runtime'], (string)$p->query('SELECT CURRENT_USER()')->fetchColumn()),...ExpenseSchema::verify($p)]);
        break;
    case 'verifyMoneyOnly': echo json_encode(MoneyGuards::verify($p, $c['runtime']));
        break;
    case 'expenseExtension': echo json_encode(ExpenseSchema::installIsolated($p, $c['runtime']));
        break;
    case 'financialEvidence': echo json_encode(FinancialRecovery::evidence(ExpenseRecovery::capture($p, $c['runtime'], true)));
        break;
    case 'financialSnapshot': $kp = sodium_crypto_box_keypair();
        $snapshot = FinancialRecovery::capture($p, $c['runtime']);
        $cipher = FinancialRecovery::encrypt($snapshot, sodium_crypto_box_publickey($kp));
        echo json_encode(['cipher' => base64_encode($cipher),'keyPair' => base64_encode($kp),'tables' => count($snapshot['tables'])]);
        sodium_memzero($kp);
        break;
    case 'financialRestore': $kp = base64_decode($c['keyPair'], true);
        $snapshot = FinancialRecovery::decrypt(base64_decode($c['cipher'], true), $kp);
        sodium_memzero($kp);
        echo json_encode(FinancialRecovery::restoreIsolated($p, $snapshot, $c['runtime']));
        break;
    case 'expenseSnapshot': $kp = sodium_crypto_box_keypair();
        $snapshot = ExpenseRecovery::capture($p, $c['runtime']);
        $cipher = ExpenseRecovery::encrypt($snapshot, sodium_crypto_box_publickey($kp));
        echo json_encode(['cipher' => base64_encode($cipher),'keyPair' => base64_encode($kp),'tables' => count($snapshot['tables'])]);
        sodium_memzero($kp);
        break;
    case 'expenseRestore': $kp = base64_decode($c['keyPair'], true);
        $snapshot = ExpenseRecovery::decrypt(base64_decode($c['cipher'], true), $kp);
        sodium_memzero($kp);
        echo json_encode(ExpenseRecovery::restoreIsolated($p, $snapshot, $c['runtime']));
        break;
    case 'snapshot':$keypair = sodium_crypto_box_keypair();
        $snapshot = MoneyRecovery::capture($p, $c['runtime']);
        $cipher = MoneyRecovery::encrypt($snapshot, sodium_crypto_box_publickey($keypair));
        echo json_encode(['cipher' => base64_encode($cipher),'keyPair' => base64_encode($keypair),'tables' => count($snapshot['tables'])]);
        sodium_memzero($keypair);
        break;
    case 'restore':$kp = base64_decode($c['keyPair'], true);
        $snapshot = MoneyRecovery::decrypt(base64_decode($c['cipher'], true), $kp);
        sodium_memzero($kp);
        echo json_encode(MoneyRecovery::restoreIsolated($p, $snapshot, $c['runtime']));
        break;
    default:throw new RuntimeException('UNKNOWN_LOCAL_ACTION');
}
