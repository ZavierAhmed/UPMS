<?php

// Standalone private CLI capability observer. No application bootstrap, credentials or database access.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$options = getopt('', ['process-probe','filesystem-probe','scratch-dir:']);
$result = ['context' => 'CLI only; web/FPM settings require separate cPanel evidence','php' => PHP_VERSION,'sapi' => PHP_SAPI,'os' => PHP_OS_FAMILY,'extensions' => [],'memoryLimit' => ini_get('memory_limit'),'executionLimit' => ini_get('max_execution_time'),'disabledFunctions' => array_values(array_filter(array_map('trim', explode(',', (string)ini_get('disable_functions'))))),'processProbe' => 'NOT RUN','filesystemProbe' => 'NOT RUN','databaseAccess' => false,'smtpMessagesSent' => 0];
foreach (['pdo_mysql','sodium','openssl','fileinfo','mbstring','curl','zip','ctype','dom','filter','hash','pcre','session','tokenizer','xml'] as $extension) {
    $result['extensions'][$extension] = extension_loaded($extension);
}
$result['supportedTestedPhpLine'] = in_array(PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION, ['8.3','8.4'], true);
$result['functions'] = array_combine(['proc_open','proc_terminate','flock','rename','fsync'], array_map('function_exists', ['proc_open','proc_terminate','flock','rename','fsync']));
if (isset($options['process-probe']) && function_exists('proc_open')) {
    $pipes = [];
    $p = @proc_open([PHP_BINARY,'-r','echo "UPMS_PRIVATE_PROCESS_OK";'], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes, null, null, ['bypass_shell' => true]);
    if (is_resource($p)) {
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $text = '';
        $deadline = microtime(true) + 3;
        do {
            $text .= stream_get_contents($pipes[1]);
            $state = proc_get_status($p);
            if (!$state['running']) {
                break;
            }usleep(10000);
        } while (microtime(true) < $deadline);
        if ($state['running']) {
            proc_terminate($p);
        }$text .= stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($p);
        $result['processProbe'] = $text === 'UPMS_PRIVATE_PROCESS_OK' && !$state['running'] ? 'PASS' : 'FAIL_OR_TIMEOUT';
    } else {
        $result['processProbe'] = 'UNAVAILABLE';
    }
}
if (isset($options['filesystem-probe'])) {
    $dir = isset($options['scratch-dir']) ? realpath($options['scratch-dir']) : false;
    if (!$dir || is_link($options['scratch-dir']) || !is_dir($dir) || !is_writable($dir) || count(array_diff(scandir($dir), ['.','..'])) !== 0 || (PHP_OS_FAMILY !== 'Windows' && (fileperms($dir) & 0077))) {
        $result['filesystemProbe'] = 'REJECTED: explicit empty private scratch directory required';
    } else {
        $file = $dir.'/upms-probe-'.bin2hex(random_bytes(8));
        $renamed = $file.'.renamed';
        $handle = @fopen($file, 'x+b');
        $result['filesystemProbe'] = ['exclusiveCreate' => is_resource($handle),'lock' => false,'rename' => false,'persistence' => false,'directoryMode' => decoct(fileperms($dir) & 0777),'ownerId' => fileowner($dir)];
        if ($handle) {
            chmod($file, 0600);
            try {
                $result['filesystemProbe']['lock'] = flock($handle, LOCK_EX | LOCK_NB);
                fwrite($handle, 'UPMS_SCRATCH_ONLY');
                fflush($handle);
                if (function_exists('fsync')) {
                    fsync($handle);
                }if ($result['filesystemProbe']['lock']) {
                    flock($handle, LOCK_UN);
                }
            } finally {
                fclose($handle);
            }$result['filesystemProbe']['rename'] = rename($file, $renamed);
            $result['filesystemProbe']['persistence'] = is_file($renamed) && file_get_contents($renamed) === 'UPMS_SCRATCH_ONLY';
            if (is_file($renamed)) {
                unlink($renamed);
            }if (is_file($file)) {
                unlink($file);
            }
        }
    }
}
$result['hostingCompatible'] = 'NOT DETERMINED: account, web/FPM, private-root and transport evidence still required';
echo json_encode($result,JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
