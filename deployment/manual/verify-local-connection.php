<?php

// Private CLI metadata-only recheck. Never publish this file through a web server.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$o = getopt('', ['profile:','library:','diagnose']);
$stage = 'library_loading';
try {
    // BEGIN LIBRARY LOADER (replaced by the standalone bundle generator)
    $library = $o['library'] ?? dirname(__DIR__, 2).'/upms.php/app/Upms';
    foreach (['ApiError','DiagnosticFailure','OperatorPolicy','ProductionConnection','ProductionProfile'] as $class) {
        if (!is_file($library.'/'.$class.'.php') || !is_readable($library.'/'.$class.'.php')) {
            throw new RuntimeException('DIAGNOSTIC_LIBRARY_UNAVAILABLE');
        }require $library.'/'.$class.'.php';
    }
    // END LIBRARY LOADER
    $stage = 'pdo_capabilities';
    if (!extension_loaded('pdo_mysql')) {
        throw new App\Upms\ApiError(503, 'PDO_MYSQL_EXTENSION_UNAVAILABLE');
    }
    $stage = 'profile_loading';
    if (!is_string($o['profile'] ?? null)) {
        throw new App\Upms\ApiError(503, 'EXPLICIT_PRIVATE_METADATA_PROFILE_REQUIRED');
    }
    $c = App\Upms\ProductionProfile::load($o['profile'], 'read-only-transport-verification');
    $tool = realpath(__FILE__);
    $private = realpath($c['privateRoot']);
    if (!$tool || !$private || !str_starts_with($tool, $private.DIRECTORY_SEPARATOR)) {
        throw new App\Upms\ApiError(503, 'PRODUCTION_DIAGNOSTIC_PATH_REJECTED');
    }
    $pdo = App\Upms\ProductionConnection::connect($c, static function (string $s) use (&$stage) {
        $stage = $s;
    });
    $stage = 'read_only_transaction';
    $pdo->exec('START TRANSACTION READ ONLY');
    $identity = $pdo->query('SELECT DATABASE() schema_name,CURRENT_USER() account,VERSION() version,@@server_id server_id,@@hostname server_hostname,@@socket advertised_socket')->fetch(PDO::FETCH_ASSOC);
    $ssl = $pdo->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_ASSOC);
    $pdo->rollBack();
    $stage = 'pdo_transport';
    $driver = $pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS);
    echo json_encode(['passed' => true,'scope' => 'metadata-only','transport' => $c['transport'] ?? 'tls','driverTransport' => $driver,'tlsCipherPresent' => !empty($ssl['Value']),'identity' => $identity,'businessRowsRead' => 0,'recordsChanged' => 0,'productionActivationApproved' => false], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    $failure = class_exists(App\Upms\DiagnosticFailure::class) ? App\Upms\DiagnosticFailure::describe($e, $stage) : ['code' => 'DIAGNOSTIC_LIBRARY_UNAVAILABLE','category' => 'diagnostic_installation','stage' => $stage];
    $r = ['passed' => false,'code' => $failure['code'],'category' => $failure['category'],'stage' => $failure['stage'],'recordsChanged' => 0,'credentialsPrinted' => false];
    if (isset($o['diagnose'])) {
        $r['diagnosis'] = $failure;
    }echo json_encode($r, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
    exit(1);
}
