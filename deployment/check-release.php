<?php

// Read-only checksum check. Use the trusted source copy and an independently approved manifest digest.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$root = realpath($argv[1] ?? '');
if (!$root || !is_file($root.'/MANIFEST.json')) {
    throw new RuntimeException('MANIFEST_REQUIRED');
}
$bytes = file_get_contents($root.'/MANIFEST.json');
$digest = hash('sha256', $bytes);
if (isset($argv[2]) && !hash_equals($argv[2], $digest)) {
    throw new RuntimeException('MANIFEST_DIGEST_MISMATCH');
}
$m = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
if (($m['kind'] ?? '') !== 'LINUX_STAGING_CANDIDATE' || ($m['productionReady'] ?? null) !== false) {
    throw new RuntimeException('RELEASE_CLASSIFICATION_REJECTED');
}
$expected = [];
foreach ($m['files'] as $row) {
    $name = $row['path'] ?? null;
    if (!is_string($name) || $name === '' || $name[0] === '/' || str_contains($name, '\\') || preg_match('~(^|/)\.\.(/|$)~', $name) || isset($expected[$name])) {
        throw new RuntimeException('MANIFEST_PATH_REJECTED');
    }$path = realpath($root.'/'.$name);
    if (!$path || !str_starts_with($path, $root.DIRECTORY_SEPARATOR) || is_link($root.'/'.$name) || !is_file($path) || filesize($path) !== $row['bytes'] || !hash_equals($row['sha256'], hash_file('sha256', $path))) {
        throw new RuntimeException('PAYLOAD_CHECKSUM_MISMATCH');
    }$expected[$name] = true;
}
$actual = [];
foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
    if ($file->isLink()) {
        throw new RuntimeException('RELEASE_SYMLINK_REJECTED');
    }if ($file->isFile()) {
        $name = substr($file->getPathname(), strlen($root) + 1);
        if (!in_array($name, ['MANIFEST.json','SOURCE.json'], true)) {
            $actual[$name] = true;
        }
    }
}
ksort($actual);
ksort($expected);
if ($actual !== $expected) {
    throw new RuntimeException('UNMANIFESTED_PAYLOAD_FILE');
}
$source = json_decode(file_get_contents($root.'/SOURCE.json'), true, 32, JSON_THROW_ON_ERROR);
if (($source['kind'] ?? '') !== 'SOURCE_LAYOUT_ONLY' || ($source['productionReady'] ?? null) !== false) {
    throw new RuntimeException('SOURCE_DESCRIPTOR_REJECTED');
}
echo json_encode(['passed' => true,'files' => count($expected),'manifestSha256' => $digest,'readOnly' => true,'productionReady' => false], JSON_THROW_ON_ERROR).PHP_EOL;
