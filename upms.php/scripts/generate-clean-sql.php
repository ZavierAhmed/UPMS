<?php

// Reproducible offline generation only. No database connection or application boot.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__.'/../vendor/autoload.php';
$directory = $argv[1] ?? dirname(__DIR__, 2).'/deployment/phpmyadmin';
if (!is_dir($directory) && !mkdir($directory, 0755, true)) {
    throw new RuntimeException('OUTPUT_DIRECTORY_UNAVAILABLE');
}
$sql = App\Upms\CleanSqlImport::sql();
$root = dirname(__DIR__, 2);
$files = ['upms-production-clean.sql' => $sql,'README-PHPMYADMIN-IMPORT.md' => file_get_contents($root.'/deployment/README-PHPMYADMIN-IMPORT.template.md'),'verify-clean-import.php' => file_get_contents($root.'/deployment/verify-clean-import.template.php'),'finalize-clean-import.php' => file_get_contents($root.'/deployment/verify-clean-import.template.php')];
$hashes = [];
foreach ($files as $name => $bytes) {
    $bytes = str_replace("\r\n", "\n", $bytes);
    file_put_contents($directory.'/'.$name, $bytes);
    $hashes[$name] = hash('sha256', $bytes);
}
$manifest = ['format' => 'upms-php82-clean-import-v1','schemaVersion' => App\Upms\CleanInitialization::plan()['version'],'receiptVersion' => 2,'planHash' => App\Upms\CleanInitialization::hash(),'sqlSha256' => hash('sha256', $sql),'targetDatabase' => null,'requiresVerifiedNewEmptySelectedTarget' => true,'stateAfterImport' => App\Upms\CleanSqlImport::IMPORTED,'initialApplicationUsers' => 0,'initialBusinessRows' => 0,'administratorProvisioning' => 'separate-private-CLI','productionActivationApproved' => false,'files' => $hashes];
file_put_contents($directory.'/upms-production-clean-manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n");
echo json_encode(['generated' => true,'sqlSha256' => $manifest['sqlSha256'],'files' => 5,'databaseContacted' => false,'productionActivationApproved' => false]).PHP_EOL;
