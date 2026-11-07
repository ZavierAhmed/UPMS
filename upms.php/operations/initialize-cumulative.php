<?php

declare(strict_types=1);

use App\Upms\CumulativeInitialization;
use App\Upms\CumulativeProduction;
use App\Upms\CleanInitialization;
use App\Upms\ProductionConnection;
use App\Upms\ProductionProfile;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit(1);
}
require dirname(__DIR__).'/vendor/autoload.php';

try {
    if ($argc !== 4) {
        throw new RuntimeException('CUMULATIVE_PRIVATE_PROFILES_REQUIRED');
    }
    $profiles = [];
    foreach (['installer','definer','runtime'] as $offset => $role) {
        $profiles[$role] = ProductionProfile::load($argv[$offset + 1], 'one-time-clean-initialization');
    }
    $approval = $profiles['installer'];
    if (($approval['cumulativeCleanApproved'] ?? false) !== true || !preg_match('/^(?:upms_v2|upms_stage_[0-9]+)$/D',$approval['schema'])
        || !isset($approval['receiptFile'], $approval['releaseSha'], $approval['targetHash'], $approval['releaseManifestSha256'])) {
        throw new RuntimeException('CUMULATIVE_PRIVATE_APPROVAL_REQUIRED');
    }
    App\Upms\ProductionRelease::verify($approval);
    foreach ($profiles as $profile) {
        if ($profile['schema'] !== $approval['schema'] || $profile['reference'] !== $approval['reference']
            || $profile['serverVersion'] !== $approval['serverVersion'] || $profile['serverId'] !== $approval['serverId']) {
            throw new RuntimeException('CUMULATIVE_PROFILE_MISMATCH');
        }
    }
    // The caller supplies private enrollment input over stdin, never argv.
    $passwords = json_decode(stream_get_contents(STDIN, 4096), true, 8, JSON_THROW_ON_ERROR);
    if (!is_array($passwords) || array_diff(array_keys($passwords), ['admin','haris'])) {
        throw new RuntimeException('CUMULATIVE_ENROLLMENT_INPUT_REJECTED');
    }
    $connections = array_map(fn($p)=>ProductionConnection::connect($p),$profiles);
    $scope = ['schema' => $approval['schema'], 'reference' => $approval['reference'],
            'release' => $approval['releaseSha'], 'targetHash' => $approval['targetHash'],
            'accounts' => array_map(fn ($p) => $p['account'], $profiles)];
    $hasReceipt = (int)$connections['installer']->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='upms_production_migrations'")->fetchColumn() === 1;
    $completed = $hasReceipt && $connections['installer']->query('SELECT state FROM upms_production_migrations WHERE id=1')->fetchColumn() === CumulativeProduction::READY;
    $result = $completed ? ['schema'=>$approval['schema'],'tables'=>47,'guards'=>133,'businessPostingEnabled'=>false] : CumulativeInitialization::initialize(
        $connections['installer'], $connections['definer'], $connections['runtime'], $scope,
        $approval['receiptFile'],
        $passwords
    );
    $evidence = CumulativeProduction::complete($connections['installer'],$connections['definer'],
        $scope,$approval['receiptFile'],$scope['accounts']);
    CleanInitialization::privateReceipt($approval['receiptFile'].'.ready',$evidence);
    $result['state'] = CumulativeProduction::READY;
    $result['productionStartupEnabled'] = true;
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    $code = preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D', $error->getMessage()) ?
        $error->getMessage() : 'CUMULATIVE_PRIVATE_INITIALIZATION_FAILED';
    fwrite(STDERR, $code.PHP_EOL);
    exit(1);
}
