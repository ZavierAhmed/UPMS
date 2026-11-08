<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$base='/home/tsn6az96j3v7/upms-private/p43';
$schema=getenv('P43_INITIALIZE_TARGET')?:'upms_stage_43';
if(!in_array($schema,['upms_stage_43','upms_v2'],true)){exit(1);}
$production=$schema==='upms_v2';
$identities=$production?['installer'=>'upms_init_v2','definer'=>'upms_guard_v2','runtime'=>'upms_runtime_v2','backup'=>'upms_backup_v2']:
 ['installer'=>'upms_i43','definer'=>'upms_g43','runtime'=>'upms_r43','backup'=>'upms_b43'];
$release='/home/tsn6az96j3v7/upms-releases/p43/management-570362622816';
$stage='archive';
function private43(string $p,array|string $v):void{
 if(is_link($p)){throw new RuntimeException('PRIVATE_PATH_REJECTED');}
 $v=is_array($v)?json_encode($v,JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT):$v;
 if(file_put_contents($p,$v)!==strlen($v)||!chmod($p,0600)){throw new RuntimeException('PRIVATE_WRITE_FAILED');}
}
try{
 $zip=$base.'/management-p43.zip';
 if(hash_file('sha256',$zip)!=='57036262281670a5f33123332ed357f749d528ea0b82503a3dbe647226523691'){throw new RuntimeException('ARCHIVE_REJECTED');}
 foreach(['/home/tsn6az96j3v7/upms-releases','/home/tsn6az96j3v7/upms-releases/p43',$release] as $d){
  if(is_link($d)||(!is_dir($d)&&!mkdir($d,0700))){throw new RuntimeException('PRIVATE_RELEASE_PATH_REJECTED');}
 }
 $z=new ZipArchive();if($z->open($zip)!==true){throw new RuntimeException('ZIP_REJECTED');}
 $m=json_decode($z->getFromName('RELEASE.json'),true,64,JSON_THROW_ON_ERROR);
 if($z->numFiles!==count($m['files'])+1){throw new RuntimeException('MANIFEST_COUNT_REJECTED');}
 for($n=0;$n<$z->numFiles;$n++){
  $name=$z->getNameIndex($n);$bytes=$z->getFromIndex($n);
  if(str_contains($name,'..')||str_starts_with($name,'/')||str_contains($name,'\\')||str_contains($name,':')
    ||($name!=='RELEASE.json'&&hash('sha256',$bytes)!==($m['files'][$name]??''))){throw new RuntimeException('MANIFEST_ENTRY_REJECTED');}
  $file=$release.'/'.$name;if(!is_dir(dirname($file))&&!mkdir(dirname($file),0700,true)){throw new RuntimeException('RELEASE_DIRECTORY_FAILED');}
  if(file_exists($file)){if(is_link($file)||hash_file('sha256',$file)!==hash('sha256',$bytes)){throw new RuntimeException('EXISTING_RELEASE_DIFFERS');}}
  elseif(file_put_contents($file,$bytes)!==strlen($bytes)){throw new RuntimeException('RELEASE_WRITE_FAILED');}
 }
 $z->close();require $release.'/private/backend/vendor/autoload.php';
 $stage='private_profiles';$dir=$base.($production?'/production-v2':'/stage43');if(!is_dir($dir)){mkdir($dir,0700);}
 if(is_link($dir)||(fileperms($dir)&0077)){throw new RuntimeException('PRIVATE_STAGE_REJECTED');}
 $credentials=json_decode(file_get_contents($base.'/resource-credentials.json'),true,32,JSON_THROW_ON_ERROR);
 $p=new PDO('mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname='.$schema.';charset=utf8mb4',$identities['installer'],$credentials[$identities['installer']],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
 if($p->query('SELECT CURRENT_USER()')->fetchColumn()!==$identities['installer'].'@localhost'){throw new RuntimeException('STAGE_IDENTITY_REJECTED');}
 if($p->query('SELECT @@collation_database')->fetchColumn()!=='utf8mb4_unicode_ci'){throw new RuntimeException('STAGE_COLLATION_REJECTED');}
 $meta=$p->query('SELECT VERSION() version,@@server_id server_id')->fetch(PDO::FETCH_ASSOC);
 $common=['enabled'=>true,'mode'=>'one-time-clean-initialization','hostingVerified'=>true,'backupRestoreVerified'=>false,
  'schemaContract'=>App\Upms\CumulativeProduction::CONTRACT,'cumulativeCleanApproved'=>true,'emptyTargetInitializationApproved'=>true,
  'cumulativeRecoveryApproved'=>true,'privateRoot'=>$dir,'publicRoot'=>'/home/tsn6az96j3v7/public_html',
  'managementRoot'=>$release.'/management','transport'=>'unix_socket','socket'=>'/var/lib/mysql/mysql.sock',
  'socketOwnerUid'=>(string)fileowner('/var/lib/mysql/mysql.sock'),'serverHostname'=>gethostname(),'localSocketVerified'=>true,
  'schema'=>$schema,'serverVersion'=>$meta['version'],'serverId'=>(string)$meta['server_id'],
  'origin'=>'https://app.unique-plastic.com','reference'=>$production?'p43_hosted_production_v2':'p43_hosted_stage_43','receiptFile'=>$dir.'/initialization.json',
  'releaseSha'=>$m['sourceCommit'],'releaseManifestSha256'=>hash_file('sha256',$release.'/RELEASE.json'),
  'targetHash'=>App\Upms\CleanInitialization::target($p)];
 $paths=[];$profiles=[];
 foreach($identities as $role=>$user){
  private43($dir.'/'.$role.'.password',$credentials[$user]);
  $profile=$common+['user'=>$user,'account'=>$user.'@localhost','passwordFile'=>$dir.'/'.$role.'.password'];
  private43($dir.'/'.$role.'.initialize.json',$profile);$profiles[$role]=$profile;
  if($role!=='backup'){$paths[]=$dir.'/'.$role.'.initialize.json';}
 }
 $enrollment=$dir.($production?'/private-administrator-handoff.json':'/synthetic-enrollment.json');
 if(!file_exists($enrollment)){private43($enrollment,['admin'=>bin2hex(random_bytes(24)),'haris'=>bin2hex(random_bytes(24))]);}
 $stage='initializer';
 $proc=proc_open([PHP_BINARY,$release.'/private/backend/operations/initialize-cumulative.php',...$paths],
  [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 fwrite($pipes[0],file_get_contents($enrollment));fclose($pipes[0]);$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$rc=proc_close($proc);
 private43($dir.'/initializer-diagnostic.log',$err);
 if($rc!==0){throw new RuntimeException(preg_match('/^[A-Z][A-Z0-9_]+$/D',trim($err))?trim($err):'HOSTED_INITIALIZATION_FAILED');}
 $proof=json_decode(file_get_contents($dir.'/initialization.json.ready'),true,64,JSON_THROW_ON_ERROR);
 $runtime=$profiles['runtime'];$runtime['mode']='approved-production-runtime';$runtime['readinessInspectionApproved']=true;
 $runtime['operators']=$proof['operators'];$runtime['cumulativeEvidenceFile']=$dir.'/initialization.json.ready';
 $runtime['cumulativeEvidenceSha256']=hash_file('sha256',$runtime['cumulativeEvidenceFile']);$runtime['backupAccount']=$identities['backup'].'@localhost';
 private43($dir.'/runtime.json',$runtime);
 foreach(['backup','definer'] as $role){$q=$profiles[$role];$q['mode']='cumulative-recovery-verification';private43($dir.'/'.$role.'.recovery.json',$q);}
 $report=['passed'=>true,'schema'=>$schema,'result'=>json_decode($out,true,32,JSON_THROW_ON_ERROR),
  'productionBindingChanged'=>false,'productionSchemaInitialized'=>$production,'businessPostingEnabled'=>false,'release'=>$release];
 private43($dir.'/hosted-initialization-result.json',$report);echo json_encode($report,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'stage'=>$stage,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'HOSTED_STAGE_PREPARATION_FAILED','statePreserved'=>true]).PHP_EOL;exit(1);}
