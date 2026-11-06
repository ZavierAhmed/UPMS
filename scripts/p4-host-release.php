<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){exit(1);}
$s='/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
require $s.'/php85-tools/readiness-support.php';
$result=['verifiedUtc'=>gmdate('c'),'hostFilesWritten'=>0,'databaseWrites'=>0];
try{
 $result['integrity']=release85($s);
 $manifest=json_decode(file_get_contents($s.'/php84-release/MANIFEST.json'),true,64,JSON_THROW_ON_ERROR);
 foreach(['sourceCommit','sourceSha','kind','createdUtc','builtAt'] as $key){if(isset($manifest[$key])){$result['sourceIdentity'][$key]=$manifest[$key];}}
 $result['manifestSha256']=hash_file('sha256',$s.'/php84-release/MANIFEST.json');
 foreach(['public'=>'/home/tsn6az96j3v7/public_html','management'=>'/home/tsn6az96j3v7/public_html/dashboard'] as $surface=>$directory){
  foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($s.'/php84-release/'.$surface,FilesystemIterator::SKIP_DOTS)) as $file){
   if($file->isFile()&&in_array(strtolower($file->getExtension()),['js','css'],true)){$path=substr($file->getPathname(),strlen($s.'/php84-release/'.$surface));$result['webAssets'][$surface][$path]=hash_file('sha256',$directory.$path);}
  }
 }
 $lock=json_decode(file_get_contents($s.'/php84-release/private/backend/composer.lock'),true,64,JSON_THROW_ON_ERROR);
 $result['packages']=array_map(static fn($package)=>['name'=>$package['name'],'version'=>$package['version']],$lock['packages']);
 $result['passed']=true;
}catch(Throwable $e){$result['passed']=false;$result['code']=preg_match('/^[A-Z_]+$/D',$e->getMessage())?$e->getMessage():'RELEASE_INVENTORY_FAILED';}
echo json_encode($result,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;exit($result['passed']?0:1);
