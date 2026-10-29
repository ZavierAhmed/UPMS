<?php

// Linux-only isolated fixture. Never invoke against a hosting account.
declare(strict_types=1);
require 'upms.php/app/Upms/ApiError.php';
require 'upms.php/app/Upms/ProductionConnection.php';
require 'upms.php/app/Upms/Schema.php';
require 'upms.php/app/Upms/CleanInitialization.php';
require 'upms.php/app/Upms/AdminProvisioning.php';
$socket = getenv('PHP81_FIXTURE_SOCKET');
$base = getenv('HOME').'/.cache/upms-php81-local/';
if (PHP_OS_FAMILY !== 'Linux' || !str_starts_with($socket, $base.'socket-fixture-') || basename($socket) !== 'mysql.sock') {
    throw new RuntimeException('ISOLATED_LINUX_FIXTURE_ONLY');
}
$root = new PDO('mysql:unix_socket='.$socket.';charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$schema = 'upms_test_php_81_linux_'.time();
$root->exec('CREATE DATABASE `'.$schema.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$password = bin2hex(random_bytes(32));
$root->exec("CREATE USER 'php81_socket'@'localhost' IDENTIFIED BY ".$root->quote($password));
$root->exec("GRANT SELECT,INSERT,UPDATE,CREATE,ALTER,INDEX,REFERENCES ON `$schema`.* TO 'php81_socket'@'localhost'");
$id = $root->query('SELECT VERSION() version,@@server_id server_id,@@hostname hostname')->fetch(PDO::FETCH_ASSOC);
$c = ['transport' => 'unix_socket','socket' => $socket,'socketOwnerUid' => (string)fileowner($socket),'serverHostname' => gethostname(),'localSocketVerified' => true,'schema' => $schema,'serverVersion' => $id['version'],'serverId' => (string)$id['server_id'],'account' => 'php81_socket@localhost','user' => 'php81_socket','password' => $password];
$pdo = App\Upms\ProductionConnection::connect($c);
$checks = 1;
foreach ([['serverId' => '999999'],['socketOwnerUid' => '999999'],['host' => 'remote.example.invalid'],['transport' => 'tcp']] as $change) {
    try {
        App\Upms\ProductionConnection::connect(array_replace($c, $change));
        throw new RuntimeException('UNSAFE_SOCKET_ACCEPTED');
    } catch (App\Upms\ApiError) {
        $checks++;
    }
}
$regular = dirname($socket).'/regular';
file_put_contents($regular, 'not a socket');
try {
    App\Upms\ProductionConnection::connect(array_replace($c, ['socket' => $regular]));
    throw new RuntimeException('REGULAR_FILE_ACCEPTED');
} catch (App\Upms\ApiError) {
    $checks++;
}
$link = dirname($socket).'/link.sock';
symlink($socket, $link);
try {
    App\Upms\ProductionConnection::connect(array_replace($c, ['socket' => $link]));
    throw new RuntimeException('SOCKET_SYMLINK_ACCEPTED');
} catch (App\Upms\ApiError) {
    $checks++;
}
$ref = 'synthetic_linux_'.time();
$r = App\Upms\CleanInitialization::initialize($pdo, $ref, dirname($socket).'/receipt.json');
if ($r['tables'] !== 20) {
    throw new RuntimeException('SCHEMA_FAILED');
}$checks++;
$admins = App\Upms\AdminProvisioning::apply($pdo, $ref, ['admin' => bin2hex(random_bytes(32)),'haris' => bin2hex(random_bytes(32))]);
App\Upms\CleanInitialization::bind($pdo, $admins['users'], $ref);
if ($pdo->query('SELECT state FROM v1_control')->fetchColumn() !== 'PENDING') {
    throw new RuntimeException('UNREVIEWED_ACTIVATION');
}$checks++;
$result = ['passed' => true,'checks' => $checks,'platform' => 'Linux','php' => PHP_VERSION,'databaseVersion' => $id['version'],'actualUnixSocket' => true,'tcpNetworkingDisabled' => true,'freshTables' => 20,'businessRows' => 0,'initialUsers' => 2,'posting' => 'DISABLED','memoryLimit' => ini_get('memory_limit'),'peakMemoryBytes' => memory_get_peak_usage(true),'productionContacted' => false];
file_put_contents('tmp/php-runtime/php81-linux-socket.json', json_encode($result, JSON_PRETTY_PRINT));
echo json_encode($result).PHP_EOL;
