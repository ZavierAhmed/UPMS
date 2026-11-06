<?php
declare(strict_types=1);
// Portable key custody format. No DPAPI dependency. Invoke only via protected stdin.
final class P4RecoveryKeyCapsule
{
 public const FORMAT='UPMS_PORTABLE_RECOVERY_KEY_V1';
 public static function wrap(string $keyPair,string $passphrase,string $applicationKey=''):array
 {
  if(strlen($keyPair)!==SODIUM_CRYPTO_BOX_KEYPAIRBYTES||strlen($passphrase)<20){throw new RuntimeException('RECOVERY_KEY_OR_PASSPHRASE_REJECTED');}
  $salt=random_bytes(SODIUM_CRYPTO_PWHASH_SALTBYTES);$nonce=random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
  $fingerprint=hash('sha256',sodium_crypto_box_publickey($keyPair));
  $key=sodium_crypto_pwhash(32,$passphrase,$salt,3,67108864,SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13);
  $payload=json_encode(['keyPair'=>base64_encode($keyPair),'applicationKey'=>$applicationKey,'recipientSha256'=>$fingerprint],JSON_THROW_ON_ERROR);
  try{$cipher=sodium_crypto_aead_xchacha20poly1305_ietf_encrypt($payload,self::FORMAT.'|'.$fingerprint,$nonce,$key);}finally{sodium_memzero($key);sodium_memzero($payload);}
  return ['format'=>self::FORMAT,'recipientSha256'=>$fingerprint,'kdf'=>'Argon2id13','operations'=>3,'memoryBytes'=>67108864,'salt'=>base64_encode($salt),'nonce'=>base64_encode($nonce),'ciphertext'=>base64_encode($cipher)];
 }
 public static function open(array $capsule,string $passphrase):array
 {
  if(($capsule['format']??'')!==self::FORMAT||($capsule['kdf']??'')!=='Argon2id13'||($capsule['operations']??0)!==3||($capsule['memoryBytes']??0)!==67108864||!preg_match('/^[a-f0-9]{64}$/D',$capsule['recipientSha256']??'')){throw new RuntimeException('RECOVERY_CAPSULE_METADATA_REJECTED');}
  $salt=base64_decode($capsule['salt']??'',true);$nonce=base64_decode($capsule['nonce']??'',true);$cipher=base64_decode($capsule['ciphertext']??'',true);
  if($salt===false||strlen($salt)!==SODIUM_CRYPTO_PWHASH_SALTBYTES||$nonce===false||strlen($nonce)!==24||$cipher===false||strlen($cipher)>65536){throw new RuntimeException('RECOVERY_CAPSULE_ENCODING_REJECTED');}
  $key=sodium_crypto_pwhash(32,$passphrase,$salt,3,67108864,SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13);
  try{$plain=sodium_crypto_aead_xchacha20poly1305_ietf_decrypt($cipher,self::FORMAT.'|'.$capsule['recipientSha256'],$nonce,$key);}finally{sodium_memzero($key);}
  if($plain===false){throw new RuntimeException('RECOVERY_CAPSULE_AUTHENTICATION_FAILED');}
  try{$payload=json_decode($plain,true,16,JSON_THROW_ON_ERROR);}finally{sodium_memzero($plain);}
  $pair=base64_decode($payload['keyPair']??'',true);
  if($pair===false||strlen($pair)!==64||!hash_equals($capsule['recipientSha256'],hash('sha256',sodium_crypto_box_publickey($pair)))){throw new RuntimeException('RECOVERY_RECIPIENT_REJECTED');}
  return ['keyPair'=>$pair,'applicationKey'=>$payload['applicationKey']??'','recipientSha256'=>$capsule['recipientSha256']];
 }
}
if(PHP_SAPI==='cli'&&realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){
 try{
  $request=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);$action=$request['action']??'';
  if($action==='synthetic-test'){
   $pair=sodium_crypto_box_keypair();$passphrase=bin2hex(random_bytes(32));$capsule=P4RecoveryKeyCapsule::wrap($pair,$passphrase,'SYNTHETIC_APPLICATION_KEY');$opened=P4RecoveryKeyCapsule::open($capsule,$passphrase);
   if(!hash_equals($pair,$opened['keyPair'])||$opened['applicationKey']!=='SYNTHETIC_APPLICATION_KEY'){throw new RuntimeException('CAPSULE_ROUNDTRIP_FAILED');}
   $tests=['roundtrip'=>true,'applicationKeyPreserved'=>true];
   foreach(['wrong-passphrase','ciphertext-tamper','recipient-substitution','kdf-abuse'] as $case){$bad=$capsule;$password=$passphrase;if($case==='wrong-passphrase'){$password='wrong-password-that-is-long-enough';}elseif($case==='ciphertext-tamper'){$raw=base64_decode($bad['ciphertext']);$raw[1]=chr(ord($raw[1])^1);$bad['ciphertext']=base64_encode($raw);}elseif($case==='recipient-substitution'){$bad['recipientSha256']=str_repeat('0',64);}else{$bad['memoryBytes']=2147483648;}$denied=false;try{P4RecoveryKeyCapsule::open($bad,$password);}catch(Throwable){$denied=true;}if(!$denied){throw new RuntimeException('CAPSULE_NEGATIVE_TEST_FAILED');}$tests[$case]=true;}
   sodium_memzero($pair);sodium_memzero($opened['keyPair']);sodium_memzero($passphrase);echo json_encode(['passed'=>true,'tests'=>$tests,'dpapiUsed'=>false,'productionKeysUsed'=>false,'independentOperatorGate'=>'BLOCKED - actual USB/operator/computer test still required'],JSON_PRETTY_PRINT).PHP_EOL;exit;
  }
  if($action==='wrap'){
   $destination=$request['destination']??'';$parent=realpath(dirname($destination));$repo=realpath(__DIR__.'/../..');
   if(($request['ownerConfirmedOfflineEncryptedUsb']??false)!==true||!$parent||str_starts_with(strtolower($parent),strtolower($repo))||file_exists($destination)||is_link($destination)){throw new RuntimeException('OFFLINE_CUSTODY_DESTINATION_REJECTED');}
   $pair=base64_decode($request['keyPair']??'',true);if($pair===false){throw new RuntimeException('KEY_ENCODING_REJECTED');}
   $capsule=P4RecoveryKeyCapsule::wrap($pair,$request['passphrase']??'',$request['applicationKey']??'');sodium_memzero($pair);
   $file=fopen($destination,'xb');if(!$file){throw new RuntimeException('EXCLUSIVE_CUSTODY_FILE_REQUIRED');}try{$bytes=json_encode($capsule,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;if(fwrite($file,$bytes)!==strlen($bytes)||!fflush($file)){throw new RuntimeException('CAPSULE_WRITE_FAILED');}}finally{fclose($file);}
   $test=P4RecoveryKeyCapsule::open(json_decode(file_get_contents($destination),true,32,JSON_THROW_ON_ERROR),$request['passphrase']);sodium_memzero($test['keyPair']);
   echo json_encode(['passed'=>true,'recipientSha256'=>$capsule['recipientSha256'],'capsuleSha256'=>hash_file('sha256',$destination),'applicationKeyIncluded'=>($request['applicationKey']??'')!=='','dpapiRequiredForRecovery'=>false,'secretsPrinted'=>false,'independentOperatorVerified'=>false]).PHP_EOL;exit;
  }
  throw new RuntimeException('EXPLICIT_KEY_CUSTODY_ACTION_REQUIRED');
 }catch(Throwable $e){echo json_encode(['passed'=>false,'code'=>preg_match('/^[A-Z_]+$/D',$e->getMessage())?$e->getMessage():'RECOVERY_CAPSULE_FAILED','secretsPrinted'=>false]).PHP_EOL;exit(1);}
}
