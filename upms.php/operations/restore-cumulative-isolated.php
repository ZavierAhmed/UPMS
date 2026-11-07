<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404);exit(1); }
require dirname(__DIR__).'/vendor/autoload.php';
$pair=null;
try {
    if ($argc!==5) {
        throw new RuntimeException('CUMULATIVE_RESTORE_INPUT_REQUIRED');
    }
    $installer=App\Upms\ProductionProfile::load($argv[1],'one-time-production-maintenance');
    $definer=App\Upms\ProductionProfile::load($argv[2],'one-time-production-maintenance');
    $runtime=App\Upms\ProductionProfile::load($argv[4],'one-time-production-maintenance');
    App\Upms\ProductionRelease::verify($installer);
    if (!is_file($argv[3]) || is_link($argv[3])) { throw new RuntimeException('CUMULATIVE_RESTORE_ARCHIVE_REQUIRED'); }
    if (!preg_match('/^[a-f0-9]{64}$/D',$installer['restoreArchiveSha256']??'')
        || !hash_equals($installer['restoreArchiveSha256'],hash_file('sha256',$argv[3]))) {
        throw new RuntimeException('CUMULATIVE_RESTORE_ARCHIVE_CHECKSUM_REJECTED');
    }
    $pair=base64_decode(trim(stream_get_contents(STDIN,512)),true);
    if ($pair===false || strlen($pair)!==SODIUM_CRYPTO_BOX_KEYPAIRBYTES) {
        throw new RuntimeException('CUMULATIVE_RESTORE_RECIPIENT_REQUIRED');
    }
    $snapshot=App\Upms\ProductionRecoveryV2::decrypt(file_get_contents($argv[3]),$pair);
    $runtimePdo=App\Upms\ProductionConnection::connect($runtime);
    App\Upms\ChequeExtras::runtimePrivileges($runtimePdo);
    $installerPdo=App\Upms\ProductionConnection::connect($installer);
    if (App\Upms\CleanInitialization::target($runtimePdo)!==App\Upms\CleanInitialization::target($installerPdo)) {
        throw new RuntimeException('CUMULATIVE_RESTORE_RUNTIME_TARGET_REJECTED');
    }
    $result=App\Upms\ProductionRecoveryV2::restoreIsolated(
        $installerPdo,App\Upms\ProductionConnection::connect($definer),
        $snapshot,['installer'=>$installer['account'],'definer'=>$definer['account'],'runtime'=>$runtime['account']]);
    echo json_encode($result,JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR,preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D',$error->getMessage())?$error->getMessage().PHP_EOL:"CUMULATIVE_RESTORE_FAILED\n");
    exit(1);
} finally {
    if (is_string($pair)) { sodium_memzero($pair); }
}
