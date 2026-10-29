<?php

// Offline Linux candidate verifier. Never authenticates a database or runs migrations.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}
$root = realpath($argv[1] ?? '');
if (!$root || !is_file($root.'/SOURCE.json')) {
    throw new RuntimeException('REVIEWED_SOURCE_LAYOUT_REQUIRED');
}
$manifest = [];
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($iterator as $file) {
    $name = substr($file->getPathname(), strlen($root) + 1);
    if ($file->isLink()) {
        throw new RuntimeException('RELEASE_SYMLINK_REJECTED');
    }if (!$file->isFile() || in_array($name, ['MANIFEST.json','SOURCE.json'], true)) {
        continue;
    }
    if (preg_match('~(^|/)(?:\.env[^/]*|node_modules|tests|Tests|fixtures|\.git)(/|$)|\.(?:log|sql|pem|key|pfx|map)$~', $name)) {
        throw new RuntimeException('FORBIDDEN_RELEASE_CONTENT: '.$name);
    }
    if (str_contains($name, 'vendor/') && !str_starts_with($name, 'private/backend/vendor/')) {
        throw new RuntimeException('PUBLIC_VENDOR_REJECTED');
    }
    if (str_starts_with($name, 'private/backend/storage/') || str_starts_with($name, 'private/backend/bootstrap/cache/')) {
        throw new RuntimeException('GENERATED_RUNTIME_STATE_REJECTED');
    }
    if (str_ends_with($name, '.php') && !str_starts_with($name, 'private/backend/') && !in_array($name, ['public/inquiry.php','management/gateway.php','verify-release.php','check-release.php'], true)) {
        throw new RuntimeException('UNREVIEWED_PUBLIC_PHP');
    }
    $manifest[] = ['path' => $name,'bytes' => $file->getSize(),'sha256' => hash_file('sha256', $file->getPathname())];
}
usort($manifest, fn ($a, $b) => strcmp($a['path'], $b['path']));
foreach (['public/inquiry.php','management/gateway.php'] as $entry) {
    $path = $root.'/'.$entry;
    $code = file_get_contents($path);
    $absolute = $root.'/private/backend';
    if (!preg_match('~^/[a-zA-Z0-9_./-]+$~D', $absolute)) {
        throw new RuntimeException('PRIVATE_STAGING_PATH_REJECTED');
    } if (str_contains($code, '/REPLACE_WITH_VERIFIED_PRIVATE_PATH/backend')) {
        $code = str_replace('/REPLACE_WITH_VERIFIED_PRIVATE_PATH/backend', $absolute, $code);
        file_put_contents($path, $code);
        foreach ($manifest as &$row) {
            if ($row['path'] === $entry) {
                $row['bytes'] = strlen($code);
                $row['sha256'] = hash('sha256', $code);
            }
        }unset($row);
    }
    if (!str_contains($code, "'".$absolute."'")) {
        throw new RuntimeException('PRIVATE_ENTRY_PATH_MISMATCH');
    }
}
$installed = json_decode(file_get_contents($root.'/private/backend/vendor/composer/installed.json'), true, 512, JSON_THROW_ON_ERROR);
if (($installed['dev'] ?? true) !== false) {
    throw new RuntimeException('DEVELOPMENT_DEPENDENCIES_REJECTED');
}
foreach ($installed['packages'] as $package) {
    if (preg_match('~^(phpunit/|mockery/|laravel/pint$)~', $package['name'])) {
        throw new RuntimeException('DEVELOPMENT_PACKAGE_REJECTED');
    }
}
$html = file_get_contents($root.'/management/index.html');
if (!str_contains($html, 'data-upms-mode="simple-v1"')) {
    throw new RuntimeException('SIMPLE_V1_MODE_REQUIRED');
}preg_match_all('~(?:src|href)="(/management/assets/[^\"]+)"~', $html, $links);
foreach ($links[1] as $link) {
    if (!is_file($root.'/management'.$link)) {
        throw new RuntimeException('MANAGEMENT_ASSET_MISSING');
    }
}
require $root.'/private/backend/vendor/autoload.php';
if (!is_file($root.'/private/backend/scripts/inquiry-mail.php')) {
    throw new RuntimeException('PRIVATE_MAIL_WORKER_MISSING');
}
if (count(App\Upms\CleanInitialization::plan()['tables']) !== 19) {
    throw new RuntimeException('CANONICAL_SCHEMA_MISSING');
}
file_put_contents($root.'/MANIFEST.json', json_encode(['kind' => 'LINUX_STAGING_CANDIDATE','productionReady' => false,'linuxDependenciesVerified' => true,'actualGoDaddyPathsVerified' => false,'php' => PHP_VERSION,'files' => $manifest], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
echo json_encode(['passed' => true,'files' => count($manifest),'linuxDependenciesVerified' => true,'productionReady' => false]).PHP_EOL;
