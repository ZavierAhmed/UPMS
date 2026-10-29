<?php

// Private Linux staging smoke test only, with database access disabled.
declare(strict_types=1);
$root = realpath($argv[1] ?? '');
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux' || !$root || !str_starts_with($root, getenv('HOME').'/.cache/upms-php81-local/release-')) {
    exit(1);
}
$backend = $root.'/private/backend';
putenv('APP_ENV=production');
putenv('APP_DEBUG=false');
putenv('APP_KEY=base64:'.base64_encode(random_bytes(32)));
putenv('UPMS_ENABLED=false');
putenv('UPMS_PRODUCTION_PROFILE=');
putenv('UPMS_ENFORCE_HOST_BOUNDARY=true');
putenv('UPMS_ORIGIN=https://app.unique-plastic.com');
require $backend.'/vendor/autoload.php';
$app = require $backend.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$checks = 0;
foreach ([['unique-plastic.com','/api/v1/management/session/csrf',404],['app.unique-plastic.com','/api/v1/public/inquiries',404],['evil.example','/api/v1/management/session/csrf',404],['app.unique-plastic.com','/api/v1/management/session/csrf',503]] as [$host,$path,$expected]) {
    $request = Illuminate\Http\Request::create('https://'.$host.$path, 'GET', [], [], [], ['HTTPS' => 'on','HTTP_HOST' => $host,'HTTP_ORIGIN' => 'https://app.unique-plastic.com','HTTP_ACCEPT' => 'application/json']);
    $response = $kernel->handle($request);
    if ($response->getStatusCode() !== $expected) {
        throw new RuntimeException('LINUX_RUNTIME_BOUNDARY_FAILED');
    }$checks++;
}
foreach (glob($backend.'/bootstrap/cache/*.php') as $file) {
    unlink($file);
}
$result = ['passed' => true,'checks' => $checks,'linuxNoDevRuntime' => true,'databaseEnabled' => false,'smtpContacted' => false,'memoryLimit' => ini_get('memory_limit'),'peakMemoryBytes' => memory_get_peak_usage(true),'productionContacted' => false];
if ($result['peakMemoryBytes'] >= 128 * 1024 * 1024) {
    throw new RuntimeException('MEMORY_LIMIT_EXCEEDED');
}file_put_contents('tmp/php-runtime/php82-linux-runtime.json', json_encode($result, JSON_PRETTY_PRINT));
echo json_encode($result).PHP_EOL;
