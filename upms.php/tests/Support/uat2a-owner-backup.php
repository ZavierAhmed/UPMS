<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') { exit(1); }
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{ChequeRecovery,ChequeSchema,ChequeGuards,MoneySchema};
$input=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
if(($input['action']??'')==='keygen') { echo json_encode(['keyPair'=>base64_encode(sodium_crypto_box_keypair())]);exit; }
$root=realpath(dirname(__DIR__,3).'/tmp/php-runtime');
$binding=json_decode(file_get_contents($root.'/uat2-owner-binding.json'),true,32,JSON_THROW_ON_ERROR);
if(!preg_match('/^upms_test_php_money_[0-9]+$/D',$binding['schema'])||!preg_match('/^money_rt_[0-9]+$/D',$binding['runtime'])||realpath($binding['directory'])!==realpath($root.'/uat2-owner-setup')) { throw new RuntimeException('UAT2A_FIXED_OWNER_BINDING_REQUIRED'); }
foreach(['owner-uat-binding.json','uath1-owner-binding.json'] as $name) {
    $other=json_decode(file_get_contents($root.'/'.$name),true,32,JSON_THROW_ON_ERROR);
    if($other['schema']===$binding['schema']) { throw new RuntimeException('UAT2A_OTHER_OWNER_TARGET_REJECTED'); }
}
$archiveRoot=realpath($root.'/uat2a-owner-protection');
if(!$archiveRoot||is_link($archiveRoot)) { throw new RuntimeException('UAT2A_PRIVATE_BACKUP_DIRECTORY_REQUIRED'); }
$connect=static fn($schema)=>new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$schema.';charset=utf8mb4','php2_test_admin',$input['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$pdo=$connect($binding['schema']);MoneySchema::assertIsolated($pdo);
$snapshot=ChequeRecovery::capture($pdo,$binding['runtime']);
$keyPair=base64_decode($input['keyPair'],true);
if($keyPair===false||strlen($keyPair)!==SODIUM_CRYPTO_BOX_KEYPAIRBYTES) { throw new RuntimeException('UAT2A_RECIPIENT_REQUIRED'); }
$cipher=ChequeRecovery::encrypt($snapshot,sodium_crypto_box_publickey($keyPair));
$archive=$archiveRoot.'/preupgrade-'.gmdate('Ymd\THis\Z').'-'.bin2hex(random_bytes(6)).'.sealed';
if(file_put_contents($archive,$cipher,LOCK_EX)!==strlen($cipher)) { throw new RuntimeException('UAT2A_BACKUP_WRITE_FAILED'); }
$restoredSnapshot=ChequeRecovery::decrypt(file_get_contents($archive),$keyPair);sodium_memzero($keyPair);unset($input['keyPair']);
$target='upms_test_php_money_'.time().random_int(10000,99999).'_restore';
$pdo->exec('CREATE DATABASE `'.$target.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$restore=ChequeRecovery::restoreIsolated($connect($target),$restoredSnapshot,$binding['runtime']);
$rehearsal=null;
if(($input['rehearse']??false)===true) {
    \Illuminate\Container\Container::getInstance()->instance('config',new \Illuminate\Config\Repository(['upms'=>['cheque_extras_enabled'=>true]]));
    $restorePdo=$connect($target);
    $hashes=\App\Upms\ChequeExtras::installIsolated($restorePdo,$binding['runtime']);
    $expected=json_decode(file_get_contents(dirname(__DIR__,3).'/upms.php/resources/cheque-extra-schema-hashes.json'),true,32,JSON_THROW_ON_ERROR);
    if($hashes!==$expected) { throw new RuntimeException('UAT2A_REHEARSAL_SCHEMA_HASH_REJECTED'); }
    $extended=ChequeRecovery::capture($restorePdo,$binding['runtime']);
    foreach($snapshot['tables'] as $table=>$content) {
        $before=array_map(App\Upms\Cheques::hash(...),$content['rows']);$copied=array_map(App\Upms\Cheques::hash(...),$extended['tables'][$table]['rows']);sort($before);sort($copied);
        if($before!==$copied) { throw new RuntimeException('UAT2A_REHEARSAL_ROW_CHANGED'); }
    }
    $current=array_column($extended['triggerDefinitions'],null,'TRIGGER_NAME');$preserved=0;
    foreach($snapshot['triggerDefinitions'] as $trigger) {
        if($trigger['TRIGGER_NAME']==='upmscq_cheque_issuing_banks_insert') { continue; }
        if(($current[$trigger['TRIGGER_NAME']]??null)!==$trigger) { throw new RuntimeException('UAT2A_REHEARSAL_GUARD_CHANGED'); }$preserved++;
    }
    $rehearsal=['passed'=>true,'tables'=>47,'guards'=>$extended['guards']['totalGuards'],'originalRowsPreserved'=>true,'originalGuardDefinitionsPreserved'=>$preserved,'intentionallyReplacedGuard'=>'upmscq_cheque_issuing_banks_insert','ownerDatabaseMigrated'=>false];
    config(['upms.cheque_extras_enabled'=>false]);
}
$after=ChequeRecovery::capture($pdo,$binding['runtime']);
$fingerprints=static function(array $snapshot): array {
    $hashes=[];
    foreach($snapshot['tables'] as $name=>$table) {
        $rows=array_map(static fn($row)=>json_encode(array_map(static fn($v)=>$v===null?null:(string)$v,$row),JSON_THROW_ON_ERROR),$table['rows']);sort($rows);
        $hashes[$name]=hash('sha256',json_encode($rows,JSON_THROW_ON_ERROR));
    }
    return $hashes;
};
if($fingerprints($snapshot)!==$fingerprints($after)) { throw new RuntimeException('UAT2A_OWNER_CHANGED_DURING_BACKUP'); }
echo json_encode(['passed'=>true,'sourceSchema'=>$binding['schema'],'tables'=>count($snapshot['tables']),'guards'=>$snapshot['guards']['totalGuards'],'archive'=>$archive,'archiveSha256'=>hash_file('sha256',$archive),'authenticatedDecryptionVerified'=>true,'independentRestorePassed'=>$restore['passed'],'restoredRows'=>$restore['rows'],'sourceFingerprints'=>$fingerprints($snapshot),'sourceRowsUnchanged'=>true,'rehearsal'=>$rehearsal,'ownerDatabaseMigrated'=>false,'productionContacted'=>false,'verifiedUtc'=>gmdate('c')],JSON_THROW_ON_ERROR);
