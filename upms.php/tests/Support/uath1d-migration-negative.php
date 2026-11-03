<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{EmployeeHafta,EmployeeHaftaSchema,EmployeeHaftaGuards,LaborExtensionSchema,MoneySchema};
$c=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
if(($c['port']??0)!==3330||!preg_match('/^upms_test_php_money_[0-9]+$/D',$c['schema']??'')||!preg_match('/^money_rt_[0-9]+$/D',$c['runtime']??''))throw new RuntimeException('H1D_SYNTHETIC_ONLY');
foreach(['owner-uat-binding','uath1-owner-binding'] as $name){$owner=json_decode(file_get_contents(dirname(__DIR__,3).'/tmp/php-runtime/'.$name.'.json'),true,32,JSON_THROW_ON_ERROR);if($c['schema']===$owner['schema'])throw new RuntimeException('H1D_OWNER_NEGATIVE_TEST_REJECTED');}
$p=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$c['schema'].';charset=utf8mb4',$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);MoneySchema::assertIsolated($p);EmployeeHaftaSchema::verify($p);EmployeeHaftaGuards::verify($p,$c['runtime']);
$tables=$p->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);sort($tables);$hashes=static function()use($p,$tables){$result=[];foreach($tables as $table){$rows=array_map(EmployeeHafta::rowHash(...),$p->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC));sort($rows);$result[$table]=hash('sha256',implode("\n",$rows));}return $result;};$before=$hashes();
// Model process loss after the first native DDL step. Never drop/reset this copy.
$first=array_values(LaborExtensionSchema::plan()['tables'])[0];$p->exec($first);$rejected=false;
try{LaborExtensionSchema::installIsolated($p,$c['runtime']);}catch(Throwable $e){$rejected=$e->getMessage()==='H1C_PARTIAL_INSTALL_REVIEW_REQUIRED';}
if(!$rejected||$hashes()!==$before||count($p->query('SHOW TABLES')->fetchAll())!==35)throw new RuntimeException('H1D_PARTIAL_MIGRATION_NOT_PRESERVED');
$guards=EmployeeHaftaGuards::verify($p,$c['runtime']);
echo json_encode(['passed'=>true,'interruptedAfterFirstNativeDdl'=>true,'retryRejectedBeforeAdditionalWrites'=>true,'allOriginal34TableHashesPreserved'=>true,'actualPartialTables'=>35,'originalGuards'=>$guards['totalGuards'],'partialCopyPreservedForReview'=>true,'ownerDatabaseModified'=>false],JSON_THROW_ON_ERROR);
