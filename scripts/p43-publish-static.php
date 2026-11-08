<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$mode=getenv('P43_STATIC_ACTION');if(!in_array($mode,['install','rollback'],true)){exit(1);}
$private='/home/tsn6az96j3v7/upms-private/p43';$web='/home/tsn6az96j3v7/public_html';
$stateFile=$private.'/website-publication.json';$old=json_decode(file_get_contents($private.'/public-rollback-hashes.json'),true,512,JSON_THROW_ON_ERROR);
$archive=$private.'/upms-public-static.zip';$rollback=$private.'/clean-install-public-rollback.tar.gz';$changed=false;
function safe43(string $n):bool{return $n!==''&&!str_starts_with($n,'/')&&!str_contains($n,'..')&&!str_contains($n,'\\')&&!str_contains($n,':')&&!preg_match('~^(dashboard|cgi-bin|\.well-known)(/|$)~i',$n);}
function replace43(string $file,string $bytes):void{
 if(is_link($file)){throw new RuntimeException('SYMLINK_REJECTED');}
 if(!is_dir(dirname($file))&&!mkdir(dirname($file),0755,true)){throw new RuntimeException('DIRECTORY_CREATE_FAILED');}
 for($dir=dirname($file);$dir!=='/home/tsn6az96j3v7/public_html';$dir=dirname($dir)){
  if(!str_starts_with($dir,'/home/tsn6az96j3v7/public_html/')||is_link($dir)||!chmod($dir,0755)){throw new RuntimeException('PUBLIC_DIRECTORY_PERMISSIONS_REJECTED');}
 }
 $tmp=$file.'.p43-new';if(is_link($tmp)||file_exists($tmp)){throw new RuntimeException('TEMP_COLLISION');}
 if(file_put_contents($tmp,$bytes)!==strlen($bytes)||!chmod($tmp,0644)||!rename($tmp,$file)){throw new RuntimeException('PUBLIC_REPLACE_FAILED');}
}
function dashboard43(string $web):array{
 $r=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($web.'/dashboard',FilesystemIterator::SKIP_DOTS)) as $f){if($f->isFile()){$r[substr($f->getPathname(),strlen($web)+1)]=hash_file('sha256',$f->getPathname());}}ksort($r);return $r;
}
try{
 if(hash_file('sha256',$archive)!=='6f3ef919bacb29139c21bc165ec2891978912c70746e07ca5d1de7982a394525'||hash_file('sha256',$rollback)!=='cb2cd0ec0462a0bd5af3172518c3e406fd81840ccd5498f1544de3166ebd2723'||count($old)!==114){throw new RuntimeException('ARCHIVE_OR_ROLLBACK_REJECTED');}
 $z=new ZipArchive();if($z->open($archive)!==true){throw new RuntimeException('ZIP_REJECTED');}
 $manifest=json_decode($z->getFromName('release-manifest.json'),true,512,JSON_THROW_ON_ERROR);$new=$manifest['files'];
 if($z->numFiles!==count($new)+1){throw new RuntimeException('ZIP_COUNT_REJECTED');}
 $new['release-manifest.json']=hash('sha256',$z->getFromName('release-manifest.json'));
 foreach($new as $n=>$h){if(!safe43($n)||hash('sha256',$z->getFromName($n))!==$h){throw new RuntimeException('CANDIDATE_FILE_REJECTED');}}
 foreach($old as $n=>$h){if(!safe43($n)){throw new RuntimeException('ROLLBACK_PATH_REJECTED');}}
 if($mode==='rollback'){
  $state=json_decode(file_get_contents($stateFile),true,512,JSON_THROW_ON_ERROR);
  if(($state['new']??null)!==$new||($state['old']??null)!==$old){throw new RuntimeException('ROLLBACK_STATE_REJECTED');}
  $dir=$private.'/website-rollback-extracted';if(!is_dir($dir)){mkdir($dir,0700);}
  $p=proc_open(['tar','-xzf',$rollback,'-C',$dir],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);fclose($pipes[0]);stream_get_contents($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);if(proc_close($p)!==0){throw new RuntimeException('ROLLBACK_EXTRACTION_FAILED');}
  foreach($old as $n=>$h){if(hash_file('sha256',$dir.'/'.$n)!==$h){throw new RuntimeException('ROLLBACK_PAYLOAD_REJECTED');}}
  foreach($new as $n=>$h){if(!isset($old[$n])&&is_file($web.'/'.$n)){if(hash_file('sha256',$web.'/'.$n)!==$h){throw new RuntimeException('NEW_FILE_CHANGED_SINCE_PUBLICATION');}unlink($web.'/'.$n);}}
  foreach(array_diff_key($old,['.htaccess'=>true]) as $n=>$h){replace43($web.'/'.$n,file_get_contents($dir.'/'.$n));}
  replace43($web.'/.htaccess',file_get_contents($dir.'/.htaccess'));
  foreach($old as $n=>$h){if(hash_file('sha256',$web.'/'.$n)!==$h){throw new RuntimeException('ROLLBACK_VERIFICATION_FAILED');}}
  if(dashboard43($web)!==$state['dashboard']){throw new RuntimeException('DASHBOARD_CHANGED');}
  $state['rolledBack']=true;$state['rollbackVerified']=true;file_put_contents($stateFile,json_encode($state,JSON_PRETTY_PRINT));
  echo json_encode(['passed'=>true,'rolledBack'=>true,'filesRestored'=>114,'dashboardUnchanged'=>true]).PHP_EOL;exit;
 }
 if(file_exists($stateFile)){
  $previous=json_decode(file_get_contents($stateFile),true,512,JSON_THROW_ON_ERROR);
  if(($previous['rolledBack']??false)!==true||($previous['rollbackVerified']??false)!==true
    ||!rename($stateFile,$stateFile.'.rolled-back-'.gmdate('YmdHis'))){throw new RuntimeException('EXISTING_PUBLICATION_REQUIRES_REVIEW');}
 }
 foreach($old as $n=>$h){if(is_link($web.'/'.$n)||!is_file($web.'/'.$n)||hash_file('sha256',$web.'/'.$n)!==$h){throw new RuntimeException('LIVE_ROLLBACK_PARITY_FAILED');}}
 foreach($new as $n=>$h){if(!isset($old[$n])&&file_exists($web.'/'.$n)){throw new RuntimeException('UNRELATED_PUBLIC_FILE_COLLISION');}}
 $state=['approved'=>'FINAL_GODADDY_STATIC_PUBLICATION','new'=>$new,'old'=>$old,'dashboard'=>dashboard43($web),'delete'=>array_keys(array_diff_key($old,$new)),'startedUtc'=>gmdate('c'),'rolledBack'=>false];
 file_put_contents($stateFile,json_encode($state,JSON_PRETTY_PRINT));chmod($stateFile,0600);
 foreach(array_diff_key($new,['.htaccess'=>true]) as $n=>$h){$changed=true;replace43($web.'/'.$n,$z->getFromName($n));}
 $changed=true;replace43($web.'/.htaccess',$z->getFromName('.htaccess'));
 foreach($state['delete'] as $n){if(hash_file('sha256',$web.'/'.$n)!==$old[$n]){throw new RuntimeException('DELETE_TARGET_CHANGED');}unlink($web.'/'.$n);}
 foreach($new as $n=>$h){if(hash_file('sha256',$web.'/'.$n)!==$h){throw new RuntimeException('PUBLICATION_HASH_FAILED');}}
 if(dashboard43($web)!==$state['dashboard']){throw new RuntimeException('DASHBOARD_CHANGED');}
 $state['filesVerified']=count($new);file_put_contents($stateFile,json_encode($state,JSON_PRETTY_PRINT));
 echo json_encode(['passed'=>true,'installed'=>true,'filesVerified'=>count($new),'deletedFiles'=>count($state['delete']),'dashboardUnchanged'=>true,'externalAcceptancePending'=>true]).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'STATIC_PUBLICATION_FAILED','filesMayHaveChanged'=>$changed,'rollbackCommand'=>'P43_STATIC_ACTION=rollback']).PHP_EOL;exit(1);}
