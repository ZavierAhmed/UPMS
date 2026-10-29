<?php

declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require 'deployment/staging/support.php';
$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
try {
    UpmsStaging::readOnlyGrants($c['grants'], $c['schema']);
    echo json_encode(['accepted' => true]);
} catch (Throwable $e) {
    echo json_encode(['accepted' => false,'code' => $e->getMessage()]);
}
