<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') { exit(1); }
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{ChequeSchema,ChequeGuards,ChequeExtras,ChequeRecovery,MoneySchema,CleanInitialization};
$c=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
$root=realpath(dirname(__DIR__,3).'/tmp/php-runtime');
$env=realpath($c['envPath']);
if(!$env||!str_starts_with($env,$root.DIRECTORY_SEPARATOR)||!preg_match('/^upms_test_php_money_[0-9]+$/D',$c['binding']['schema']??'')) { throw new RuntimeException('UAT2A_ISOLATED_BINDING_REQUIRED'); }
foreach(['owner-uat-binding.json','uath1-owner-binding.json','uat2-owner-binding.json'] as $name) {
    $owner=json_decode(file_get_contents($root.'/'.$name),true,32,JSON_THROW_ON_ERROR);
    if($owner['schema']===$c['binding']['schema']) { throw new RuntimeException('UAT2A_OWNER_MIGRATION_NOT_AUTHORIZED'); }
}
$app=require __DIR__.'/../../bootstrap/app.php';$app->useEnvironmentPath(dirname($env));$app->loadEnvironmentFrom(basename($env));$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$pdo=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['binding']['schema'].';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
MoneySchema::assertIsolated($pdo);$runtime=$c['binding']['runtime'];
if($c['action']==='install') {
    config(['upms.cheque_extras_enabled'=>false]);ChequeSchema::verify($pdo);ChequeGuards::verify($pdo,$runtime);
    config(['upms.cheque_extras_enabled'=>true]);
    echo json_encode(['schemaHashes'=>ChequeExtras::installIsolated($pdo,$runtime)]);exit;
}
config(['upms.cheque_extras_enabled'=>true]);
if($c['action']==='verify') {
    if(config('upms.production_profile')||config('upms.host')!=='127.0.0.1'||(string)config('upms.port')!=='3330'||config('upms.database')!==$c['binding']['schema']||config('upms.username')!==$runtime) { throw new RuntimeException('UAT2A_RUNTIME_BINDING_REJECTED'); }
    $runtimePdo=app(App\Upms\Database::class)->pdo();
    if($runtimePdo->query('SELECT CURRENT_USER()')->fetchColumn()!==$runtime.'@localhost') { throw new RuntimeException('UAT2A_RUNTIME_IDENTITY_REJECTED'); }
    ChequeExtras::runtimePrivileges($runtimePdo);
    echo json_encode([...ChequeGuards::verify($pdo,$runtime),'chequePlanHash'=>ChequeSchema::hash(),'runtime'=>$runtime.'@localhost','targetHash'=>CleanInitialization::target($pdo),'schema'=>ChequeSchema::verify($pdo),'effectiveRuntimeCrudVerified'=>true]);exit;
}
if($c['action']==='recovery') {
    $s=ChequeRecovery::capture($pdo,$runtime);$kp=sodium_crypto_box_keypair();$public=sodium_crypto_box_publickey($kp);$tests=[];
    $reject=static function(callable $work): bool { try { $work(); } catch(Throwable) { return true; }throw new RuntimeException('UAT2A_INVALID_RECOVERY_ACCEPTED'); };
    foreach(['id','event_id','cheque_id','filename','mime','bytes','sha256','actor_id','created_at'] as $field) {
        $file=$s['tables']['cheque_attachments']['rows'][0];$file[$field]='changed';
        $tests['authenticated metadata '.$field]=$reject(fn()=>ChequeExtras::decrypt($file));
    }
    foreach(['filename','event_id','cheque_id','ciphertext'] as $field) {
        $bad=$s;$bad['tables']['cheque_attachments']['rows'][0][$field]=$field==='ciphertext'?'invalid':'changed';
        $tests['altered attachment '.$field]=$reject(fn()=>ChequeRecovery::encrypt($bad,$public));
    }
    $bad=$s;array_pop($bad['tables']['cheque_attachments']['rows']);$tests['missing attachment']=$reject(fn()=>ChequeRecovery::encrypt($bad,$public));
    $bad=$s;unset($bad['tables']['cheque_attachments']);$tests['missing attachment table']=$reject(fn()=>ChequeRecovery::encrypt($bad,$public));
    $bad=$s;$bad['format']=ChequeRecovery::FORMAT;$tests['older format rejects extended archive']=$reject(fn()=>ChequeRecovery::encrypt($bad,$public));
    $cipher=ChequeRecovery::encrypt($s,$public);
    $originalKey=config('app.key');config(['app.key'=>'base64:'.base64_encode(random_bytes(32))]);
    try { $tests['wrong attachment key']=$reject(fn()=>ChequeRecovery::decrypt($cipher,$kp)); } finally { config(['app.key'=>$originalKey]); }
    $tests['wrong recipient']=$reject(fn()=>ChequeRecovery::decrypt($cipher,sodium_crypto_box_keypair()));
    $bad=$cipher;$bad[100]=chr(ord($bad[100])^1);$tests['tampered archive']=$reject(fn()=>ChequeRecovery::decrypt($bad,$kp));
    file_put_contents(dirname($env).'/uat2a-evidence-backup.sealed',$cipher,LOCK_EX);
    $s=ChequeRecovery::decrypt(file_get_contents(dirname($env).'/uat2a-evidence-backup.sealed'),$kp);sodium_memzero($kp);
    $target='upms_test_php_money_'.time().random_int(10000,99999).'_restore';$pdo->exec('CREATE DATABASE `'.$target.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $restore=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$target.';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $result=ChequeRecovery::restoreIsolated($restore,$s,$runtime);
    echo json_encode(['passed'=>$result['passed'],'tables'=>$result['tables'],'guards'=>$result['guards']['totalGuards'],'restoredRows'=>$result['rows'],'authenticatedDecryptionVerified'=>true,'attachmentCount'=>count($s['tables']['cheque_attachments']['rows']),'protectedApplicationKeyRequired'=>true,'negativeTests'=>$tests]);exit;
}
throw new RuntimeException('UAT2A_HELPER_ACTION_REJECTED');
