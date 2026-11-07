<?php
declare(strict_types=1);

// Isolated HTTP fixture only. TLS metadata is accepted from its authenticated local gateway.
$directory=getenv('P42C_DIRECTORY');
if (PHP_SAPI!=='cli-server' || PHP_OS_FAMILY!=='Linux'
    || !str_starts_with(realpath($directory),getenv('HOME').'/.cache/upms-php81-local/p42c-')) {
    http_response_code(404);exit;
}
$fixture=json_decode(file_get_contents($directory.'/fixture.json'),true,32,JSON_THROW_ON_ERROR);
if ($_SERVER['REMOTE_ADDR']!=='127.0.0.1'
    || !hash_equals($fixture['tlsProof'],$_SERVER['HTTP_X_P42C_TLS_PROOF']??'')) {
    http_response_code(403);exit;
}
unset($_SERVER['HTTP_X_P42C_TLS_PROOF']);
$_SERVER['HTTPS']='on';
$_SERVER['SERVER_PORT']='443';
$package=getenv('P42C_PACKAGE');
$backend=$package?$package.'/private/backend':dirname(__DIR__,2);
require $backend.'/vendor/autoload.php';
$app=require $backend.'/bootstrap/app.php';
$app->useEnvironmentPath($directory);
$app->loadEnvironmentFrom('runtime.env');
$app->handleRequest(Illuminate\Http\Request::capture());
