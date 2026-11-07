<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404);exit(1); }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    if ($argc !== 4) { throw new RuntimeException('CUMULATIVE_BACKUP_PROFILES_REQUIRED'); }
    $reader=App\Upms\ProductionProfile::load($argv[1],'cumulative-recovery-verification');
    $definer=App\Upms\ProductionProfile::load($argv[2],'cumulative-recovery-verification');
    $runtime=App\Upms\ProductionProfile::load($argv[3]);
    App\Upms\ProductionRelease::verify($runtime);
    $pdo=App\Upms\ProductionConnection::connect($runtime);
    App\Upms\CumulativeProduction::runtime($pdo,$runtime);
    $proof=App\Upms\CumulativeProduction::privateEvidence($runtime,'cumulativeEvidence');
    $a=App\Upms\ProductionConnection::connect($reader);
    $b=App\Upms\ProductionConnection::connect($definer);
    if (App\Upms\CleanInitialization::target($a)!==App\Upms\CleanInitialization::target($pdo)
        || App\Upms\CleanInitialization::target($b)!==App\Upms\CleanInitialization::target($pdo)
        || $a->query('SELECT CURRENT_USER()')->fetchColumn()!==$proof['accounts']['installer']) {
        throw new RuntimeException('CUMULATIVE_BACKUP_TARGET_REJECTED');
    }
    $key=base64_decode(trim(stream_get_contents(STDIN,128)),true);
    if ($key===false || strlen($key)!==SODIUM_CRYPTO_BOX_PUBLICKEYBYTES) {
        throw new RuntimeException('CUMULATIVE_BACKUP_RECIPIENT_REJECTED');
    }
    $cipher=App\Upms\ProductionRecoveryV2::encrypt(App\Upms\ProductionRecoveryV2::capture($a,$b,$proof['accounts']),$key);
    if (fwrite(STDOUT,$cipher)!==strlen($cipher)) { throw new RuntimeException('CUMULATIVE_BACKUP_WRITE_FAILED'); }
    fwrite(STDERR,json_encode(['format'=>App\Upms\ProductionRecoveryV2::FORMAT,'sha256'=>hash('sha256',$cipher),
        'targetHash'=>App\Upms\CleanInitialization::target($pdo),'release'=>$runtime['releaseSha'],
        'reference'=>$runtime['reference'],'tables'=>47,'guards'=>133],JSON_THROW_ON_ERROR).PHP_EOL);
} catch (Throwable $error) {
    fwrite(STDERR,preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D',$error->getMessage())?$error->getMessage().PHP_EOL:"CUMULATIVE_BACKUP_FAILED\n");
    exit(1);
}
