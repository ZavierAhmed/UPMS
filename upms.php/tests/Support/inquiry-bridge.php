<?php

declare(strict_types=1);
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../../vendor/autoload.php';
$p = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$root = realpath(dirname(__DIR__, 3).'/tmp/php-runtime');
$env = realpath((string) getenv('UPMS_PHP7_ENV'));
if (! $root || ! $env || ! str_starts_with($env, $root.DIRECTORY_SEPARATOR)) {
    throw new RuntimeException('Private test environment required');
}
$app = require __DIR__.'/../../bootstrap/app.php';
$app->useEnvironmentPath(dirname($env));
$app->loadEnvironmentFrom(basename($env));
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
$app['config']->set('inquiries', $p['config']);
$server = ['HTTPS' => 'on', 'HTTP_HOST' => 'public.unique-plastic.test', 'CONTENT_TYPE' => 'application/json', 'REMOTE_ADDR' => $p['ip'] ?? '127.0.0.1'];
foreach ($p['headers'] ?? [] as $k => $v) {
    $server[strtolower($k) === 'content-type' ? 'CONTENT_TYPE' : (strtolower($k) === 'content-length' ? 'CONTENT_LENGTH' : 'HTTP_'.strtoupper(str_replace('-', '_', $k)))] = $v;
}
$r = Request::create('https://public.unique-plastic.test'.($p['path'] ?? '/api/v1/public/inquiries'), $p['method'] ?? 'POST', [], $p['cookies'] ?? [], [], $server, $p['raw'] ?? '{}');
$response = $kernel->handle($r);
echo json_encode(['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true), 'headers' => $response->headers->all(), 'cookies' => count($response->headers->getCookies())], JSON_THROW_ON_ERROR);
$kernel->terminate($r, $response);
