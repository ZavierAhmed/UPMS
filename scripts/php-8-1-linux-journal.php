<?php

// Real Linux multi-process journal test. Synthetic fixtures only; no SMTP or database connection.
declare(strict_types=1);
$release = realpath($argv[1] ?? '');
$journal = $argv[2] ?? '';
$base = getenv('HOME').'/.cache/upms-php81-local/';
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux' || !$release || !str_starts_with($release, $base.'release-') || !str_starts_with($journal, $base.'journal-fixture-')) {
    exit(1);
}
require $release.'/private/backend/vendor/autoload.php';
$app = require $release.'/private/backend/bootstrap/app.php';
$input = ['customerName' => 'Synthetic journal customer','companyName' => 'Synthetic fixture','email' => 'customer@example.invalid','phone' => '+923001234567','productCategory' => 'cans','quantity' => '100','capacity' => '1 litre','message' => 'Synthetic private Linux journal test'];
$key = '123e4567-e89b-42d3-a456-426614174000';
if (($argv[3] ?? '') === 'worker') {
    $store = new App\Upms\InquiryStore($journal);
    $result = $store->submit($key, $input, 5000, fn ($ref) => (new App\Upms\InquiryDelivery())->send(['mode' => 'DevelopmentFile','development' => true,'storage' => $journal], $input, $ref));
    echo json_encode($result);
    exit;
}
if (!is_file($release.'/private/backend/scripts/inquiry-mail.php')) {
    throw new RuntimeException('PRIVATE_MAIL_WORKER_MISSING');
}
mkdir($journal, 0700);
$children = [];
for ($i = 0;$i < 8;$i++) {
    $pipes = [];
    $p = proc_open([PHP_BINARY,__FILE__,$release,$journal,'worker'], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes);
    if (!is_resource($p)) {
        throw new RuntimeException('WORKER_LAUNCH_FAILED');
    }fclose($pipes[0]);
    $children[] = [$p,$pipes];
}
$refs = [];
foreach ($children as [$p,$pipes]) {
    $r = json_decode(stream_get_contents($pipes[1]), true, 16, JSON_THROW_ON_ERROR);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($p);
    if ($exit !== 0 || ($r['outcome'] ?? '') !== 'DevelopmentSaved') {
        throw new RuntimeException('LINUX_JOURNAL_WORKER_FAILED');
    }$refs[] = $r['reference'];
}
if (count(array_unique($refs)) !== 1 || count(glob($journal.'/outbox/*.txt')) !== 1) {
    throw new RuntimeException('DUPLICATE_HANDOFF');
}
$store = new App\Upms\InquiryStore($journal);
$different = $input;
$different['message'] .= ' changed';
if (($store->submit($key, $different, 5000, fn () => throw new RuntimeException('REDELIVERY'))['error'] ?? '') !== 'idempotency_conflict') {
    throw new RuntimeException('REPLAY_CONFLICT_NOT_REJECTED');
}
$count = 0;
$send = function () use (&$count) {
    $count++;
    return 'Unknown';
};
$a = $store->submit('unknown-key', $input, 1000, $send);
$b = $store->submit('unknown-key', $input, 1000, $send);
if ($count !== 1 || $a !== $b || $b['outcome'] !== 'Unknown') {
    throw new RuntimeException('UNKNOWN_DELIVERY_REPLAYED');
}
$result = ['passed' => true,'workers' => 8,'handoffs' => 1,'crossProcessJournal' => true,'uncertainDeliveryNoResend' => true,'privateMailWorkerIncluded' => true,'memoryLimit' => ini_get('memory_limit'),'peakMemoryBytes' => memory_get_peak_usage(true),'smtpContacted' => false,'productionContacted' => false];
file_put_contents('tmp/php-runtime/php81-linux-journal.json',json_encode($result,JSON_PRETTY_PRINT));
echo json_encode($result).PHP_EOL;
