<?php

// Explicitly authorized by owner in PHP-8.4 chat: approve automatic certificate renewal.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
$script = $stage.'/php84-tools/renew-management-ssl.sh';
chmod($script, 0700);
$line = '17 3 * * * /bin/sh '.$script.' >>'.$stage.'/acme84/renewal.log 2>&1';
$p = proc_open(['/usr/bin/crontab','-l'], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes);
fclose($pipes[0]);
$old = stream_get_contents($pipes[1]);
$err = stream_get_contents($pipes[2]);
$rc = proc_close($p);
if ($rc !== 0 && !str_contains($err, 'no crontab')) {
    throw new RuntimeException('CRON_READ_FAILED');
}
if (!str_contains($old, $script)) {
    $p = proc_open(['/usr/bin/crontab','-'], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes);
    fwrite($pipes[0], rtrim($old)."\n".$line."\n");
    fclose($pipes[0]);
    stream_get_contents($pipes[1]);
    stream_get_contents($pipes[2]);
    if (proc_close($p) !== 0) {
        throw new RuntimeException('CRON_WRITE_FAILED');
    }
}
echo json_encode(['renewalScheduled' => true,'dailyCheck' => true,'renewBelowDays' => 30,'existingCronPreserved' => true])."\n";
