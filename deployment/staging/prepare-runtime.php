<?php

// Explicit owner action after destination review: private runtime files only, no DB/network.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}
require __DIR__.'/support.php';
$o = getopt('', ['plan:']);
try {
    $plan = $o['plan'] ?? '';
    if (!is_file($plan) || is_link($plan) || (fileperms($plan) & 0077)) {
        throw new RuntimeException('PRIVATE_PLAN_REQUIRED');
    }$c = json_decode(file_get_contents($plan), true, 32, JSON_THROW_ON_ERROR);
    $paths = UpmsStaging::layout($c);
    if (!UpmsStaging::within(realpath($plan), $paths['stagingRoot'])) {
        throw new RuntimeException('PRIVATE_PLAN_PATH_REQUIRED');
    }
    $runtime = $paths['stagingRoot'].'/runtime';
    if (is_link($runtime)) {
        throw new RuntimeException('RUNTIME_SYMLINK_REJECTED');
    }if (!is_dir($runtime) && !mkdir($runtime, 0700)) {
        throw new RuntimeException('PRIVATE_RUNTIME_CREATE_FAILED');
    }if (realpath($runtime) !== $runtime || (fileperms($runtime) & 0077)) {
        throw new RuntimeException('PRIVATE_RUNTIME_MODE_REQUIRED');
    }
    $key = $runtime.'/app-key';
    if (is_link($key)) {
        throw new RuntimeException('PRIVATE_KEY_PATH_REJECTED');
    }$created = false;
    if (!file_exists($key)) {
        $f = fopen($key, 'xb');
        if (!$f) {
            throw new RuntimeException('EXCLUSIVE_KEY_CREATE_REQUIRED');
        }chmod($key, 0600);
        $bytes = 'base64:'.base64_encode(random_bytes(32));
        try {
            if (fwrite($f, $bytes) !== strlen($bytes) || !fflush($f) || !fsync($f)) {
                throw new RuntimeException('PRIVATE_KEY_DURABILITY_FAILED');
            }
        } finally {
            fclose($f);
        }$created = true;
    }
    if ((fileperms($key) & 0077) || !preg_match('~^base64:[A-Za-z0-9+/]{43}=$~D', trim(file_get_contents($key)))) {
        throw new RuntimeException('PRIVATE_KEY_REVIEW_REQUIRED');
    }
    echo json_encode(['prepared' => true,'keyCreated' => $created,'credentialsPrinted' => false,'runtimeEnabled' => false,'databaseContacted' => false], JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    echo json_encode(['prepared' => false,'code' => $e instanceof RuntimeException && preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'PRIVATE_RUNTIME_FAILED','credentialsPrinted' => false]).PHP_EOL;
    exit(1);
}
