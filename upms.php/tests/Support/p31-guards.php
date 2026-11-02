<?php

declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__.'/../../vendor/autoload.php';
$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (($c['port'] ?? 0) !== 3330 || !preg_match('/^upms_test_php_p31_[0-9]+$/D', $c['schema'] ?? '') || !preg_match('/^p31_rt_[0-9]+$/D', $c['runtime'] ?? '')) {
    throw new RuntimeException('SYNTHETIC_ONLY');
}
$p = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'], $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
if (!str_starts_with($p->query('SELECT VERSION()')->fetchColumn(), '10.11.19-MariaDB')) {
    throw new RuntimeException('ENGINE_REJECTED');
}
echo json_encode(App\Upms\CrudGuards::install($p, $c['runtime']));
