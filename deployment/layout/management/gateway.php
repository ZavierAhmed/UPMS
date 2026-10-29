<?php

// TEMPLATE ONLY: replace this absolute private backend path after verified layout review.
declare(strict_types=1);
if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'app.unique-plastic.com' || ($_SERVER['HTTPS'] ?? '') !== 'on' || !preg_match('~^/api/v1/management(?:/|$)~', parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '')) {
    http_response_code(404);
    exit;
}
$backend = '/REPLACE_WITH_VERIFIED_PRIVATE_PATH/backend';
if (!is_file($backend.'/public/index.php')) {
    http_response_code(503);
    exit;
}
require $backend.'/public/index.php';
