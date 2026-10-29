<?php

// Private CLI metadata verification only. No application bootstrap, business queries or database writes.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$o = getopt('', ['profile:','library:']);
try {
    if (!is_string($o['profile'] ?? null)) {
        throw new RuntimeException('EXPLICIT_PRIVATE_METADATA_PROFILE_REQUIRED');
    }
    $library = $o['library'] ?? dirname(__DIR__, 2).'/upms.php/app/Upms';
    if (is_link($library) || !is_dir($library)) {
        throw new RuntimeException('REVIEWED_PRIVATE_LIBRARY_REQUIRED');
    }
    foreach (['ApiError','OperatorPolicy','ProductionConnection','ProductionProfile'] as $class) {
        require $library.'/'.$class.'.php';
    }
    $c = App\Upms\ProductionProfile::load($o['profile'], 'read-only-transport-verification');
    $pdo = App\Upms\ProductionConnection::connect($c);
    $pdo->exec('START TRANSACTION READ ONLY');
    $identity = $pdo->query('SELECT DATABASE() schema_name,CURRENT_USER() account,VERSION() version,@@server_id server_id,@@hostname server_hostname,@@socket advertised_socket')->fetch(PDO::FETCH_ASSOC);
    $ssl = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_ASSOC);
    $pdo->rollBack();
    echo json_encode(['passed' => true,'scope' => 'metadata-only','transport' => $c['transport'] ?? 'tls','driverTransport' => $pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS),'tlsCipherPresent' => !empty($ssl['Value']),'identity' => $identity,'businessRowsRead' => 0,'recordsChanged' => 0,'productionActivationApproved' => false], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    $code = preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'METADATA_CHECK_FAILED_PRIVATE_REVIEW_REQUIRED';
    echo json_encode(['passed' => false,'code' => $code,'recordsChanged' => 0,'credentialsPrinted' => false]).PHP_EOL;
    exit(1);
}
