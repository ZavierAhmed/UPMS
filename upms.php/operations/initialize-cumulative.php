<?php

declare(strict_types=1);

use App\Upms\CumulativeInitialization;
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
    if (($approval['cumulativeCleanApproved'] ?? false) !== true || $approval['schema'] !== 'upms_v2'
        || !isset($approval['receiptFile'], $approval['releaseSha'], $approval['targetHash'], $approval['releaseManifestSha256'])) {
        throw new RuntimeException('CUMULATIVE_PRIVATE_APPROVAL_REQUIRED');
    }
    $manifestPath = dirname(__DIR__, 3).'/RELEASE.json';
    if (!is_file($manifestPath) || is_link($manifestPath)
        || hash_file('sha256', $manifestPath) !== $approval['releaseManifestSha256']) {
        throw new RuntimeException('CUMULATIVE_RELEASE_MANIFEST_REJECTED');
    }
    $manifest = json_decode(file_get_contents($manifestPath), true, 64, JSON_THROW_ON_ERROR);
    if (($manifest['sourceCommit'] ?? null) !== $approval['releaseSha']) {
        throw new RuntimeException('CUMULATIVE_RELEASE_SOURCE_REJECTED');
    }
    foreach (['app/Upms/CumulativeInitialization.php','operations/initialize-cumulative.php',
        'resources/cumulative-clean-schema.json'] as $relative) {
        if (hash_file('sha256', dirname(__DIR__).'/'.$relative) !== ($manifest['files']['private/backend/'.$relative] ?? null)) {
            throw new RuntimeException('CUMULATIVE_RELEASE_FILE_REJECTED');
        }
    }
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
    $result = CumulativeInitialization::initialize(
        ProductionConnection::connect($profiles['installer']),
        ProductionConnection::connect($profiles['definer']),
        ProductionConnection::connect($profiles['runtime']),
        ['schema' => $approval['schema'], 'reference' => $approval['reference'],
            'release' => $approval['releaseSha'], 'targetHash' => $approval['targetHash'],
            'accounts' => array_map(fn ($p) => $p['account'], $profiles)],
        $approval['receiptFile'],
        $passwords
    );
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    $code = preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D', $error->getMessage()) ?
        $error->getMessage() : 'CUMULATIVE_PRIVATE_INITIALIZATION_FAILED';
    fwrite(STDERR, $code.PHP_EOL);
    exit(1);
}
