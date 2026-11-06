<?php
declare(strict_types=1);
// INTERNAL PIPE WORKER. Its stdout is plaintext only inside the protected restore pipeline.
// Do not invoke directly in a console. No key material is returned.
if(PHP_SAPI!=='cli'){exit(1);}
require __DIR__.'/recovery-key-capsule.php';
$opened=null;
try{
 $request=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
 $path=realpath($request['capsule']??'');if(!$path||is_link($request['capsule'])||filesize($path)>65536){throw new RuntimeException('CAPSULE_FILE_REJECTED');}
 $opened=P4RecoveryKeyCapsule::open(json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR),$request['passphrase']??'');
 $process=proc_open([PHP_BINARY,__DIR__.'/../operations/backup-client.php'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,null,null,['bypass_shell'=>true]);
 if(!is_resource($process)){throw new RuntimeException('PRIVATE_BACKUP_WORKER_UNAVAILABLE');}
 $input=json_encode(['action'=>'restore-lines','keyPair'=>base64_encode($opened['keyPair']),'file'=>$request['archive']],JSON_THROW_ON_ERROR);
 fwrite($pipes[0],$input);fclose($pipes[0]);sodium_memzero($input);sodium_memzero($opened['keyPair']);
 $records=stream_get_contents($pipes[1],33554433);$discarded=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($process);
 if($exit!==0||strlen($records)>33554432){throw new RuntimeException('CAPSULE_BACKUP_AUTHENTICATION_FAILED');}
 fwrite(STDOUT,$records);sodium_memzero($records);
}catch(Throwable $e){echo json_encode(['passed'=>false,'code'=>preg_match('/^[A-Z_]+$/D',$e->getMessage())?$e->getMessage():'CAPSULE_RESTORE_PIPE_FAILED']).PHP_EOL;exit(1);}
finally{if(isset($opened['keyPair'])&&is_string($opened['keyPair'])){sodium_memzero($opened['keyPair']);}}
