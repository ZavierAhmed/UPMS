<?php

// CLI-only synthetic test adapter. Never included in a release.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../../vendor/autoload.php';
$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (($c['port'] ?? 0) !== 3330 || !preg_match('/^upms_test_php_(?:82|6)_[a-z0-9_]+$/D', $c['schema'] ?? '')) {
    throw new RuntimeException('SYNTHETIC_ONLY');
}
$pdo = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false]);
if (!preg_match('/^10\.11\.19-MariaDB/', $pdo->query('SELECT VERSION()')->fetchColumn())) {
    throw new RuntimeException('SYNTHETIC_ENGINE_ONLY');
}
$root = realpath(dirname(__DIR__, 3).'/tmp/php-runtime');
$parent = realpath(dirname($c['receipt']));
if (!$parent || !str_starts_with($parent, $root.DIRECTORY_SEPARATOR)) {
    throw new RuntimeException('PRIVATE_FIXTURE_ONLY');
}
try {
    $action = $c['action'] ?? 'initialize';
    if ($action === 'provision') {
        App\Upms\CleanInitialization::provisionable($pdo, $c['reference']);
    }
    $r = match($action) {
        'import' => (static function () use ($pdo, $c) {
            $sql = App\Upms\CleanSqlImport::sql();
            $sql = preg_replace('/^DELIMITER .*$/m', '', $sql);
            $sql = str_replace('END$$', 'END', $sql);
            if ($c['reservedTarget'] ?? false) {
                $sql = preg_replace_callback('/ IF DATABASE\(\)[^\n]*\n/', static fn ($match) => str_replace('DATABASE()', "'upms'", $match[0]), $sql);
            }
            if ($c['fault'] ?? false) {
                $sql = str_replace('CREATE TABLE `users`', "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_INTERRUPTION'; CREATE TABLE `users`", $sql);
            }$pdo->exec($sql);
            return ['imported' => true];
        })(),
        'verify' => App\Upms\CleanSqlImport::verify($pdo),
        'preflight' => App\Upms\CleanSqlImport::preflight($pdo),
        'finalize' => App\Upms\CleanSqlImport::finalize($pdo, $c['reference'], $c['receipt'], $c['digest'] ?? App\Upms\CleanSqlImport::digest()),
        'accounts' => App\Upms\CleanSqlImport::accounts($pdo, $c['reference']),
        'package' => App\Upms\CleanSqlImport::package($c['directory']),
        'initialize' => App\Upms\CleanInitialization::initialize($pdo, $c['reference'], $c['receipt'], false, isset($c['faultAfter']) ? static function ($step) use ($c) {
            if ($step === $c['faultAfter']) {
                throw new RuntimeException('SYNTHETIC_DDL_INTERRUPTION');
            }
        } : null),
        'resume' => App\Upms\CleanInitialization::initialize($pdo, $c['reference'], $c['receipt'], true),
        'provision' => App\Upms\AdminProvisioning::apply($pdo, $c['reference'], $c['passwords']),
        'bind' => App\Upms\CleanInitialization::bind($pdo, $c['ids'], $c['reference']),
        'activate' => App\Upms\CleanInitialization::activate($pdo, $c['reference'], $c['gates']),
        default => throw new RuntimeException('SYNTHETIC_ACTION_REJECTED')
    };
    echo json_encode(['ok' => true,'result' => $r], JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    echo json_encode(['ok' => false,'error' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'FIXTURE_FAILED']);
    exit(1);
}
