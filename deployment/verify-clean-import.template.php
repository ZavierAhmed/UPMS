<?php

// CLI-only import package verifier / finalizer; no application startup or HTTP route.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$o = getopt('', ['profile:','backend:','preflight','accounts']);
$stage = 'bootstrap';
try {
    if (!is_string($o['backend'] ?? null) || !is_string($o['profile'] ?? null)) {
        throw new RuntimeException('EXPLICIT_PRIVATE_BACKEND_AND_PROFILE_REQUIRED');
    }
    $backend = realpath($o['backend']);
    if (!$backend || is_link($o['backend']) || !is_file($backend.'/vendor/autoload.php')) {
        throw new RuntimeException('PRIVATE_BACKEND_REQUIRED');
    }require $backend.'/vendor/autoload.php';
    $finalize = basename(__FILE__) === 'finalize-clean-import.php';
    $mode = $finalize ? 'one-time-sql-import-finalization' : 'read-only-transport-verification';
    $stage = 'profile';
    $c = App\Upms\ProductionProfile::load($o['profile'], $mode);
    foreach (['publicRoot','managementRoot'] as $webKey) {
        $web = realpath($c[$webKey] ?? '');
        if (!$web || $backend === $web || str_starts_with($backend, $web.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('PRIVATE_BACKEND_BOUNDARY_REJECTED');
        }
    }
    $private = realpath($c['privateRoot'] ?? '');
    if (!$private || !str_starts_with($backend, $private.DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('PRIVATE_BACKEND_BOUNDARY_REJECTED');
    }
    $toolDirectory = realpath(__DIR__);
    if (!$toolDirectory || !str_starts_with($toolDirectory, $private.DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('PRIVATE_IMPORT_TOOLS_BOUNDARY_REJECTED');
    }
    $package = App\Upms\CleanSqlImport::package(__DIR__);
    if ($finalize || isset($o['preflight'])) {
        $approval = App\Upms\MaintenanceApproval::read($c, $finalize ? 'finalize-clean-sql-import' : 'import-clean-sql');
        if (($approval['sqlSha256'] ?? null) !== $package['sqlSha256'] || ($approval['manifestSha256'] ?? null) !== hash_file('sha256', __DIR__.'/upms-production-clean-manifest.json')) {
            throw new RuntimeException('SIGNED_OFF_SQL_DIGEST_REQUIRED');
        }
    }
    $pdo = App\Upms\ProductionConnection::connect($c, static function ($s) use (&$stage) {
        $stage = $s;
    });
    if ($finalize) {
        if (!is_string($c['receiptFile'] ?? null) || $c['receiptFile'] === '') {
            throw new RuntimeException('PRIVATE_RECEIPT_REQUIRED');
        }$result = App\Upms\CleanSqlImport::finalize($pdo, $c['reference'], $c['receiptFile'], $approval['sqlSha256'], $approval['legacyRecoveryWaiver'] ?? null);
    } else {
        $pdo->exec('START TRANSACTION READ ONLY');
        $result = isset($o['preflight']) ? App\Upms\CleanSqlImport::preflight($pdo) : (isset($o['accounts']) ? App\Upms\CleanSqlImport::accounts($pdo, $c['reference']) : App\Upms\CleanSqlImport::verify($pdo));
        $pdo->rollBack();
    }
    echo json_encode(['passed' => true,'result' => $result,'activationApproved' => false,'credentialsPrinted' => false], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    $failure = class_exists(App\Upms\DiagnosticFailure::class) ? App\Upms\DiagnosticFailure::describe($e, $stage) : ['code' => 'IMPORT_TOOL_BOOTSTRAP_FAILED','category' => 'configuration','stage' => $stage];
    if ($e instanceof RuntimeException && preg_match('/^[A-Z_]+$/D', $e->getMessage())) {
        $failure['code'] = $e->getMessage();
    }echo json_encode(['passed' => false,'failure' => $failure,'credentialsPrinted' => false], JSON_PRETTY_PRINT).PHP_EOL;
    exit(1);
}
