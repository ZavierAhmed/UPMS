<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$root='/home/tsn6az96j3v7/upms-releases/p43/management-570362622816';
$dir='/home/tsn6az96j3v7/upms-private/p43/stage43';
require $root.'/private/backend/vendor/autoload.php';
try{
 $keyFile=$dir.'/synthetic-backup.key';
 if(!file_exists($keyFile)){file_put_contents($keyFile,sodium_crypto_box_keypair());chmod($keyFile,0600);}
 $key=file_get_contents($keyFile);$recipient=sodium_crypto_box_publickey($key);
 $p=proc_open([PHP_BINARY,$root.'/private/backend/operations/backup-cumulative.php',
  $dir.'/backup.recovery.json',$dir.'/definer.recovery.json',$dir.'/runtime.json'],
  [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 fwrite($pipes[0],base64_encode($recipient));fclose($pipes[0]);$cipher=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);
 fclose($pipes[1]);fclose($pipes[2]);$rc=proc_close($p);
 if($rc!==0){file_put_contents($dir.'/backup-diagnostic.log',$err);chmod($dir.'/backup-diagnostic.log',0600);throw new RuntimeException(preg_match('/^[A-Z][A-Z0-9_]+$/D',trim($err))?trim($err):'BACKUP_FAILED');}
 $receipt=json_decode($err,true,16,JSON_THROW_ON_ERROR);
 if(!hash_equals($receipt['sha256'],hash('sha256',$cipher))){throw new RuntimeException('CHECKSUM_FAILED');}
 $snapshot=App\Upms\ProductionRecoveryV2::decrypt($cipher,$key);
 $tampered=$cipher;$tampered[strlen($cipher)-1]=chr(ord($tampered[strlen($cipher)-1])^1);$rejected=false;
 try{App\Upms\ProductionRecoveryV2::decrypt($tampered,$key);}catch(Throwable){$rejected=true;}
 if(!$rejected){throw new RuntimeException('TAMPER_ACCEPTED');}
 file_put_contents($dir.'/synthetic-stage.upmsbk',$cipher);chmod($dir.'/synthetic-stage.upmsbk',0600);
 $report=['passed'=>true,'authenticatedBackupAccount'=>'upms_b43@localhost','readerPrivileges'=>['SELECT'],
  'guardVerifier'=>'upms_g43@localhost','sha256'=>$receipt['sha256'],'bytes'=>strlen($cipher),
  'tables'=>count($snapshot['tables']),'guards'=>count($snapshot['guards']),'authenticatedDecryptionVerified'=>true,
  'tamperRejected'=>$rejected,'isolatedRestoreVerified'=>false,'independentOwnerRecoveryVerified'=>false,
  'businessPostingEnabled'=>false];
 file_put_contents($dir.'/backup-check.json',json_encode($report,JSON_PRETTY_PRINT));chmod($dir.'/backup-check.json',0600);
 echo json_encode($report,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'STAGE_BACKUP_CHECK_FAILED']).PHP_EOL;exit(1);}
