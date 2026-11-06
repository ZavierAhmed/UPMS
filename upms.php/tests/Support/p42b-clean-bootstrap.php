<?php

declare(strict_types=1);

use App\Upms\CleanInitialization;
use App\Upms\CumulativeInitialization;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__.'/../../vendor/autoload.php';
try {
    $input = json_decode(stream_get_contents(STDIN, 16384), true, 32, JSON_THROW_ON_ERROR);
    $schema = $input['schema'];
    if (!preg_match('/^upms_test_php_p42b_[0-9]{13}$/D', $schema)) {
        throw new RuntimeException('P42B_ISOLATED_SCOPE_REQUIRED');
    }
    $connections = [];
    $accounts = [];
    foreach (['installer','definer','runtime'] as $role) {
        $user = $input['users'][$role];
        $pdo = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$schema.';charset=utf8mb4',
            $user, $input['databasePasswords'][$role],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false,
             PDO::MYSQL_ATTR_MULTI_STATEMENTS => false]);
        $meta = $pdo->query('SELECT VERSION() version,@@port port,@@bind_address binding,@@datadir dir')->fetch(PDO::FETCH_ASSOC);
        $normalize = fn ($s) => strtolower(rtrim(str_replace('\\','/',$s),'/'));
        $expected = realpath(dirname(__DIR__, 3).'/tmp/php-runtime/php2-engine-1793148736638');
        if (!$expected || !str_starts_with($meta['version'],'10.11.19-MariaDB') || (int)$meta['port'] !== 3330
            || $meta['binding'] !== '127.0.0.1' || $normalize($meta['dir']) !== $normalize($expected)) {
            throw new RuntimeException('P42B_ISOLATED_ENGINE_REJECTED');
        }
        $accounts[$role] = $user.'@localhost';
        $connections[$role] = $pdo;
    }
    $result = CumulativeInitialization::initialize($connections['installer'], $connections['definer'], $connections['runtime'],
        ['schema' => $schema, 'reference' => $input['reference'], 'release' => $input['release'],
            'targetHash' => CleanInitialization::target($connections['installer']), 'accounts' => $accounts],
        $input['journal'], $input['enrollment'],
        $input['interrupt'] ? static function (int $step): void { if ($step === 8) { exit(41); } } : null);
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    $code = preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D', $error->getMessage()) ? $error->getMessage() : 'P42B_BOOTSTRAP_FAILED';
    fwrite(STDERR, $code.PHP_EOL);
    exit(1);
}
