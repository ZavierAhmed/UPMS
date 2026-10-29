<?php

// Private maintenance only. Not called by HTTP, application boot, Composer or packaging.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../vendor/autoload.php';
try {
    if ($argc !== 4 || $argv[2] !== '--approved-production-profile' || !in_array($argv[1], ['initialize','resume-reviewed','activate-reviewed'], true)) {
        throw new RuntimeException('EXPLICIT_CLEAN_OPERATION_REQUIRED');
    }
    $mode = $argv[1] === 'activate-reviewed' ? 'reviewed-clean-activation' : 'one-time-clean-initialization';
    $c = App\Upms\ProductionProfile::load($argv[3], $mode);
    $operation = ['initialize' => 'initialize-empty-schema','resume-reviewed' => 'resume-empty-clean-schema','activate-reviewed' => 'activate-clean-schema'][$argv[1]];
    $approval = App\Upms\MaintenanceApproval::read($c, $operation);
    $pdo = App\Upms\ProductionConnection::connect($c);
    if ($argv[1] === 'activate-reviewed') {
        $result = App\Upms\CleanInitialization::activate($pdo, $c['reference'], $approval['gates'] ?? []);
    } else {
        if (!is_string($c['receiptFile'] ?? null)) {
            throw new RuntimeException('PRIVATE_RECEIPT_REQUIRED');
        }$result = App\Upms\CleanInitialization::initialize($pdo, $c['reference'], $c['receiptFile'], $argv[1] === 'resume-reviewed');
    }
    echo json_encode(['completed' => true,'result' => $result,'credentialsPrinted' => false], JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    $code = preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'CLEAN_OPERATION_FAILED_PRIVATE_REVIEW_REQUIRED';
    fwrite(STDERR, json_encode(['completed' => false,'code' => $code,'credentialsPrinted' => false]).PHP_EOL);
    exit(1);
}
