<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){exit(1);}
ini_set('zend.exception_ignore_args','1');
require dirname(__DIR__).'/upms.php/vendor/autoload.php';
try{
 $r=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
 $key=base64_decode($r['keyPair'],true);
 if($key===false||strlen($key)!==SODIUM_CRYPTO_BOX_KEYPAIRBYTES){throw new RuntimeException('RECOVERY_KEY_REJECTED');}
 $cipher=file_get_contents($r['archive']);
 if(!hash_equals($r['sha256'],hash('sha256',$cipher))||!hash_equals($r['recipientSha256'],hash('sha256',sodium_crypto_box_publickey($key)))){throw new RuntimeException('CIPHERTEXT_OR_RECIPIENT_REJECTED');}
 $snapshot=App\Upms\ProductionRecoveryV2::decrypt($cipher,$key);
 if(($snapshot['proof']['accounts']['runtime']??'')!=='upms_runtime_v2@localhost'
  ||($snapshot['proof']['targetHash']??'')!==$r['targetHash']
  ||count($snapshot['tables'])!==47||count($snapshot['guards'])!==133){throw new RuntimeException('PRODUCTION_ARCHIVE_SCOPE_REJECTED');}
 $tamper=$cipher;$tamper[strlen($tamper)-1]=chr(ord($tamper[strlen($tamper)-1])^1);$rejected=false;
 try{App\Upms\ProductionRecoveryV2::decrypt($tamper,$key);}catch(Throwable){$rejected=true;}
 if(!$rejected){throw new RuntimeException('TAMPER_ACCEPTED');}
 sodium_memzero($key);
 echo json_encode(['passed'=>true,'schema'=>'upms_v2','offHost'=>true,'authenticatedDecryptionVerified'=>true,
  'sha256'=>hash('sha256',$cipher),'recipientSha256'=>$r['recipientSha256'],'targetHash'=>$r['targetHash'],
  'tables'=>47,'guards'=>133,'rows'=>array_sum(array_map(fn($t)=>count($t['rows']),$snapshot['tables'])),
  'tamperRejected'=>true,'independentOwnerRecoveryVerified'=>false,'privateKeyUploaded'=>false,'plaintextWrittenToDisk'=>false],JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'PRODUCTION_ARCHIVE_VALIDATION_FAILED']).PHP_EOL;exit(1);}
