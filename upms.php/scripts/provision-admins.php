<?php

declare(strict_types=1);

// Private CLI only. No environment-database fallback and no production defaults.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../vendor/autoload.php';
$writePrivate = static function ($stream, array $data, string $code): void {
    try {
        $bytes = json_encode($data, JSON_THROW_ON_ERROR);
        if (fwrite($stream, $bytes) !== strlen($bytes) || !fflush($stream) || !function_exists('fsync') || !fsync($stream)) {
            throw new RuntimeException($code);
        }
    } finally {
        fclose($stream);
    }
};
try {
    if ($argc !== 3 || $argv[1] !== '--approved-production-profile') {
        throw new RuntimeException('EXPLICIT_PRODUCTION_MODE_REQUIRED');
    }
    $path = realpath($argv[2]);
    $c = App\Upms\ProductionProfile::load($argv[2], 'one-time-production-maintenance');
    if (!is_string($c['credentialsFile'] ?? null) || !is_string($c['approvalFile'] ?? null)) {
        throw new RuntimeException('PRIVATE_HANDOFF_REQUIRED');
    }
    App\Upms\MaintenanceApproval::read($c, 'provision-clean-administrators');
    $pdo = App\Upms\ProductionConnection::connect($c);
    App\Upms\CleanInitialization::provisionable($pdo, $c['reference']);
    // Prepared credentials survive a crash; they are never regenerated on a retry.
    if (is_file($c['credentialsFile'])) {
        $credentials = json_decode(file_get_contents($c['credentialsFile']), true, 16, JSON_THROW_ON_ERROR);
        if (($credentials['reference'] ?? '') !== $c['reference']) {
            throw new RuntimeException('CREDENTIAL_RECEIPT_CONFLICT');
        }
        foreach (['admin', 'haris'] as $name) {
            if (!is_string($credentials[$name] ?? null) || strlen($credentials[$name]) < 24 || strlen($credentials[$name]) > 128) {
                throw new RuntimeException('CREDENTIAL_RECEIPT_CONFLICT');
            }
        }
    } else {
        $credentials = ['reference' => $c['reference'],'admin' => rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='),'haris' => rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=')];
        $stream = fopen($c['credentialsFile'], 'xb');
        if (!$stream) {
            throw new RuntimeException('PRIVATE_HANDOFF_REQUIRED');
        } chmod($c['credentialsFile'], 0600);
        $writePrivate($stream, $credentials, 'PRIVATE_CREDENTIAL_WRITE_FAILED');
    }
    $result = App\Upms\AdminProvisioning::apply($pdo, $c['reference'], $credentials);
    // Generated candidates are only valid for accounts created by this receipt.
    // Existing account hashes are preserved; their generated candidates must never be used.
    $handoff = ['reference' => $c['reference'], 'users' => $result['users'], 'created' => $result['created'], 'existingAccountsKeepCurrentPassword' => array_values(array_diff(['admin', 'haris'], $result['created']))];
    foreach ($result['created'] as $name) {
        $handoff[$name] = $credentials[$name];
    }
    $handoffPath = $c['credentialsFile'].'.handoff';
    if (file_exists($handoffPath)) {
        if (json_decode(file_get_contents($handoffPath), true, 16, JSON_THROW_ON_ERROR) !== $handoff) {
            throw new RuntimeException('PRIVATE_HANDOFF_CONFLICT_RECEIPT_COMMITTED');
        }
    } else {
        $stream = fopen($handoffPath, 'xb');
        if (!$stream) {
            throw new RuntimeException('PRIVATE_HANDOFF_REQUIRED');
        }
        chmod($handoffPath, 0600);
        $writePrivate($stream, $handoff, 'PRIVATE_HANDOFF_WRITE_FAILED_RECEIPT_COMMITTED');
    }
    App\Upms\CleanInitialization::bind($pdo, $result['users'], $c['reference']);
    $c['enabled'] = false;
    unset($c['password']);
    $temp = $path.'.disabled-pending';
    if (file_exists($temp)) {
        throw new RuntimeException('DISABLE_MAINTENANCE_MANUALLY_RECEIPT_COMMITTED');
    }$f = fopen($temp, 'xb');
    chmod($temp, 0600);
    $writePrivate($f, $c, 'DISABLE_MAINTENANCE_MANUALLY_RECEIPT_COMMITTED');
    if (!rename($temp, $path)) {
        throw new RuntimeException('DISABLE_MAINTENANCE_MANUALLY_RECEIPT_COMMITTED');
    }
    echo json_encode(['completed' => true,'users' => $result['users'],'changed' => $result['changed'],'credentialsPrinted' => false,'maintenanceDisabled' => true]).PHP_EOL;
} catch (Throwable $error) {
    $code = preg_match('/^[A-Z_]+$/D', $error->getMessage()) ? $error->getMessage() : 'PROVISIONING_FAILED_PRIVATE_REVIEW_REQUIRED';
    fwrite(STDERR, json_encode(['completed' => false,'code' => $code,'credentialsPrinted' => false]).PHP_EOL);
    exit(1);
}
