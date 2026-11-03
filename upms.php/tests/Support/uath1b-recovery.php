<?php

declare(strict_types=1);

// A production-UAT fixture can have no wage payments; capture does not invent one.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__.'/../../vendor/autoload.php';
$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (!preg_match('/^upms_test_php_money_[0-9]+$/D', $c['schema'] ?? '') || !preg_match('/^money_rt_[0-9]+$/D', $c['runtime'] ?? '')) {
    throw new RuntimeException('ISOLATED_ONLY');
}
$pdo = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
App\Upms\MoneySchema::assertIsolated($pdo);
$snapshot = App\Upms\EmployeeHaftaRecovery::capture($pdo, $c['runtime']);
$keys = sodium_crypto_box_keypair();
$cipher = App\Upms\EmployeeHaftaRecovery::encrypt($snapshot, sodium_crypto_box_publickey($keys));
$decoded = App\Upms\EmployeeHaftaRecovery::decrypt($cipher, $keys);
if ($snapshot !== $decoded) {
    throw new RuntimeException('BACKUP_ROUNDTRIP_FAILED');
}
$reject = static function (callable $f) {
    try {
        $f();
    } catch (Throwable) {
        return true;
    } throw new RuntimeException('BAD_BACKUP_ACCEPTED');
};
$bad = $cipher;
$bad[100] = chr(ord($bad[100]) ^ 1);
$corrupt = $reject(fn () => App\Upms\EmployeeHaftaRecovery::decrypt($bad, $keys));
$wrong = $reject(fn () => App\Upms\EmployeeHaftaRecovery::decrypt($cipher, sodium_crypto_box_keypair()));
echo json_encode(['cipher' => base64_encode($cipher),'keyPair' => base64_encode($keys),'format' => App\Upms\EmployeeHaftaRecovery::FORMAT,'corruptCiphertextRejected' => $corrupt,'wrongRecipientRejected' => $wrong]);
sodium_memzero($keys);
