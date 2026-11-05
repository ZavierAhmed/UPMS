<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') { exit(1); }
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{ChequeExtras,ChequeGuards};
\Illuminate\Container\Container::getInstance()->instance('config',new \Illuminate\Config\Repository(['upms'=>['cheque_extras_enabled'=>true]]));
$binding=json_decode(file_get_contents(dirname(__DIR__,3).'/tmp/php-runtime/uat2-owner-binding.json'),true,32,JSON_THROW_ON_ERROR);
if(!preg_match('/^upms_test_php_money_[0-9]+$/D',$binding['schema'])) { throw new RuntimeException('UAT2A_LOCAL_OWNER_SCHEMA_REQUIRED'); }
$runtime=$binding['runtime'];
$sql="-- Review plan for the existing local port 5196 workspace only.\n-- Requires separate owner authorization, fresh encrypted recovery proof and maintenance.\n-- DDL is not transactional. Stop on any error and retain the maintenance state.\n-- Execute using the existing local maintenance identity, never the runtime identity.\nUSE `".$binding['schema']."`;\n";
foreach(ChequeExtras::plan() as $ddl) { $sql.=$ddl.";\n"; }
$sql.="INSERT INTO cheque_extra_receipts VALUES(1,'".ChequeExtras::VERSION."','".ChequeExtras::hash()."',UTC_TIMESTAMP(6));\nDELIMITER $$\nDROP TRIGGER upmscq_cheque_issuing_banks_insert$$\n";
foreach(ChequeGuards::plan($runtime) as $name=>$rule) {
    if(str_starts_with($name,'upmscqa_')||$name==='upmscq_cheque_issuing_banks_insert') { $sql.='CREATE TRIGGER `'.$name.'` BEFORE '.$rule['event'].' ON `'.$rule['table'].'` FOR EACH ROW '.$rule['body']."$$\n"; }
}
$sql.="DELIMITER ;\n-- Expected final state is 47 tables and 133 guards.\n-- Preserve all original rows and verify all 123 unaffected guard definitions.\n-- Publish a fresh target-bound guard proof and enable the local extras flag only after verification.\n";
echo $sql;
