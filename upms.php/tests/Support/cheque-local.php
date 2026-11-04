<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') { exit(1); }
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{ChequeSchema,ChequeGuards,MoneySchema};
$c=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
if(($c['port']??0)!==3330||!preg_match('/^upms_test_php_money_[0-9]+(?:_restore)?$/D',$c['schema']??'')||!preg_match('/^money_rt_[0-9]+$/D',$c['runtime']??'')) { throw new RuntimeException('ISOLATED_CHEQUE_ONLY'); }
foreach(['owner-uat-binding.json','uath1-owner-binding.json'] as $name) {
    $owner=json_decode(file_get_contents(dirname(__DIR__,3).'/tmp/php-runtime/'.$name),true,32,JSON_THROW_ON_ERROR);
    if(($owner['schema']??'')===$c['schema']) { throw new RuntimeException('CHEQUE_OWNER_TARGET_REJECTED'); }
}
$p=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4',$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);MoneySchema::assertIsolated($p);
switch($c['action']) {
    case 'add-missing-guards':
        foreach(ChequeGuards::plan($c['runtime']) as $name=>$r) {
            $q=$p->prepare('SELECT ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=?');$q->execute([$name]);$body=$q->fetchColumn();
            if($body!==false&&$body!==$r['body']) { throw new RuntimeException('CHEQUE_EXISTING_GUARD_CHANGED_REVIEW_REQUIRED'); }
            if($body===false) { $p->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']); }
        }
        echo json_encode([...ChequeGuards::verify($p,$c['runtime'],(string)$p->query('SELECT CURRENT_USER()')->fetchColumn()),'chequePlanHash'=>ChequeSchema::hash(),'runtime'=>$c['runtime'].'@localhost','targetHash'=>App\Upms\CleanInitialization::target($p)]);break;
    case 'install': echo json_encode([...ChequeSchema::installIsolated($p,$c['runtime']),'schemaHashes'=>ChequeSchema::hashes($p)]);break;
    case 'verify': echo json_encode(['schema'=>ChequeSchema::verify($p),'guards'=>ChequeGuards::verify($p,$c['runtime'],(string)$p->query('SELECT CURRENT_USER()')->fetchColumn())]);break;
    case 'recovery':
        $s=App\Upms\ChequeRecovery::capture($p,$c['runtime']);$kp=sodium_crypto_box_keypair();$public=sodium_crypto_box_publickey($kp);$cipher=App\Upms\ChequeRecovery::encrypt($s,$public);
        $reject=static function(callable $work): bool { try { $work(); }catch(Throwable) { return true; }throw new RuntimeException('CHEQUE_BAD_ARCHIVE_ACCEPTED'); };$tests=[];
        $tests['wrong recipient']=$reject(fn()=>App\Upms\ChequeRecovery::decrypt($cipher,sodium_crypto_box_keypair()));$bad=$cipher;$bad[100]=chr(ord($bad[100])^1);$tests['corrupt ciphertext']=$reject(fn()=>App\Upms\ChequeRecovery::decrypt($bad,$kp));
        foreach(['cheque_instruments','cheque_events','cheque_audit','cheque_clearances','v1_party_journal','money_movements'] as $t) { $bad=$s;array_pop($bad['tables'][$t]['rows']);$tests['missing '.$t]=$reject(fn()=>App\Upms\ChequeRecovery::encrypt($bad,$public)); }
        $bad=$s;foreach($bad['tables']['v1_commands']['rows'] as $i=>$command) { if(isset(json_decode($command['result'])->chequeVersion)) { array_splice($bad['tables']['v1_commands']['rows'],$i,1);break; } }$tests['missing cheque command']=$reject(fn()=>App\Upms\ChequeRecovery::encrypt($bad,$public));
        $bad=$s;foreach($bad['tables']['v1_documents']['rows'] as $doc) { if($doc['kind']==='CLIENT_OPENING') { $bad['tables']['v1_party_journal']['rows']=array_values(array_filter($bad['tables']['v1_party_journal']['rows'],fn($j)=>(string)$j['document_id']!==(string)$doc['id']));break; } }$tests['missing opening journal']=$reject(fn()=>App\Upms\ChequeRecovery::encrypt($bad,$public));
        foreach(['amount'=>'999999.00','client_id'=>'999999','number'=>'999999','drawer_account_key'=>'ALTEREDACCOUNT'] as $f=>$v) { $bad=$s;$bad['tables']['cheque_instruments']['rows'][0][$f]=$v;$tests['altered instrument '.$f]=$reject(fn()=>App\Upms\ChequeRecovery::encrypt($bad,$public)); }
        $bad=$s;$bad['tables']['cheque_events']['rows'][0]['type']='CLEARED';$tests['altered lifecycle state']=$reject(fn()=>App\Upms\ChequeRecovery::encrypt($bad,$public));
        $bad=$s;$bad['tables']['cheque_clearances']['rows'][]=$bad['tables']['cheque_clearances']['rows'][0];$tests['duplicate clearance claim']=$reject(fn()=>App\Upms\ChequeRecovery::encrypt($bad,$public));
        $s=App\Upms\ChequeRecovery::decrypt($cipher,$kp);sodium_memzero($kp);
        $target='upms_test_php_money_'.time().random_int(10000,99999).'_restore';$p->exec('CREATE DATABASE `'.$target.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');$restore=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$target.';charset=utf8mb4',$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
        $tests['older consumer rejects new schema']=$reject(fn()=>App\Upms\LaborExtensionRecovery::restoreIsolated($restore,$s,$c['runtime']));
        $bad=$s;$bad['format']=App\Upms\LaborExtensionRecovery::FORMAT;
        foreach(array_keys(ChequeSchema::plan()['tables']) as $t) { unset($bad['tables'][$t]); }
        $tests['retagged older format rejects retained cheque evidence']=$reject(fn()=>App\Upms\LaborExtensionRecovery::restoreIsolated($restore,$bad,$c['runtime']));
        $bad=$s;$bad['chequeVersion']='invalid';$tests['incompatible version']=$reject(fn()=>App\Upms\ChequeRecovery::restoreIsolated($restore,$bad,$c['runtime']));
        $bad=$s;$bad['tables']['cheque_events']['ddl'].=' /* altered */';$tests['altered DDL before writes']=$reject(fn()=>App\Upms\ChequeRecovery::restoreIsolated($restore,$bad,$c['runtime']));
        if($restore->query('SHOW TABLES')->fetchAll()) { throw new RuntimeException('CHEQUE_REJECTED_RESTORE_MUTATED'); }
        echo json_encode([...App\Upms\ChequeRecovery::restoreIsolated($restore,$s,$c['runtime']),'negativeTests'=>$tests,'authenticatedDecryptionVerified'=>true,'ciphertextSha256'=>hash('sha256',$cipher),'productionContacted'=>false]);break;
    default: throw new RuntimeException('CHEQUE_ACTION_UNKNOWN');
}
