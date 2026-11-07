<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404);exit(1); }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    if ($argc !== 3) { throw new RuntimeException('CUMULATIVE_ACTIVATION_PROFILES_REQUIRED'); }
    $maintenance=App\Upms\ProductionProfile::load($argv[1],'one-time-production-maintenance');
    $runtime=App\Upms\ProductionProfile::load($argv[2]);
    App\Upms\ProductionRelease::verify($runtime);
    if (($runtime['schemaContract']??'') !== App\Upms\CumulativeProduction::CONTRACT) {
        throw new RuntimeException('CUMULATIVE_CONTRACT_REQUIRED');
    }
    App\Upms\CumulativeProduction::activate(App\Upms\ProductionConnection::connect($maintenance),
        App\Upms\ProductionConnection::connect($runtime),$runtime);
    echo json_encode(['state'=>App\Upms\CumulativeProduction::ACTIVE,'verified'=>true],JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR,preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D',$error->getMessage())?$error->getMessage().PHP_EOL:"CUMULATIVE_ACTIVATION_FAILED\n");
    exit(1);
}
