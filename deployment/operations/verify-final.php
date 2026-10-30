<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$s='/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
require $s.'/php85-tools/readiness-support.php';
try {
$c=App\Upms\ProductionProfile::load($s.'/runtime/runtime85.json');
$p=App\Upms\ProductionConnection::connect($c);
$g=App\Upms\RuntimePrivileges::verify($p,$c);
$gc=App\Upms\ProductionProfile::load($s.'/runtime/guard85-profile.json','read-only-transport-verification');
$guards=App\Upms\CrudGuards::verify(App\Upms\ProductionConnection::connect($gc));
$r=['release'=>release85($s),'grants'=>$g,'guards'=>$guards,'databaseReceiptState'=>$p->query('SELECT state FROM upms_production_migrations WHERE id=1')->fetchColumn(),'businessControlState'=>$p->query('SELECT state FROM v1_control WHERE id=1')->fetchColumn(),'verifiedUtc'=>gmdate('c')];
$r['passed']=$r['release']['passed']&&$g['passed']&&$r['databaseReceiptState']==='ACTIVATED'&&$r['businessControlState']==='READY';
privateJson($s.'/runtime/final86.json',$r);echo json_encode($r,JSON_PRETTY_PRINT).PHP_EOL;exit($r['passed']?0:1);
}catch(Throwable $e){echo json_encode(['passed'=>false,'code'=>'FINAL_VERIFICATION_FAILED']);exit(1);}