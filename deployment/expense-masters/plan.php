<?php

// Offline review bundle only. No database connection, credential, grant, activation or financial opening.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__, 2).'/upms.php/vendor/autoload.php';
use App\Upms\{CrudGuards,MoneyGuards,MoneySchema,ExpenseGuards,ExpenseSchema};

$o = getopt('', ['output:']);
$out = $o['output'] ?? __DIR__.'/review-plan';
if (is_link($out) || is_dir($out) && array_diff(scandir($out), ['.','..'])) {
    throw new RuntimeException('EMPTY_REVIEW_DIRECTORY_REQUIRED');
}
if (!is_dir($out) && !mkdir($out, 0700, true)) {
    throw new RuntimeException('REVIEW_DIRECTORY_REQUIRED');
}

$header = "-- REVIEW ONLY. Owner approval, verified recovery, maintenance and preflight are required.\n-- DDL is not transactionally atomic. Stop on any error; never reset/retry a partial migration.\n-- This plan does not create verified balances, grant privileges, update old guards or activate expense masters or Money Accounts.\n";
$files = ['01-schema.sql' => $header.implode(";\n", array_values(ExpenseSchema::plan()['tables'])).";\n"];
$files['02-additional-guards.sql'] = $header."-- Execute as the existing upms_guard85@localhost definer after separately verified authority.\nDELIMITER \$\$\n";
foreach (ExpenseGuards::plan('upms_runtime84') as $name => $r) {
    $files['02-additional-guards.sql'] .= 'CREATE DEFINER=`upms_guard85`@`localhost` TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']."\$\$\n";
}
$files['02-additional-guards.sql'] .= "DELIMITER ;\n";
$hashes = [];
foreach ($files as $name => $bytes) {
    $f = fopen($out.'/'.$name, 'xb');
    if (!$f) {
        throw new RuntimeException('PLAN_FILE_EXISTS');
    }fwrite($f, $bytes);
    fclose($f);
    $hashes[$name] = hash('sha256', $bytes);
}
$manifest = ['status'=>'NOT_APPROVED_NOT_APPLIED','expensePlanHash'=>ExpenseSchema::hash(),'moneyPlanHash'=>MoneySchema::hash(),'baseGuardHash'=>CrudGuards::hash(),'moneyGuardHash'=>MoneyGuards::hash('upms_runtime84'),'expenseGuardHash'=>ExpenseGuards::hash('upms_runtime84'),'tablesAdded'=>4,'guardsAdded'=>12,'expectedTotalTables'=>29,'expectedTotalGuards'=>72,'files'=>$hashes,'receiptFinalization'=>'Requires separate target-bound verification, protected off-host recovery and owner approval. No receipt or activation is generated here.','legacyBackupCompatible'=>false];
$f = fopen($out.'/manifest.json', 'xb');
fwrite($f, json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n");
fclose($f);
echo json_encode(['prepared' => true,'executedSql' => false,'approved' => false,'output' => $out,'files' => count($files) + 1]).PHP_EOL;
