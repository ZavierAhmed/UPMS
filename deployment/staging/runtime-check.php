<?php

// Isolated CLI HTTP-kernel checks: database and SMTP disabled.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}
$backend = realpath($argv[1] ?? '');
if (!$backend || !is_file($backend.'/vendor/autoload.php')) {
    exit(1);
}
$runtime = realpath($argv[2] ?? '');
if (!$runtime || $runtime !== dirname($backend, 4).'/runtime' || (fileperms($runtime) & 0077)) {
    exit(1);
}$keyFile = $runtime.'/app-key';
if (is_link($keyFile) || !is_file($keyFile) || (fileperms($keyFile) & 0077)) {
    exit(1);
}$key = trim(file_get_contents($keyFile));
if (!preg_match('~^base64:[A-Za-z0-9+/]{43}=$~D', $key)) {
    exit(1);
}foreach (['APP_CONFIG_CACHE' => 'disabled-config.php','APP_ROUTES_CACHE' => 'disabled-routes.php','APP_EVENTS_CACHE' => 'disabled-events.php'] as $variable => $name) {
    if (file_exists($runtime.'/'.$name)) {
        exit(1);
    }putenv($variable.'='.$runtime.'/'.$name);
}
putenv('APP_SERVICES_CACHE='.$runtime.'/services.php');
putenv('APP_PACKAGES_CACHE='.$runtime.'/packages.php');
putenv('APP_ENV=production');
putenv('APP_DEBUG=false');
putenv('APP_KEY='.$key);
putenv('UPMS_ENABLED=false');
putenv('UPMS_PRODUCTION_PROFILE=');
putenv('UPMS_ENFORCE_HOST_BOUNDARY=true');
putenv('UPMS_ORIGIN=https://app.unique-plastic.com');
putenv('MAIL_MAILER=array');
require $backend.'/vendor/autoload.php';
$app = require $backend.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$checks = 0;
foreach ([['unique-plastic.com','/api/v1/management/session/csrf',404],['app.unique-plastic.com','/api/v1/public/inquiries',404],['unknown.invalid','/api/v1/management/session/csrf',404],['app.unique-plastic.com','/api/v1/management/session/csrf',503]] as [$host,$path,$expected]) {
    $request = Illuminate\Http\Request::create('https://'.$host.$path, 'GET', [], [], [], ['HTTPS' => 'on','HTTP_HOST' => $host,'HTTP_ORIGIN' => 'https://app.unique-plastic.com','HTTP_ACCEPT' => 'application/json']);
    $response = $kernel->handle($request);
    if ($response->getStatusCode() !== $expected) {
        throw new RuntimeException('DISABLED_RUNTIME_BOUNDARY_FAILED');
    }$checks++;
}
echo json_encode(['passed' => true,'checks' => $checks,'databaseConnected' => false,'smtpContacted' => false,'runtime' => 'DISABLED','webSapiProven' => false,'php' => PHP_VERSION,'memoryLimit' => ini_get('memory_limit'),'peakMemoryBytes' => memory_get_peak_usage(true)], JSON_THROW_ON_ERROR).PHP_EOL;
