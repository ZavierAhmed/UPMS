<?php

declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
function api(string $module, string $function, array $args): array
{
    $p = proc_open(['/usr/bin/uapi','--output=json','--input=json',$module,$function], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes);
    if (!is_resource($p)) {
        throw new RuntimeException('CPANEL_API_UNAVAILABLE');
    }
    fwrite($pipes[0], json_encode((object)$args, JSON_THROW_ON_ERROR));
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $rc = proc_close($p);
    $r = json_decode($out, true, 64, JSON_THROW_ON_ERROR)['result'] ?? [];
    if ($rc !== 0 || ($r['status'] ?? 0) !== 1) {
        throw new RuntimeException('CPANEL_OPERATION_FAILED_'.$module.'_'.$function);
    }
    return $r['data'] ?? [];
}
function privateJson(string $path, array $data): void
{
    if (file_exists($path) || is_link($path)) {
        throw new RuntimeException('PRIVATE_FILE_EXISTS');
    }
    $f = fopen($path, 'xb');
    chmod($path, 0600);
    $bytes = json_encode($data, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n";
    if (fwrite($f, $bytes) !== strlen($bytes) || !fflush($f) || !fsync($f)) {
        throw new RuntimeException('PRIVATE_WRITE_FAILED');
    }fclose($f);
}
