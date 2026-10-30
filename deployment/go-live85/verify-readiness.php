<?php

// Owner-executable read-only readiness report. Not activation.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
require __DIR__.'/readiness-support.php';
try {
    $r = readiness85($s);
    file_put_contents($s.'/runtime/readiness85.json', json_encode($r, JSON_PRETTY_PRINT));
    chmod($s.'/runtime/readiness85.json', 0600);
    echo json_encode($r, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'READINESS_FAILED','native' => $e instanceof PDOException ? ($e->errorInfo[1] ?? null) : null])."\n";
    exit(1);
}
