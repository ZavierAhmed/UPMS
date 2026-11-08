<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){exit(1);}
ini_set('zend.exception_ignore_args','1');
$user=posix_getpwuid(posix_geteuid())['name']??'';
if($user!=='tsn6az96j3v7'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){throw new RuntimeException('HOST_ACCOUNT_REJECTED');}
$result=['verifiedUtc'=>gmdate('c'),'account'=>$user,'hostname'=>gethostname(),'databaseWrites'=>0,'hostFilesWritten'=>0];
foreach([
 'databases'=>['Mysql','list_databases'],
 'users'=>['Mysql','list_users'],
 'limits'=>['Variables','get_user_information'],
 'mysqlRestrictions'=>['Mysql','get_restrictions'],
 'phpVhosts'=>['LangPHP','php_get_vhost_versions'],
 'domains'=>['DomainInfo','domains_data'],
] as $name=>$args){
 $command='/usr/bin/uapi --output=json '.implode(' ',array_map('escapeshellarg',$args));
 exec($command.' 2>/dev/null',$lines,$exit);
 $decoded=json_decode(implode("\n",$lines),true);
 if (!is_array($decoded)) { throw new RuntimeException('UAPI_RESPONSE_NOT_JSON'); }
 if ($name === 'limits' && is_array($decoded['result']['data'] ?? null)) {
  $decoded['result']['data']=array_intersect_key($decoded['result']['data'],array_flip([
   'user','home','domain','ip','maximum_databases','maximum_subdomains','database_owner'
  ]));
 }
 $result[$name]=['exit'=>$exit,'status'=>$decoded['result']['status']??null,'data'=>$decoded['result']['data']??null,'errors'=>$decoded['result']['errors']??null];
 unset($lines);
}
foreach(['/home/tsn6az96j3v7/public_html','/home/tsn6az96j3v7/public_html/dashboard','/home/tsn6az96j3v7/upms-releases'] as $root){
 $files=[];
 if(is_dir($root)){
  foreach(new DirectoryIterator($root) as $file){if($file->isFile()&&($file->getExtension()==='php'||in_array($file->getFilename(),['.htaccess','index.html'],true))){$files[$file->getFilename()]=['bytes'=>$file->getSize(),'sha256'=>hash_file('sha256',$file->getPathname())];}}
 }
 $result['roots'][$root]=['exists'=>is_dir($root),'files'=>$files];
}
echo json_encode($result,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
