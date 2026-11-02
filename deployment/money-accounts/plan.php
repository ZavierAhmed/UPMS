<?php

// Offline review bundle only. No database connection, credential, grant, activation or financial opening.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__, 2).'/upms.php/vendor/autoload.php';
use App\Upms\{CrudGuards,MoneyGuards,MoneySchema};

$o = getopt('', ['output:','accounts:']);
$out = $o['output'] ?? __DIR__.'/review-plan';
if (is_link($out) || is_dir($out) && array_diff(scandir($out), ['.','..'])) {
    throw new RuntimeException('EMPTY_REVIEW_DIRECTORY_REQUIRED');
}
if (!is_dir($out) && !mkdir($out, 0700, true)) {
    throw new RuntimeException('REVIEW_DIRECTORY_REQUIRED');
}
$accounts = MoneySchema::accounts(isset($o['accounts']) ? json_decode(file_get_contents($o['accounts']), true, 16, JSON_THROW_ON_ERROR) : MoneySchema::defaults());
$header = "-- REVIEW ONLY. Owner approval, verified recovery, maintenance and preflight are required.\n-- DDL is not transactionally atomic. Stop on any error; never reset/retry a partial migration.\n-- This plan does not create verified balances, grant privileges, update old guards or activate Money Accounts.\n";
$files = ['01-schema.sql' => $header.implode(";\n", array_values(MoneySchema::plan()['tables'])).";\n"];
$literal = static fn ($s) => "'".str_replace(["\\","'"], ["\\\\","''"], $s)."'";
$files['02-master-config.sql'] = $header."-- Maintenance identity only. No money movements or inferred opening rows.\n";
foreach ($accounts as $a) {
    $files['02-master-config.sql'] .= 'INSERT INTO money_accounts(code,name,type) VALUES('.implode(',', array_map($literal, array_values($a))).");\n";
}
$files['03-additional-guards.sql'] = $header."-- Execute as the existing upms_guard85@localhost definer after separately verified authority.\nDELIMITER \$\$\n";
foreach (MoneyGuards::plan('upms_runtime84') as $name => $r) {
    $files['03-additional-guards.sql'] .= 'CREATE DEFINER=`upms_guard85`@`localhost` TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']."\$\$\n";
}
$files['03-additional-guards.sql'] .= "DELIMITER ;\n";
$hashes = [];
foreach ($files as $name => $bytes) {
    $f = fopen($out.'/'.$name, 'xb');
    if (!$f) {
        throw new RuntimeException('PLAN_FILE_EXISTS');
    }fwrite($f, $bytes);
    fclose($f);
    $hashes[$name] = hash('sha256', $bytes);
}
$manifest = ['status' => 'NOT_APPROVED_NOT_APPLIED','moneyPlanHash' => MoneySchema::hash(),'baseGuardHash' => CrudGuards::hash(),'additionalGuardHash' => MoneyGuards::hash('upms_runtime84'),'tablesAdded' => 5,'guardsAdded' => 15,'expectedTotalTables' => 25,'expectedTotalGuards' => 60,'accounts' => $accounts,'files' => $hashes,'receiptFinalization' => 'Requires separate target-bound schema/guard/recovery verification and owner-approved release; not generated here.','legacyBackupCompatible' => false];
$f = fopen($out.'/manifest.json', 'xb');
fwrite($f, json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n");
fclose($f);
echo json_encode(['prepared' => true,'executedSql' => false,'approved' => false,'output' => $out,'files' => count($files) + 1]).PHP_EOL;
