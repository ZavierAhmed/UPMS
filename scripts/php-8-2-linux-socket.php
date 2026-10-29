<?php

// Linux-only isolated fixture. Never invoke against a hosting account.
declare(strict_types=1);
require 'upms.php/app/Upms/ApiError.php';
require 'upms.php/app/Upms/ProductionConnection.php';
require 'upms.php/app/Upms/DiagnosticFailure.php';
require 'upms.php/app/Upms/OperatorPolicy.php';
require 'upms.php/app/Upms/ProductionProfile.php';
require 'upms.php/app/Upms/CleanSqlImport.php';
require 'upms.php/app/Upms/Schema.php';
require 'upms.php/app/Upms/CleanInitialization.php';
require 'upms.php/app/Upms/AdminProvisioning.php';
$socket = getenv('PHP81_FIXTURE_SOCKET');
$base = getenv('HOME').'/.cache/upms-php81-local/';
if (PHP_OS_FAMILY !== 'Linux' || !str_starts_with($socket, $base.'socket-fixture-') || basename($socket) !== 'mysql.sock') {
    throw new RuntimeException('ISOLATED_LINUX_FIXTURE_ONLY');
}
$root = new PDO('mysql:unix_socket='.$socket.';charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$schema = 'upms_test_php_82_linux_'.time();
$root->exec('CREATE DATABASE `'.$schema.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$password = bin2hex(random_bytes(32));
$root->exec("CREATE USER 'php82_socket'@'localhost' IDENTIFIED BY ".$root->quote($password));
$root->exec("GRANT SELECT,INSERT,UPDATE,CREATE,ALTER,INDEX,REFERENCES ON `$schema`.* TO 'php82_socket'@'localhost'");
$id = $root->query('SELECT VERSION() version,@@server_id server_id,@@hostname hostname')->fetch(PDO::FETCH_ASSOC);
$c = ['transport' => 'unix_socket','socket' => $socket,'socketOwnerUid' => (string)fileowner($socket),'serverHostname' => gethostname(),'localSocketVerified' => true,'schema' => $schema,'serverVersion' => $id['version'],'serverId' => (string)$id['server_id'],'account' => 'php82_socket@localhost','user' => 'php82_socket','password' => $password];
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
// Import the artifact through the real MariaDB client, including DELIMITER processing.
$client = $base.'root/usr/bin/mariadb';
$command = [$client,'--no-defaults','--protocol=socket','--socket='.$socket,'-uroot',$schema];
$p = proc_open($command, [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes);
fwrite($pipes[0], file_get_contents('deployment/phpmyadmin/upms-production-clean.sql'));
fclose($pipes[0]);
$stdout = stream_get_contents($pipes[1]);
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[1]);
fclose($pipes[2]);
if (proc_close($p) !== 0) {
    throw new RuntimeException('NATIVE_SQL_IMPORT_FAILED');
}$checks++;
$r = App\Upms\CleanSqlImport::verify($pdo);
if ($r['tables'] !== 20) {
    throw new RuntimeException('SCHEMA_FAILED');
}$checks++;
// Exercise POSIX profile/secret permissions without connecting a non-synthetic schema.
$profileBase = dirname($socket).'/profile';
mkdir($profileBase, 0700);
foreach (['private','public','management'] as $part) {
    mkdir($profileBase.'/'.$part, 0700);
}
$profile = $c + ['enabled' => true,'mode' => 'read-only-transport-verification','readOnlyMetadataApproved' => true,'privateRoot' => $profileBase.'/private','publicRoot' => $profileBase.'/public','managementRoot' => $profileBase.'/management','passwordFile' => $profileBase.'/private/password','origin' => 'https://app.unique-plastic.com','reference' => 'synthetic_profile_only'];
unset($profile['password']);
$profileFile = $profileBase.'/private/profile.json';
file_put_contents($profile['passwordFile'], bin2hex(random_bytes(32)));
chmod($profile['passwordFile'], 0600);
file_put_contents($profileFile, json_encode($profile));
chmod($profileFile, 0600);
try {
    App\Upms\ProductionProfile::load($profileFile, 'read-only-transport-verification');
    throw new RuntimeException('SYNTHETIC_PRODUCTION_TARGET_ACCEPTED');
} catch (App\Upms\ApiError $e) {
    if ($e->apiCode !== 'PRODUCTION_TARGET_REJECTED') {
        throw $e;
    }$checks++;
}
$profile['schema'] = 'unconnected_profile_fixture';
file_put_contents($profileFile, json_encode($profile));
App\Upms\ProductionProfile::load($profileFile, 'read-only-transport-verification');
$checks++;
chmod($profileFile, 0644);
try {
    App\Upms\ProductionProfile::load($profileFile, 'read-only-transport-verification');
    throw new RuntimeException('PUBLIC_PROFILE_MODE_ACCEPTED');
} catch (App\Upms\ApiError $e) {
    if ($e->apiCode !== 'PRODUCTION_PROFILE_REJECTED') {
        throw $e;
    }$checks++;
}chmod($profileFile, 0600);
clearstatcache();
chmod($profile['passwordFile'], 0644);
try {
    App\Upms\ProductionProfile::load($profileFile, 'read-only-transport-verification');
    throw new RuntimeException('PUBLIC_SECRET_MODE_ACCEPTED');
} catch (App\Upms\ApiError $e) {
    if ($e->apiCode !== 'PRODUCTION_PRIVATE_PATH_REJECTED') {
        throw $e;
    }$checks++;
}chmod($profile['passwordFile'], 0600);
clearstatcache();
file_put_contents($profile['passwordFile'], "\xEF\xBB\xBFSYNTHETIC_ONLY");
try {
    App\Upms\ProductionProfile::load($profileFile, 'read-only-transport-verification');
    throw new RuntimeException('BOM_SECRET_ACCEPTED');
} catch (App\Upms\ApiError $e) {
    if ($e->apiCode !== 'PRODUCTION_PASSWORD_ENCODING_REJECTED') {
        throw $e;
    }$checks++;
}
$ref = 'synthetic_linux_'.time();
App\Upms\CleanSqlImport::finalize($pdo, $ref, dirname($socket).'/receipt.json', App\Upms\CleanSqlImport::digest());
$checks++;
// A genuinely SELECT-only account exercises protected PDO authentication and metadata queries.
$viewPassword = bin2hex(random_bytes(32));
$root->exec("CREATE USER 'php82_view'@'localhost' IDENTIFIED BY ".$root->quote($viewPassword));
$root->exec("GRANT SELECT ON `$schema`.* TO 'php82_view'@'localhost'");
$view = array_replace($c, ['user' => 'php82_view','account' => 'php82_view@localhost','password' => $viewPassword]);
$stage = 'bootstrap';
$read = App\Upms\ProductionConnection::connect($view, static function ($s) use (&$stage) {
    $stage = $s;
});
$read->exec('START TRANSACTION READ ONLY');
$read->query('SELECT DATABASE(),CURRENT_USER(),VERSION(),@@server_id')->fetch();
$read->rollBack();
$checks++;
foreach ([['password' => bin2hex(random_bytes(32))],['schema' => 'upms_test_php_82_missing'],['serverVersion' => '10.11.999-MariaDB'],['account' => 'wrong@localhost'],['serverHostname' => 'wrong.invalid']] as $change) {
    try {
        App\Upms\ProductionConnection::connect(array_replace($view, $change), static function ($s) use (&$stage) {
            $stage = $s;
        });
        throw new RuntimeException('INVALID_PIN_ACCEPTED');
    } catch (App\Upms\ApiError|PDOException $e) {
        $safe = App\Upms\DiagnosticFailure::describe($e, $stage);
        if (str_contains(json_encode($safe), $viewPassword)) {
            throw new RuntimeException('SECRET_LEAK');
        }$checks++;
    }
}
try {
    $read->exec('CREATE TABLE forbidden_write(id INT)');
    throw new RuntimeException('SELECT_ONLY_WRITE_ACCEPTED');
} catch (PDOException $e) {
    $safe = App\Upms\DiagnosticFailure::describe($e, 'metadata');
    if ($safe['category'] !== 'database_permissions') {
        throw new RuntimeException('PERMISSION_CATEGORY_FAILED');
    }$checks++;
}
$admins = App\Upms\AdminProvisioning::apply($pdo, $ref, ['admin' => bin2hex(random_bytes(32)),'haris' => bin2hex(random_bytes(32))]);
App\Upms\CleanInitialization::bind($pdo, $admins['users'], $ref);
if ($pdo->query('SELECT state FROM v1_control')->fetchColumn() !== 'PENDING') {
    throw new RuntimeException('UNREVIEWED_ACTIVATION');
}$checks++;
$result = ['passed' => true,'checks' => $checks,'platform' => 'Linux','php' => PHP_VERSION,'databaseVersion' => $id['version'],'actualUnixSocket' => true,'selectOnlyConnectionVerified' => true,'nativeClientDelimiterImport' => true,'fullProductionProfileSyntheticTargetRejected' => true,'tcpNetworkingDisabled' => true,'freshTables' => 20,'businessRows' => 0,'initialUsers' => 2,'posting' => 'DISABLED','memoryLimit' => ini_get('memory_limit'),'peakMemoryBytes' => memory_get_peak_usage(true),'productionContacted' => false];
file_put_contents('tmp/php-runtime/php82-linux-socket.json', json_encode($result, JSON_PRETTY_PRINT));
echo json_encode($result).PHP_EOL;
