<?php
declare(strict_types=1);
// Private preparation only. This script never writes into either public document root.
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$base='/home/tsn6az96j3v7/upms-private/p43';$private=$base.'/production-v2';
$release='/home/tsn6az96j3v7/upms-releases/p43/management-570362622816';
$web='/home/tsn6az96j3v7/public_html/dashboard';
function privateCutoverFile(string $path,string $contents):void{
 if(is_link($path)){throw new RuntimeException('PRIVATE_PATH_REJECTED');}
 if(!is_dir(dirname($path))&&!mkdir(dirname($path),0700,true)){throw new RuntimeException('PRIVATE_DIRECTORY_FAILED');}
 if(file_exists($path)){if(!hash_equals(hash_file('sha256',$path),hash('sha256',$contents))){throw new RuntimeException('EXISTING_PRIVATE_FILE_DIFFERS');}return;}
 if(file_put_contents($path,$contents)!==strlen($contents)||!chmod($path,0600)){throw new RuntimeException('PRIVATE_WRITE_FAILED');}
}
try{
 if(hash_file('sha256',$base.'/management-p43.zip')!=='57036262281670a5f33123332ed357f749d528ea0b82503a3dbe647226523691'){throw new RuntimeException('ARCHIVE_REJECTED');}
 require $release.'/private/backend/vendor/autoload.php';
 $profile=App\Upms\ProductionProfile::load($private.'/runtime.json');App\Upms\ProductionRelease::verify($profile);
 $pdo=App\Upms\ProductionConnection::connect($profile);App\Upms\CumulativeProduction::runtime($pdo,$profile);
 if($pdo->query('SELECT state FROM v1_control WHERE id=1')->fetchColumn()!=='PENDING'){throw new RuntimeException('POSTING_MUST_REMAIN_DISABLED');}
 $state=json_decode(file_get_contents($base.'/website-publication.json'),true,512,JSON_THROW_ON_ERROR);
 $old=[];
 foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($web,FilesystemIterator::SKIP_DOTS)) as $f){
  if($f->isFile()){$n='dashboard/'.substr($f->getPathname(),strlen($web)+1);if($f->isLink()){throw new RuntimeException('PUBLISHED_SYMLINK_REJECTED');}$old[$n]=hash_file('sha256',$f->getPathname());}
 }
 ksort($old);if($old!==$state['dashboard']){throw new RuntimeException('PREVIOUS_DASHBOARD_CHANGED');}
 if(!file_exists($private.'/application.key')){privateCutoverFile($private.'/application.key','base64:'.base64_encode(random_bytes(32)));}
 $applicationKey=file_get_contents($private.'/application.key');
 if(!preg_match('~^base64:[A-Za-z0-9+/]{43}=$~D',$applicationKey)){throw new RuntimeException('PRIVATE_APPLICATION_KEY_REJECTED');}
 $env=file_get_contents($base.'/stage43/runtime.env');
 $env=preg_replace('/^APP_KEY=.*$/m','APP_KEY='.$applicationKey,$env);
 $env=str_replace($base.'/stage43/runtime.json',$private.'/runtime.json',$env);
 privateCutoverFile($private.'/runtime.env',$env);privateCutoverFile($release.'/private/backend/.env',$env);
 $manifest=json_decode(file_get_contents($release.'/RELEASE.json'),true,512,JSON_THROW_ON_ERROR);$incoming=[];
 foreach($manifest['files'] as $n=>$hash){
  if(!str_starts_with($n,'management/')){continue;}$relative=substr($n,11);$bytes=file_get_contents($release.'/'.$n);
  if(hash('sha256',$bytes)!==$hash){throw new RuntimeException('MANAGEMENT_PAYLOAD_REJECTED');}
  if($relative==='.htaccess'){$bytes.="\n# Reviewed P4.3 private PHP binding.\nSetEnv UPMS_PRIVATE_BACKEND ".$release."/private/backend\n";}
  privateCutoverFile($base.'/cutover-dashboard/'.$relative,$bytes);$incoming[$relative]=hash('sha256',$bytes);
 }
 foreach($old as $n=>$hash){$relative=substr($n,10);privateCutoverFile($base.'/cutover-rollback/dashboard/'.$relative,file_get_contents($web.'/'.$relative));}
 $result=['preparedUtc'=>gmdate('c'),'prepared'=>true,'ready'=>false,'approved'=>false,'bindingSwitched'=>false,'publicWebsiteChanged'=>false,
  'origin'=>'https://app.unique-plastic.com','targetSchema'=>'upms_v2','runtimeAccount'=>'upms_runtime_v2@localhost',
  'backupAccount'=>'upms_backup_v2@localhost','releaseSha256'=>'57036262281670a5f33123332ed357f749d528ea0b82503a3dbe647226523691',
  'targetDirectory'=>$web,'privateBackend'=>$release.'/private/backend','privateProfile'=>$private.'/runtime.json',
  'applicationKeySha256'=>hash('sha256',$applicationKey),
  'filesToPublish'=>$incoming,'filesToDelete'=>[],'rollbackFiles'=>$old,'rollbackDirectory'=>$base.'/cutover-rollback/dashboard',
  'previousDashboardUnchanged'=>true,'businessPostingEnabled'=>false,'smtpEnabled'=>false,'attachmentsEnabled'=>false,
  'blockedBy'=>['Independent owner recovery not completed','Owner administrator handoff and first rotation pending','Explicit management cutover approval not recorded'],
  'nonemptyFinancialAcceptance'=>'Not run; separate staging activation and legitimate recovery gates required',
  'actionAfterGates'=>'Recheck actual identities, grants, 47/133, recovery receipt, handoff and explicit approval; publish only these eight staged files with atomic replacements and preserved rollback; keep control PENDING; immediately verify HTTPS/login/read views/exports and roll back on failure'];
 file_put_contents($base.'/cutover-plan.json',json_encode($result,JSON_PRETTY_PRINT));chmod($base.'/cutover-plan.json',0600);
 echo json_encode($result,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['prepared'=>false,'bindingSwitched'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'PRIVATE_CUTOVER_PREPARATION_FAILED']).PHP_EOL;exit(1);}
