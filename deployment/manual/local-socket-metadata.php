<?php

// Safe private metadata only. No database authentication, network, credentials or file writes.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$o = getopt('', ['socket:']);
$r = ['host' => gethostname(),'php' => PHP_VERSION,'sapi' => PHP_SAPI,'memoryLimit' => ini_get('memory_limit'),'defaultPdoSocket' => ini_get('pdo_mysql.default_socket'),'databaseAuthenticated' => false,'transportProven' => false,'socket' => null];
if (isset($o['socket'])) {
    $path = $o['socket'];
    if (!is_string($path) || !preg_match('~^/[a-zA-Z0-9_./-]+$~D', $path)) {
        fwrite(STDERR, "ABSOLUTE_SOCKET_PATH_REQUIRED\n");
        exit(1);
    }clearstatcache(true, $path);
    $s = @lstat($path);
    $r['socket'] = ['path' => $path,'realPath' => realpath($path) ?: null,'type' => @filetype($path) ?: null,'symlink' => is_link($path),'ownerUid' => $s['uid'] ?? null,'mode' => $s ? decoct($s['mode'] & 0777) : null,'parents' => []];
    for ($p = dirname($path);; $p = dirname($p)) {
        $m = @lstat($p);
        $r['socket']['parents'][] = ['path' => $p,'ownerUid' => $m['uid'] ?? null,'mode' => $m ? decoct($m['mode'] & 0777) : null,'symlink' => is_link($p)];
        if ($p === '/') {
            break;
        }
    }
}
echo json_encode($r, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
