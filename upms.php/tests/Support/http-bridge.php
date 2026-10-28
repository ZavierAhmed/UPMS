<?php

declare(strict_types=1);

// CLI-only test adapter. Executes the real Laravel HTTP kernel and middleware;
// never registered as a route or included in deployment roots.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../../vendor/autoload.php';
$directory = realpath(dirname(__DIR__, 3).'/tmp/php-runtime');
$envFile = realpath((string) getenv('UPMS_PHP2_ENV'));
if (!$directory || !$envFile || !str_starts_with($envFile, $directory.DIRECTORY_SEPARATOR)) {
    throw new RuntimeException('Isolated test environment required');
}
$app = require __DIR__.'/../../bootstrap/app.php';
$app->useEnvironmentPath(dirname($envFile));
$app->loadEnvironmentFrom(basename($envFile));
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$server = ['HTTPS' => 'on', 'HTTP_HOST' => 'app.unique-plastic.test', 'HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json'];
foreach ($input['headers'] ?? [] as $key => $value) {
    $server['HTTP_'.strtoupper(str_replace('-', '_', $key))] = $value;
}
$request = \Illuminate\Http\Request::create('https://app.unique-plastic.test'.$input['path'], $input['method'], [], $input['cookies'] ?? [], [], $server, $input['raw'] ?? null);
$response = $kernel->handle($request);
$cookies = [];
foreach ($response->headers->getCookies() as $cookie) {
    $cookies[$cookie->getName()] = $cookie->getValue();
}
echo json_encode(['status' => $response->getStatusCode(), 'raw' => $response->getContent(), 'cookies' => $cookies], JSON_THROW_ON_ERROR);
$kernel->terminate($request, $response);
