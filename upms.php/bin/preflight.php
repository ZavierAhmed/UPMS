<?php

declare(strict_types=1);

// CLI only. Never copy this file to a web document root.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$extensions = ['ctype', 'curl', 'dom', 'fileinfo', 'filter', 'hash', 'mbstring', 'openssl', 'pcre', 'PDO', 'pdo_mysql', 'session', 'sodium', 'tokenizer', 'xml'];
$missing = array_values(array_filter($extensions, fn ($name) => !extension_loaded($name)));
$result = [
    'php' => PHP_VERSION,
    'phpSupported' => version_compare(PHP_VERSION, '8.3.0', '>='),
    'missingExtensions' => $missing,
    'argon2id' => in_array('argon2id', password_algos(), true),
    'memoryLimit' => ini_get('memory_limit'),
    'maxExecutionTime' => ini_get('max_execution_time'),
    'storageWritable' => is_writable(__DIR__.'/../storage'),
    'cacheWritable' => is_writable(__DIR__.'/../bootstrap/cache'),
    'vendorPresent' => is_file(__DIR__.'/../vendor/autoload.php'),
    'databaseContacted' => false,
];
echo json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
exit($result['phpSupported'] && !$missing && $result['argon2id'] && $result['storageWritable'] && $result['cacheWritable'] && $result['vendorPresent'] ? 0 : 1);
