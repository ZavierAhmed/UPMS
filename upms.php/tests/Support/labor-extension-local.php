<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { exit(1); }
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{LaborExtensionSchema,LaborExtensionGuards,LaborExtensionRecovery,EmployeeHaftaRecovery,MoneySchema};
$c = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
if (($c['port'] ?? 0) !== 3330 || !preg_match('/^upms_test_php_money_[0-9]+(?:_restore)?$/D', $c['schema'] ?? '') || !preg_match('/^money_rt_[0-9]+$/D', $c['runtime'] ?? '')) { throw new RuntimeException('ISOLATED_H1C_ONLY'); }
$p = new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
MoneySchema::assertIsolated($p);
switch ($c['action']) {
    case 'install': echo json_encode(LaborExtensionSchema::installIsolated($p,$c['runtime'])); break;
    case 'hashes': echo json_encode(LaborExtensionSchema::hashes($p)); break;
    case 'verify': echo json_encode(['schema'=>LaborExtensionSchema::verify($p),'guards'=>LaborExtensionGuards::verify($p,$c['runtime'],(string)$p->query('SELECT CURRENT_USER()')->fetchColumn())]); break;
    case 'recovery':
        $s=LaborExtensionRecovery::capture($p,$c['runtime']);
        $kp=sodium_crypto_box_keypair();
        $cipher=LaborExtensionRecovery::encrypt($s,sodium_crypto_box_publickey($kp));
        $reject=static function(callable $work): bool { try { $work(); } catch(Throwable) { return true; } throw new RuntimeException('H1C_BAD_ARCHIVE_ACCEPTED'); };
        $tests=[];
        $tests['wrong recipient']=$reject(fn()=>LaborExtensionRecovery::decrypt($cipher,sodium_crypto_box_keypair()));
        $broken=$cipher;$broken[100]=chr(ord($broken[100])^1);
        $tests['corrupted ciphertext']=$reject(fn()=>LaborExtensionRecovery::decrypt($broken,$kp));
        foreach(['amount','employee_id','source_hash','source_batch_id','source_movement_id','date'] as $field) {
            $bad=$s;$bad['tables']['labor_expense_allocations']['rows'][0][$field]=$field==='source_hash'?str_repeat('0',64):($field==='date'?'2000-01-01':'99999');
            $tests['altered allocation '.$field]=$reject(fn()=>LaborExtensionRecovery::encrypt($bad,sodium_crypto_box_publickey($kp)));
        }
        foreach(['labor_expense_allocations','stock_initializations','labor_extension_audit'] as $table) {
            $bad=$s;array_pop($bad['tables'][$table]['rows']);
            $tests['missing '.$table]=$reject(fn()=>LaborExtensionRecovery::encrypt($bad,sodium_crypto_box_publickey($kp)));
        }
        $bad=$s;$bad['tables']['v1_commands']['rows']=array_values(array_filter($bad['tables']['v1_commands']['rows'],fn($r)=>!isset(json_decode($r['result'])->laborExtensionVersion)));
        $tests['missing allocation and compound posting commands']=$reject(fn()=>LaborExtensionRecovery::encrypt($bad,sodium_crypto_box_publickey($kp)));
        $s=LaborExtensionRecovery::decrypt($cipher,$kp);sodium_memzero($kp);
        $target='upms_test_php_money_'.(string)time().random_int(10000,99999).'_restore';
        $p->exec('CREATE DATABASE `'.$target.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $restored=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$target.';charset=utf8mb4',$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
        $tests['old consumer rejects classified format']=$reject(fn()=>EmployeeHaftaRecovery::restoreIsolated($restored,$s,$c['runtime']));
        if($restored->query('SHOW TABLES')->fetchAll())throw new RuntimeException('H1C_OLD_CONSUMER_MUTATED');
        $bad=$s;$bad['format']=EmployeeHaftaRecovery::FORMAT;
        $tests['new consumer rejects older format']=$reject(fn()=>LaborExtensionRecovery::restoreIsolated($restored,$bad,$c['runtime']));
        $bad=$s;$bad['tables']['labor_expense_allocations']['ddl'].=' /* invalid */';
        $tests['altered DDL rejected before writes']=$reject(fn()=>LaborExtensionRecovery::restoreIsolated($restored,$bad,$c['runtime']));
        if($restored->query('SHOW TABLES')->fetchAll())throw new RuntimeException('H1C_REJECTED_ARCHIVE_MUTATED');
        echo json_encode([...LaborExtensionRecovery::restoreIsolated($restored,$s,$c['runtime']),'negativeTests'=>$tests,'authenticatedDecryptionVerified'=>true,'productionContacted'=>false]);
        break;
    default: throw new RuntimeException('UNKNOWN_H1C_HELPER');
}
