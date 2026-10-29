<?php

// TEMPLATE ONLY: replace this absolute private backend path after verified layout review.
declare(strict_types=1);
if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'unique-plastic.com' || ($_SERVER['HTTPS'] ?? '') !== 'on' || parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) !== '/api/v1/public/inquiries') {
    http_response_code(404);
    exit;
}
$backend = '/REPLACE_WITH_VERIFIED_PRIVATE_PATH/backend';
if (!is_file($backend.'/public/index.php')) {
    http_response_code(503);
    exit;
}
require $backend.'/public/index.php';
