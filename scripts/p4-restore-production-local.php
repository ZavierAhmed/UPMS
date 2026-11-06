<?php
declare(strict_types=1);
// Consumes an authenticated stream in memory. Only a NEW local isolated schema is writable.
if(PHP_SAPI!=='cli'){exit(1);}
require __DIR__.'/../upms.php/vendor/autoload.php';
$phase='input';$database=null;
try{
 $bindingPath=__DIR__.'/../tmp/protected-offhost-backups/p4-restore-binding.json';if(file_exists($bindingPath)){throw new RuntimeException('EXISTING_PRIVATE_RESTORE_BINDING');}
 $request=json_decode(stream_get_contents(STDIN),true,128,JSON_THROW_ON_ERROR);
 $engine=$request['engine'];
 if(($engine['port']??0)!==3330||!is_string($request['stream']??null)){throw new RuntimeException('LOCAL_RESTORE_INPUT_REJECTED');}
 $phase='admin-connect';
 $adminUser=$engine['adminUser']??'php2_test_admin';
 $admin=new PDO('mysql:host=127.0.0.1;port=3330;charset=utf8mb4',$adminUser,$engine['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false]);
 $identity=$admin->query('SELECT VERSION() version,@@port port,@@datadir directory,@@bind_address binding')->fetch(PDO::FETCH_ASSOC);
 $normal=static fn(string $p)=>strtolower(rtrim(str_replace('\\','/',$p),'/'));
 if(!str_starts_with($identity['version'],'10.11.19-MariaDB')||(int)$identity['port']!==3330||$identity['binding']!=='127.0.0.1'||$normal($identity['directory'])!==$normal($engine['data'])){throw new RuntimeException('ISOLATED_ENGINE_IDENTITY_REJECTED');}
 $phase='validate-stream';$source=[];$triggers=[];$meta=null;$footer=null;$counts=[];
 $canonical=[];foreach(App\Upms\CleanInitialization::plan()['tables'] as $table){$canonical[$table['table']]=$table['sql'];}$canonical[App\Upms\CleanInitialization::RECEIPT]=App\Upms\CleanInitialization::receiptDdl();
 foreach(explode("\n",trim($request['stream'])) as $line){
  $record=json_decode($line,true,128,JSON_THROW_ON_ERROR);
  switch($record['type']??''){
   case 'META':$meta=$record;break;
   case 'TRIGGERS':$triggers=$record['rows'];break;
   case 'TABLE':$table=$record['table'];if(!isset($canonical[$table])||isset($source[$table])||App\Upms\CleanInitialization::normalize($record['ddl'])!==App\Upms\CleanInitialization::normalize($canonical[$table])){throw new RuntimeException('CANONICAL_SOURCE_DDL_REQUIRED');}$source[$table]=['ddl'=>$record['ddl'],'rows'=>[]];$counts[$table]=0;break;
   case 'ROW':$table=$record['table'];if(!isset($source[$table])){throw new RuntimeException('SOURCE_TABLE_ORDER_REJECTED');}$source[$table]['rows'][]=$record['row'];$counts[$table]++;break;
   case 'END':$footer=$record;break;
   default:throw new RuntimeException('SOURCE_RECORD_TYPE_REJECTED');
  }
 }
 $request['stream']='';
 if(($meta['schema']??'')!=='upms_v1'||count($source)!==20||count($triggers)!==45||($footer['counts']??[])!==$counts){throw new RuntimeException('SOURCE_STREAM_INCOMPLETE');}
 $rules=App\Upms\CrudGuards::plan();
 foreach($triggers as $rule){$expected=$rules[$rule['TRIGGER_NAME']]??null;if(!$expected||$rule['ACTION_STATEMENT']!==$expected['body']||$rule['DEFINER']!==App\Upms\CrudGuards::DEFINER||$rule['EVENT_OBJECT_TABLE']!==$expected['table']||$rule['EVENT_MANIPULATION']!==$expected['event']){throw new RuntimeException('SOURCE_GUARD_REJECTED');}}
 $phase='fresh-target';$suffix=gmdate('YmdHis').bin2hex(random_bytes(3));$database='upms_test_php_p4_restore_'.$suffix;$maintainer='p4_restore_'.$suffix;$runtime='p4_runtime_'.$suffix;
 foreach([$database,$maintainer,$runtime] as $name){if(!preg_match('/^[a-z0-9_]+$/D',$name)){throw new RuntimeException('ISOLATED_NAME_REJECTED');}}
 $existing=$admin->prepare('SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?');$existing->execute([$database]);if((int)$existing->fetchColumn()!==0){throw new RuntimeException('EXISTING_TARGET_REJECTED');}
 $maintainerPassword=bin2hex(random_bytes(32));$runtimePassword=bin2hex(random_bytes(32));
 $admin->exec('CREATE DATABASE `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 $admin->exec('CREATE USER '.$admin->quote($maintainer)."@'localhost' IDENTIFIED BY ".$admin->quote($maintainerPassword));
 $admin->exec('CREATE USER '.$admin->quote($runtime)."@'localhost' IDENTIFIED BY ".$admin->quote($runtimePassword));
 $scope=str_replace('_','\\_',$database);
 $admin->exec('GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,REFERENCES,TRIGGER ON `'.$scope.'`.* TO '.$admin->quote($maintainer)."@'localhost'");
 $admin->exec('GRANT SELECT,INSERT,UPDATE,DELETE ON `'.$scope.'`.* TO '.$admin->quote($runtime)."@'localhost'");
 $options=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false];
 $pdo=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$database.';charset=utf8mb4',$maintainer,$maintainerPassword,$options);
 if($pdo->query('SELECT CURRENT_USER()')->fetchColumn()!==$maintainer.'@localhost'||$pdo->query('SHOW TABLES')->fetchAll()){throw new RuntimeException('RESTORE_MAINTAINER_REJECTED');}
 $phase='restore-tables';$pdo->exec("SET SESSION FOREIGN_KEY_CHECKS=0,time_zone='+00:00',sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
 foreach($source as $table=>$data){$pdo->exec($data['ddl']);foreach($data['rows'] as $row){$columns=array_keys($row);$statement=$pdo->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`',$columns).'`) VALUES('.implode(',',array_fill(0,count($columns),'?')).')');$statement->execute(array_values($row));}}
 $pdo->exec('SET SESSION FOREIGN_KEY_CHECKS=1');
 $phase='restore-guards';
 foreach($triggers as $rule){$body=str_replace('upms_runtime84',$runtime,$rule['ACTION_STATEMENT']);$pdo->exec('CREATE TRIGGER `'.$rule['TRIGGER_NAME'].'` '.$rule['ACTION_TIMING'].' '.$rule['EVENT_MANIPULATION'].' ON `'.$rule['EVENT_OBJECT_TABLE'].'` FOR EACH ROW '.$body);}
 $hashRows=static function(array $rows):string{$canonical=[];foreach($rows as $row){ksort($row);$canonical[]=json_encode(array_map(static fn($v)=>$v===null?null:(string)$v,$row),JSON_THROW_ON_ERROR);}sort($canonical);return hash('sha256',implode("\n",$canonical));};
 $phase='compare-source-and-restore';$evidence=[];$rows=0;
 foreach($source as $table=>$data){$actual=$pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);$ddl=$pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];if($hashRows($data['rows'])!==$hashRows($actual)||App\Upms\CleanInitialization::normalize($ddl)!==App\Upms\CleanInitialization::normalize($data['ddl'])){throw new RuntimeException('RESTORED_STATE_MISMATCH');}$evidence[$table]=['rows'=>count($actual),'canonicalRowSetSha256'=>$hashRows($actual),'definitionMatched'=>true];$rows+=count($actual);}
 $actualGuards=$pdo->query('SELECT TRIGGER_NAME,ACTION_STATEMENT,DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')->fetchAll(PDO::FETCH_ASSOC);if(count($actualGuards)!==45){throw new RuntimeException('RESTORED_GUARD_COUNT_REJECTED');}
 foreach($actualGuards as $g){if(str_replace($runtime,'upms_runtime84',$g['ACTION_STATEMENT'])!==$rules[$g['TRIGGER_NAME']]['body']||$g['DEFINER']!==$maintainer.'@localhost'){throw new RuntimeException('RESTORED_GUARD_BODY_REJECTED');}}
 $phase='runtime-negative-tests';$run=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$database.';charset=utf8mb4',$runtime,$runtimePassword,$options);$negative=[];
 foreach(['identity_audit_events','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands','upms_production_migrations'] as $table){
  if(!$counts[$table]){$negative[$table]='NOT APPLICABLE - empty source';continue;}
  $column=array_key_first($source[$table]['rows'][0]);if(!preg_match('/^[a-z_]+$/D',$column)){throw new RuntimeException('NEGATIVE_PROBE_COLUMN_REJECTED');}
  foreach(['UPDATE `'.$table.'` SET `'.$column.'`=`'.$column.'` LIMIT 1','DELETE FROM `'.$table.'` LIMIT 1'] as $sql){$run->beginTransaction();$denied=false;try{$run->exec($sql);}catch(PDOException $e){$denied=$e->getCode()==='45000';}finally{if($run->inTransaction()){$run->rollBack();}}if(!$denied){throw new RuntimeException('RESTORED_IMMUTABILITY_FAILED');}}
  $negative[$table]='PASS';
 }
 foreach($source as $table=>$data){if($hashRows($pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC))!==$hashRows($data['rows'])){throw new RuntimeException('NEGATIVE_TEST_CHANGED_RESTORED_DATA');}}
 $binding=['schema'=>$database,'maintainer'=>$maintainer,'maintainerPassword'=>$maintainerPassword,'runtime'=>$runtime,'runtimePassword'=>$runtimePassword,'port'=>3330,'sourceCipherSha256'=>$request['archiveSha256']];
 file_put_contents($bindingPath,json_encode($binding,JSON_THROW_ON_ERROR),LOCK_EX);
 echo json_encode(['passed'=>true,'sourceSchema'=>'upms_v1','sourceCipherSha256'=>$request['archiveSha256'],'isolatedTarget'=>$database,'maintenanceIdentity'=>$maintainer.'@localhost','runtimeIdentity'=>$runtime.'@localhost','tables'=>20,'guards'=>45,'rows'=>$rows,'tableEvidence'=>$evidence,'protectedMutationTests'=>$negative,'sourceAndTargetRowsAndDefinitionsMatched'=>true,'guardRemapping'=>'Only runtime username and definer change for the independent isolated target','financialAndStockRowsMatched'=>true,'productionDatabaseWrites'=>0,'plaintextExportWrittenToDisk'=>false,'originalWindowsOperatorRequired'=>true,'independentOperatorGate'=>'BLOCKED - offline key custody and separate computer not yet demonstrated'],JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $error){echo json_encode(['passed'=>false,'phase'=>$phase,'isolatedTarget'=>$database,'code'=>preg_match('/^[A-Z_]+$/D',$error->getMessage())?$error->getMessage():'LOCAL_RESTORE_FAILED','exceptionClass'=>get_class($error),'sqlState'=>$error instanceof PDOException?($error->errorInfo[0]??null):null,'productionDatabaseWrites'=>0,'partialTargetPreserved'=>true]).PHP_EOL;exit(1);}
