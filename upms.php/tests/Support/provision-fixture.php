<?php

// CLI-only synthetic fixture adapter; never include in a deployment payload.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../../vendor/autoload.php';
$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (($c['host'] ?? '') !== '127.0.0.1' || ($c['port'] ?? 0) !== 3330 || !preg_match('/^upms_test_php_6_dual_[0-9]+$/D', $c['schema'] ?? '')) {
    throw new RuntimeException('SYNTHETIC_ONLY');
}
$pdo = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false]);
if (!preg_match('/^10\.11\.19-MariaDB/', $pdo->query('SELECT VERSION()')->fetchColumn())) {
    throw new RuntimeException('SYNTHETIC_ENGINE_ONLY');
}
try {
    echo json_encode(App\Upms\AdminProvisioning::apply($pdo, $c['reference'], $c['passwords']), JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    echo json_encode(['error' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'FAILED']);
    exit(1);
}
