<?php
declare(strict_types=1);
// No migrations or provisioning. Private backend location is a reviewed server setting.
$configured=getenv('UPMS_PRIVATE_BACKEND');
$backend=is_string($configured)&&$configured!==''?realpath($configured):false;
$web=realpath($_SERVER['DOCUMENT_ROOT']??__DIR__);
if(PHP_OS_FAMILY!=='Linux'||!$backend||is_link($configured)||!is_dir($backend)||!$web||$backend===$web||str_starts_with($backend,$web.DIRECTORY_SEPARATOR)||!is_file($backend.'/vendor/autoload.php')||!is_file($backend.'/bootstrap/app.php')){
 http_response_code(503);header('Content-Type: text/plain');header('Cache-Control: no-store');echo 'Private backend configuration is required.';exit;
}
define('LARAVEL_START',microtime(true));
require $backend.'/vendor/autoload.php';
$app=require $backend.'/bootstrap/app.php';
$app->handleRequest(Illuminate\Http\Request::capture());
