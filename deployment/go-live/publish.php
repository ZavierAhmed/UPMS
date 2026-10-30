<?php

// Owner-authorized publication of the existing staged frontend. No database or mail.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
$release = $stage.'/php84-release';
$public = '/home/tsn6az96j3v7/public_html';
$management = $public.'/dashboard';
$backend = $release.'/private/backend';
try {
    foreach ([$stage,$release,$public,$management,$backend] as $p) {
        if (realpath($p) !== $p || is_link($p)) {
            throw new RuntimeException('PATH_BOUNDARY_REJECTED');
        }
    }
    if (count(array_diff(scandir($management), ['.','..'])) !== 0) {
        throw new RuntimeException('MANAGEMENT_NOT_EMPTY');
    }
    $files = [];
    foreach (['public','management'] as $tree) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($release.'/'.$tree, FilesystemIterator::SKIP_DOTS)) as $f) {
            if ($f->isLink()) {
                throw new RuntimeException('SOURCE_SYMLINK_REJECTED');
            }
            if (!$f->isFile()) {
                continue;
            }$relative = substr($f->getPathname(), strlen($release.'/'.$tree) + 1);
            if (preg_match('~(^|/)(vendor|storage|config|bootstrap|scripts|\.env|composer\.(json|lock))(/|$)~i', $relative) || (str_ends_with($relative, '.php') && !in_array($relative, ['inquiry.php','gateway.php'], true))) {
                throw new RuntimeException('WEB_SOURCE_REJECTED');
            }
            $files[$tree.'/'.$relative] = hash_file('sha256', $f->getPathname());
        }
    }
    // Preserve all prior public files privately before overwriting anything.
    $backup = $stage.'/public-before-php84';
    if (file_exists($backup)) {
        throw new RuntimeException('BACKUP_ALREADY_EXISTS_REVIEW_REQUIRED');
    }
    mkdir($backup, 0700);
    $copy = function (string $src, string $dst) use (&$copy): void {
        if (is_link($src)) {
            throw new RuntimeException('SYMLINK_REJECTED');
        }
        if (is_dir($src)) {
            if (!is_dir($dst)) {
                mkdir($dst, 0755);
                chmod($dst, 0755);
            }foreach (array_diff(scandir($src), ['.','..']) as $name) {
                $copy($src.'/'.$name, $dst.'/'.$name);
            }return;
        }
        if (!is_file($src) || !copy($src, $dst) || !hash_equals(hash_file('sha256', $src), hash_file('sha256', $dst))) {
            throw new RuntimeException('COPY_VERIFICATION_FAILED');
        }chmod($dst, 0644);
    };
    foreach (array_diff(scandir($public), ['.','..']) as $name) {
        $copy($public.'/'.$name, $backup.'/'.$name);
    }
    chmod($backup, 0700);
    file_put_contents($backup.'/SOURCE-FILES.json', json_encode($files, JSON_PRETTY_PRINT));
    chmod($backup.'/SOURCE-FILES.json', 0600);
    // Disable SQL application and SMTP explicitly in private configuration.
    if (file_exists($backend.'/.env')) {
        throw new RuntimeException('EXISTING_BACKEND_ENV_REVIEW_REQUIRED');
    }
    $key = trim(file_get_contents($stage.'/runtime/app-key'));
    $env = "APP_NAME=\"Unique Plastic Industry\"\nAPP_ENV=production\nAPP_DEBUG=false\nAPP_KEY=$key\nAPP_URL=https://app.unique-plastic.com\nLOG_CHANNEL=single\nLOG_LEVEL=warning\nCACHE_STORE=file\nSESSION_DRIVER=array\nQUEUE_CONNECTION=sync\nUPMS_ENABLED=false\nUPMS_ENFORCE_HOST_BOUNDARY=true\nUPMS_ORIGIN=https://app.unique-plastic.com\nINQUIRY_ORIGIN=https://unique-plastic.com\nINQUIRY_MODE=Disabled\nMAIL_MAILER=array\n";
    file_put_contents($backend.'/.env', $env);
    chmod($backend.'/.env', 0600);
    // Keep the reversible pre-deployment copy, retire all replaced top-level files.
    $retired = $stage.'/retired-public-php84';
    mkdir($retired, 0700);
    foreach (array_diff(scandir($public), ['.','..','dashboard','.well-known','cgi-bin']) as $name) {
        if (!rename($public.'/'.$name, $retired.'/'.$name)) {
            throw new RuntimeException('RETIRE_PUBLIC_FAILED');
        }
    }
    foreach (['public' => $public,'management' => $management] as $tree => $target) {
        foreach (array_diff(scandir($release.'/'.$tree), ['.','..','index.html','.htaccess']) as $name) {
            $copy($release.'/'.$tree.'/'.$name, $target.'/'.$name);
        }
        $copy($release.'/'.$tree.'/index.html', $target.'/index.html');
        $copy($release.'/'.$tree.'/.htaccess', $target.'/.htaccess');
        $gateway = $target.'/'.($tree === 'public' ? 'inquiry.php' : 'gateway.php');
        $code = file_get_contents($gateway);
        $old = $stage.'/payload/release/private/backend';
        if (substr_count($code, $old) !== 1) {
            throw new RuntimeException('GATEWAY_PREIMAGE_REJECTED');
        }
        file_put_contents($gateway, str_replace($old, $backend, $code));
        $rules = file_get_contents($target.'/.htaccess');
        $host = $tree === 'public' ? 'unique-plastic.com' : 'app.unique-plastic.com';
        $prefix = "RewriteEngine On\nRewriteCond %{HTTP_HOST} ^".str_replace('.', '\\.', $host)."$ [NC]\nRewriteRule ^\\.well-known/acme-challenge/[A-Za-z0-9_-]+$ - [END]\nRewriteCond %{HTTP_HOST} ^".str_replace('.', '\\.', $host)."$ [NC]\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://$host%{REQUEST_URI} [R=307,END]\n";
        file_put_contents($target.'/.htaccess', $prefix.$rules);
    }
    $report = ['published' => true,'backup' => $backup,'retiredFiles' => $retired,'publicFiles' => count(array_filter(array_keys($files), fn ($k) => str_starts_with($k, 'public/'))),'managementFiles' => count(array_filter(array_keys($files), fn ($k) => str_starts_with($k, 'management/'))),'backendPrivate' => true,'runtimeEnabled' => false,'smtpEnabled' => false,'productionActivated' => false];
    file_put_contents($stage.'/runtime/publication84.json', json_encode($report, JSON_PRETTY_PRINT));
    chmod($stage.'/runtime/publication84.json', 0600);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['published' => false,'code' => preg_match('/^[A-Z_]+$/D',$e->getMessage()) ? $e->getMessage() : 'PUBLICATION_FAILED_REVIEW_PRIVATE_STATE'])."\n";
    exit(1);
}
