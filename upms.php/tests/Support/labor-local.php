<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{EmployeeHaftaSchema,EmployeeHaftaGuards,EmployeeHaftaRecovery,FinancialRecovery,MoneySchema};

$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (($c['port'] ?? 0) !== 3330 || !preg_match('/^upms_test_php_money_[0-9]+(?:_restore)?$/D', $c['schema'] ?? '') || !preg_match('/^money_rt_[0-9]+$/D', $c['runtime'] ?? '')) {
    throw new RuntimeException('ISOLATED_LABOR_ONLY');
}
$p = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false]);
MoneySchema::assertIsolated($p);
switch ($c['action']) {
    case 'probe':
        $r = [];
        foreach (['schema' => fn () => EmployeeHaftaSchema::verify($p),'guards' => fn () => EmployeeHaftaGuards::verify($p, $c['runtime'])] as $stage => $work) {
            try {
                $work();
                $r[$stage] = 'PASS';
            } catch (Throwable $e) {
                $r[$stage] = preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : get_class($e);
            }
        }echo json_encode($r);
        break;
    case 'install':echo json_encode(EmployeeHaftaSchema::installIsolated($p, $c['runtime']));
        break;
    case 'verify':echo json_encode(['schema' => EmployeeHaftaSchema::verify($p),'guards' => EmployeeHaftaGuards::verify($p, $c['runtime'], (string)$p->query('SELECT CURRENT_USER()')->fetchColumn())]);
        break;
    case 'snapshot':
        $s = EmployeeHaftaRecovery::capture($p, $c['runtime']);
        $kp = sodium_crypto_box_keypair();
        $cipher = EmployeeHaftaRecovery::encrypt($s, sodium_crypto_box_publickey($kp));
        $reject = static function (callable $f) {
            try {
                $f();
            } catch (Throwable) {
                return true;
            }throw new RuntimeException('LABOR_BAD_ARCHIVE_ACCEPTED');
        };
        $tests = [];
        $tests['wrong recipient'] = $reject(fn () => EmployeeHaftaRecovery::decrypt($cipher, sodium_crypto_box_keypair()));
        $broken = $cipher;
        $broken[100] = chr(ord($broken[100]) ^ 1);
        $tests['corrupted ciphertext'] = $reject(fn () => EmployeeHaftaRecovery::decrypt($broken, $kp));
        foreach (['amount','employee_id','quantity'] as $field) {
            $bad = $s;
            $bad['tables']['labor_earnings']['rows'][0][$field] = $field === 'employee_id' ? '99999' : '777.00';
            $tests['altered earning '.$field] = $reject(fn () => EmployeeHaftaRecovery::encrypt($bad, sodium_crypto_box_publickey($kp)));
        }
        $bad = $s;
        $bad['tables']['labor_earnings']['rows'][] = $bad['tables']['labor_earnings']['rows'][0];
        $tests['duplicate earning'] = $reject(fn () => EmployeeHaftaRecovery::encrypt($bad, sodium_crypto_box_publickey($kp)));
        $bad = $s;
        array_pop($bad['tables']['labor_payments']['rows']);
        $tests['missing settlement'] = $reject(fn () => EmployeeHaftaRecovery::encrypt($bad, sodium_crypto_box_publickey($kp)));
        echo json_encode(['cipher' => base64_encode($cipher),'keyPair' => base64_encode($kp),'format' => EmployeeHaftaRecovery::FORMAT,'negativeTests' => $tests]);
        sodium_memzero($kp);
        break;
    case 'restore':
        $kp = base64_decode($c['keyPair'], true);
        $s = EmployeeHaftaRecovery::decrypt(base64_decode($c['cipher'], true), $kp);
        sodium_memzero($kp);
        $oldRejected = false;
        try {
            FinancialRecovery::restoreIsolated($p, $s, $c['runtime']);
        } catch (Throwable) {
            $oldRejected = true;
        }if (!$oldRejected || $p->query('SHOW TABLES')->fetchAll()) {
            throw new RuntimeException('LABOR_OLD_CONSUMER_NOT_REJECTED');
        }
        echo json_encode([...EmployeeHaftaRecovery::restoreIsolated($p, $s, $c['runtime']),'oldConsumerRejected' => true]);
        break;
    default:throw new RuntimeException('UNKNOWN_LABOR_HELPER');
}
