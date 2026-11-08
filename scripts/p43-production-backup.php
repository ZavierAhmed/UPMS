<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$dir='/home/tsn6az96j3v7/upms-private/p43/production-v2';
$root='/home/tsn6az96j3v7/upms-releases/p43/management-570362622816';
try{
 $recipient=trim(file_get_contents('/home/tsn6az96j3v7/upms-php83-staging/runtime/offhost-recipient.pub'));
 $public=base64_decode($recipient,true);if($public===false||strlen($public)!==32){throw new RuntimeException('APPROVED_RECIPIENT_REJECTED');}
 $process=proc_open([PHP_BINARY,$root.'/private/backend/operations/backup-cumulative.php',$dir.'/backup.recovery.json',$dir.'/definer.recovery.json',$dir.'/runtime.json'],
  [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 fwrite($pipes[0],$recipient);fclose($pipes[0]);$cipher=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$rc=proc_close($process);
 if($rc!==0){file_put_contents($dir.'/backup-diagnostic.log',$error);chmod($dir.'/backup-diagnostic.log',0600);throw new RuntimeException('PRODUCTION_BACKUP_FAILED');}
 $receipt=json_decode($error,true,16,JSON_THROW_ON_ERROR);
 if(($receipt['tables']??0)!==47||($receipt['guards']??0)!==133||!hash_equals($receipt['sha256'],hash('sha256',$cipher))){throw new RuntimeException('BACKUP_RECEIPT_REJECTED');}
 $name='upms-v2-'.gmdate('YmdHis').'.upmsbk';
 if(file_exists($dir.'/'.$name)||file_put_contents($dir.'/'.$name,$cipher)!==strlen($cipher)||!chmod($dir.'/'.$name,0600)){throw new RuntimeException('CIPHERTEXT_STORAGE_FAILED');}
 $result=$receipt+['passed'=>true,'schema'=>'upms_v2','backupAccount'=>'upms_backup_v2@localhost','readerPrivileges'=>['SELECT'],
  'archive'=>$name,'bytes'=>strlen($cipher),'recipientSha256'=>hash('sha256',$public),'privateKeyUploaded'=>false,'independentOwnerRecoveryVerified'=>false];
 file_put_contents($dir.'/production-backup-latest.json',json_encode($result,JSON_PRETTY_PRINT));chmod($dir.'/production-backup-latest.json',0600);
 echo json_encode($result,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'PRODUCTION_BACKUP_FAILED']).PHP_EOL;exit(1);}
