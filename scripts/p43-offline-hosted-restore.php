<?php
declare(strict_types=1);
ini_set('zend.exception_ignore_args','1');umask(0077);
$dir=getenv('P43_RECOVERY_DIR');$base=getenv('HOME').'/.cache/upms-php81-local';
if(PHP_SAPI!=='cli'||PHP_OS_FAMILY!=='Linux'||!is_string($dir)||!str_starts_with($dir,$base.'/p42c-')){exit(1);}
require $dir.'/release/private/backend/vendor/autoload.php';
try{
 $archive='/mnt/c/Users/zasah/source/repos/UPMS/tmp/protected-offhost-backups/p43-stage-recovery/archive.upmsbk';
 $keyFile='/mnt/c/Users/zasah/source/repos/UPMS/tmp/protected-offhost-backups/p43-stage-recovery/synthetic-stage.key';
 if(hash_file('sha256',$archive)!=='c679bbbd04104c711b8cd2d8c4b1b00f04435c023cc0e15930cf2b5a5f2201dc'){throw new RuntimeException('TRUSTED_ARCHIVE_CHECKSUM_REJECTED');}
 $root=new PDO('mysql:unix_socket='.$dir.'/mysql.sock;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
 if(!(int)$root->query('SELECT @@skip_networking')->fetchColumn()){throw new RuntimeException('OFFLINE_ENGINE_REQUIRED');}
 $schema='upms_stage_43_restore';$root->exec('CREATE DATABASE `'.$schema.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 $accounts=[];$pdo=[];
 foreach(['installer'=>'CREATE,REFERENCES,SELECT,INSERT,UPDATE','definer'=>'SELECT,TRIGGER','runtime'=>'SELECT,INSERT,UPDATE,DELETE'] as $role=>$grants){
  $user='p43_restore_'.$role;$password=bin2hex(random_bytes(32));
  $root->exec('CREATE USER '.$root->quote($user)."@'localhost' IDENTIFIED BY ".$root->quote($password));
  $root->exec('GRANT '.$grants.' ON `'.str_replace('_','\\_',$schema).'`.* TO '.$root->quote($user)."@'localhost'");
  $accounts[$role]=$user.'@localhost';$pdo[$role]=new PDO('mysql:unix_socket='.$dir.'/mysql.sock;dbname='.$schema.';charset=utf8mb4',$user,$password,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
 }
 $snapshot=App\Upms\ProductionRecoveryV2::decrypt(file_get_contents($archive),file_get_contents($keyFile));
 $report=App\Upms\ProductionRecoveryV2::restoreIsolated($pdo['installer'],$pdo['definer'],$snapshot,$accounts);
 $result=['passed'=>true,'realHostedArchive'=>true,'sourceSchema'=>'upms_stage_43','restoreSchema'=>$schema,
  'archiveSha256'=>hash_file('sha256',$archive),'offlineEngine'=>true,'independentOwnerRecoveryVerified'=>false,'restore'=>$report];
 file_put_contents('/mnt/c/Users/zasah/source/repos/UPMS/tmp/phase-4.3/hosted-archive-isolated-restore.json',json_encode($result,JSON_PRETTY_PRINT));
 echo json_encode($result,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'HOSTED_ARCHIVE_RESTORE_FAILED']).PHP_EOL;exit(1);}
