<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){exit(1);}
$root=dirname(__DIR__);$vendor=$root.'/tmp/phase-4/vendor-stage/vendor';
$lock=json_decode(file_get_contents($root.'/upms.php/composer.lock'),true,64,JSON_THROW_ON_ERROR);
$installed=json_decode(file_get_contents($vendor.'/composer/installed.json'),true,64,JSON_THROW_ON_ERROR);
$versions=static function(array $packages):array{$result=[];foreach($packages as $package){$result[$package['name']]=$package['version'];}ksort($result);return $result;};
if($versions($lock['packages'])!==$versions($installed['packages'])||($installed['dev']??true)!==false){throw new RuntimeException('LOCKED_PRODUCTION_VENDOR_REQUIRED');}
$files=[];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($vendor,FilesystemIterator::SKIP_DOTS)) as $file){if($file->isLink()){throw new RuntimeException('VENDOR_SYMLINK_REJECTED');}if($file->isFile()&&!str_ends_with($file->getFilename(),'.bat')){$files[str_replace('\\','/',substr($file->getPathname(),strlen($vendor)+1))]=hash_file('sha256',$file->getPathname());}}
ksort($files);$report=['passed'=>true,'php'=>PHP_VERSION,'packageCount'=>count($lock['packages']),'sourceLockSha256'=>hash_file('sha256',$root.'/upms.php/composer.lock'),'files'=>$files];
file_put_contents($root.'/tmp/phase-4/vendor-proof.json',json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL);
file_put_contents($root.'/docs/phase-4/evidence/vendor-proof.json',json_encode(['passed'=>true,'php'=>PHP_VERSION,'packageCount'=>$report['packageCount'],'fileCount'=>count($files),'sourceLockSha256'=>$report['sourceLockSha256'],'devDependenciesIncluded'=>false],JSON_PRETTY_PRINT).PHP_EOL);
echo 'Locked production vendor verified: '.count($lock['packages']).' packages, '.count($files).' files.'.PHP_EOL;
