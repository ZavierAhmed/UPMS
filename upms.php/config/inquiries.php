<?php

declare(strict_types=1);

$milliseconds = env('INQUIRY_TIMEOUT_MS');
$timeout = $milliseconds === null || $milliseconds === ''
    ? max(1, min(30, (int) env('INQUIRY_TIMEOUT_SECONDS', 15))) * 1000
    : max(1000, min(30000, (int) $milliseconds));

return [
    'origin' => env('INQUIRY_ORIGIN') ?: (env('INQUIRY_PUBLIC_ORIGIN') ?: env('PUBLIC_ORIGIN')),
    'storage' => env('INQUIRY_STORAGE') ?: storage_path('app/private/inquiries'),
    'rate_limit' => max(1, min(100, (int) env('INQUIRY_RATE_LIMIT', 5))),
    'timeout_ms' => $timeout,
    'php_binary' => env('INQUIRY_PHP_BINARY'),
    'mode' => env('INQUIRY_MODE', 'Disabled'),
    'development' => env('APP_ENV') === 'local' || env('APP_ENV') === 'testing',
    'smtp' => [
        'host' => env('INQUIRY_SMTP_HOST', env('SMTP_HOST')), 'port' => max(1, min(65535, (int) env('INQUIRY_SMTP_PORT', env('SMTP_PORT', 587)))),
        'tls' => env('INQUIRY_SMTP_TLS', env('SMTP_TLS_MODE', 'StartTls')),
        'username' => env('INQUIRY_SMTP_USERNAME', env('SMTP_USERNAME')), 'password' => env('INQUIRY_SMTP_PASSWORD', env('SMTP_PASSWORD')),
        'from' => env('INQUIRY_SMTP_FROM', env('SMTP_FROM')), 'recipient' => env('INQUIRY_SMTP_RECIPIENT', env('SMTP_RECIPIENT')),
        'cafile' => env('INQUIRY_SMTP_CAFILE'),
    ],
];
