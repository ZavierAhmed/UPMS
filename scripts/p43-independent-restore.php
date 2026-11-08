<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||PHP_OS_FAMILY!=='Linux'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$dir=getenv('P43_RECOVERY_DIR');$base=getenv('HOME').'/.cache/upms-php81-local';
if(!is_string($dir)||!str_starts_with($dir,$base.'/p42c-')||$argc!==3){exit(1);}
require $dir.'/release/private/backend/vendor/autoload.php';
require dirname(__DIR__).'/deployment/phase-4/recovery-key-capsule.php';

/** Effective Linux UID without depending on the optional PHP POSIX extension. */
function p43RecoveryEffectiveUid(): int
{
    if (function_exists('posix_geteuid')) {
        return posix_geteuid();
    }
    // /proc/self/status exposes real, effective, saved and filesystem UIDs.
    $status = @file_get_contents('/proc/self/status');
    if (!is_string($status)
        || !preg_match('/^Uid:[ \t]+[0-9]+[ \t]+([0-9]+)[ \t]+[0-9]+[ \t]+[0-9]+[ \t]*$/m', $status, $match)) {
        throw new RuntimeException('RECOVERY_EFFECTIVE_UID_UNAVAILABLE');
    }
    return (int)$match[1];
}

$pair=null;$passphrase=null;
try{
 $archive=$argv[1];$capsulePath=$argv[2];
 $expected='df1ca9b785b4f60a9eb87c93aada5af9ed9b9dae6f51862dc247f94677bc50af';
 if(!is_file($archive)||is_link($archive)||hash_file('sha256',$archive)!==$expected){throw new RuntimeException('TRUSTED_PRODUCTION_ARCHIVE_REJECTED');}
 $passphrase=stream_get_contents(STDIN,4096);
 $opened=P4RecoveryKeyCapsule::open(json_decode(file_get_contents($capsulePath),true,32,JSON_THROW_ON_ERROR),$passphrase);
 sodium_memzero($passphrase);$passphrase=null;$pair=$opened['keyPair'];
 if($opened['recipientSha256']!=='6de4351eff470bb9d7ed213571e48a26254b5e16c8e327f7d28541036e286464'){throw new RuntimeException('APPROVED_RECIPIENT_REJECTED');}
 if(!preg_match('~^base64:[A-Za-z0-9+/]{43}=$~D',$opened['applicationKey'])){throw new RuntimeException('PRODUCTION_APPLICATION_KEY_CUSTODY_REQUIRED');}
 file_put_contents($dir.'/recovered-application.key',$opened['applicationKey']);chmod($dir.'/recovered-application.key',0600);
 $snapshot=App\Upms\ProductionRecoveryV2::decrypt(file_get_contents($archive),$pair);
 if(($snapshot['proof']['accounts']['runtime']??'')!=='upms_runtime_v2@localhost'
  ||($snapshot['proof']['targetHash']??'')!=='bcbee5f84b54675bdc11c69ca3788b567cc3b19f82bf66ec5e92f87e5e5a5004'){throw new RuntimeException('PRODUCTION_RECOVERY_TARGET_REJECTED');}
 $root=new PDO('mysql:unix_socket='.$dir.'/mysql.sock;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
 if(!(int)$root->query('SELECT @@skip_networking')->fetchColumn()){throw new RuntimeException('OFFLINE_ENGINE_REQUIRED');}
 $schema='upms_stage_43_restore';$root->exec('CREATE DATABASE `'.$schema.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 $accounts=[];$connections=[];
 foreach(['installer'=>'CREATE,REFERENCES,SELECT,INSERT,UPDATE','definer'=>'SELECT,TRIGGER','runtime'=>'SELECT,INSERT,UPDATE,DELETE'] as $role=>$grants){
  $user='p43_independent_'.$role;$secret=bin2hex(random_bytes(32));
  $root->exec('CREATE USER '.$root->quote($user)."@'localhost' IDENTIFIED BY ".$root->quote($secret));
  $root->exec('GRANT '.$grants.' ON `'.str_replace('_','\\_',$schema).'`.* TO '.$root->quote($user)."@'localhost'");
  $accounts[$role]=$user.'@localhost';$connections[$role]=new PDO('mysql:unix_socket='.$dir.'/mysql.sock;dbname='.$schema.';charset=utf8mb4',$user,$secret,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);sodium_memzero($secret);
 }
 $restored=App\Upms\ProductionRecoveryV2::restoreIsolated($connections['installer'],$connections['definer'],$snapshot,$accounts);
 $report=['technicalRestorePassed'=>true,'createdUtc'=>gmdate('c'),'archiveSha256'=>$expected,
  'sourceSchema'=>'upms_v2','sourceTargetHash'=>$snapshot['proof']['targetHash'],'release'=>'e3e9ece1d2bdc8e282a5481dd01bb3960059ac91',
  'recipientSha256'=>$opened['recipientSha256'],'recoveryHost'=>gethostname(),'recoveryUid'=>p43RecoveryEffectiveUid(),
  'dpapiRequired'=>false,'applicationKeyRecovered'=>true,'applicationKeySha256'=>hash('sha256',$opened['applicationKey']),
  'restore'=>$restored,'operatorName'=>null,'operatorSignature'=>null,
  'separateComputerAndAccountAttested'=>false,'ownerAccepted'=>false,'independentOwnerRecoveryVerified'=>false];
 file_put_contents($dir.'/independent-restore-receipt.pending.json',json_encode($report,JSON_PRETTY_PRINT));
 echo json_encode($report,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage().PHP_EOL:"INDEPENDENT_RESTORE_FAILED\n");exit(1);}
finally{if(is_string($pair)){sodium_memzero($pair);}if(is_string($passphrase)){sodium_memzero($passphrase);}}
