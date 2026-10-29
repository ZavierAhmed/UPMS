<?php

// Read-only owner-side preflight, suitable for piping to SSH PHP stdin.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$home = '/home/tsn6az96j3v7';
$stage = $home.'/upms-php83-staging';
$public = $home.'/public_html';
$management = $public.'/dashboard';
$diagnostics = $home.'/upms-php8-preflight';
$checks = ['linux' => PHP_OS_FAMILY === 'Linux','php83' => PHP_MAJOR_VERSION === 8 && PHP_MINOR_VERSION === 3,'homeExact' => realpath($home) === $home,'parentNotWritableByOthers' => is_dir($home) && (fileperms($home) & 0022) === 0,'publicExact' => realpath($public) === $public,'managementExact' => realpath($management) === $management,'diagnosticsExact' => realpath($diagnostics) === $diagnostics,'newDestinationAbsent' => !file_exists($stage) && !is_link($stage)];
foreach (['pdo_mysql','sodium','openssl','mbstring','fileinfo','curl','zip','intl','bcmath','posix'] as $extension) {
    $checks['extension_'.$extension] = extension_loaded($extension);
}
$disabled = array_filter(array_map('trim', explode(',', ini_get('disable_functions'))));
$checks['privateChildAvailable'] = function_exists('proc_open') && !in_array('proc_open', $disabled, true);
$checks['fsyncAvailable'] = function_exists('fsync') && !in_array('fsync', $disabled, true);
echo json_encode(['readOnly' => true,'recordsChanged' => 0,'paths' => compact('home', 'public', 'management', 'diagnostics', 'stage'),'checks' => $checks,'inspectionPassed' => !in_array(false, $checks, true),'php' => PHP_VERSION,'cliMemoryLimit' => ini_get('memory_limit'),'cliMaxExecutionTime' => ini_get('max_execution_time'),'filesystemFreeBytes' => disk_free_space($home),'accountQuota' => 'PENDING_CPANEL_REVIEW','webPhp' => 'NOT_CHECKED','stagingDirectoryCreated' => false,'productionReady' => false], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
