<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { exit(1); }
require __DIR__.'/../../vendor/autoload.php';
use App\Upms\{BusinessCommand,CleanInitialization,Database,EmployeeHafta,EmployeeHaftaGuards,EmployeeHaftaRecovery,EmployeeHaftaSchema,ExpenseSchema,Identity,LaborExpenseAllocation,LaborExtensionGuards,LaborExtensionRecovery,LaborExtensionSchema,MoneySchema,Reconciliation,SimpleV1};
$c=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);
$repo=dirname(__DIR__,3);$fixed=realpath($repo.'/tmp/php-runtime/uath1-owner-binding.json');
if (!$fixed||realpath($c['bindingPath']??'')!==$fixed) { throw new RuntimeException('H1D_FIXED_BINDING_REQUIRED'); }
$binding=json_decode(file_get_contents($fixed),true,32,JSON_THROW_ON_ERROR);
$original=json_decode(file_get_contents($repo.'/tmp/php-runtime/owner-uat-binding.json'),true,32,JSON_THROW_ON_ERROR);
if ($binding!==$c['binding']||$binding['schema']===$original['schema']||!preg_match('/^upms_test_php_money_\d+$/D',$binding['schema'])||!preg_match('/^money_rt_\d+$/D',$binding['runtime'])) { throw new RuntimeException('H1D_DISTINCT_FIXED_OWNER_TARGET_REQUIRED'); }
$env=realpath($c['envPath']);$directory=realpath($binding['directory']);
if (!$env||!$directory||!str_starts_with($env,$directory.DIRECTORY_SEPARATOR)||!str_starts_with($directory,realpath($repo.'/tmp/php-runtime').DIRECTORY_SEPARATOR)) { throw new RuntimeException('H1D_PRIVATE_ENV_REQUIRED'); }
$app=require __DIR__.'/../../bootstrap/app.php';$app->useEnvironmentPath(dirname($env));$app->loadEnvironmentFrom(basename($env));$app->make(Illuminate\Contracts\Http\Kernel::class)->bootstrap();
if (config('upms.production_profile')||config('upms.host')!=='127.0.0.1'||(int)config('upms.port')!==3330||config('upms.database')!==$binding['schema']||config('upms.username')!==$binding['runtime']) { throw new RuntimeException('H1D_UAT_PROFILE_REQUIRED'); }
$db=new Database();$runtime=$db->pdo();MoneySchema::assertIsolated($runtime);
if ($runtime->query('SELECT CURRENT_USER()')->fetchColumn()!==$binding['runtime'].'@localhost') { throw new RuntimeException('H1D_AUTHENTICATED_RUNTIME_MISMATCH'); }
function h1dHashes(PDO $pdo): array {
    $result=[];$tables=$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);sort($tables);
    foreach ($tables as $table) { if (in_array($table,['sessions','login_attempts'],true)) { continue; }$rows=$pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);$hashes=array_map(EmployeeHafta::rowHash(...),$rows);sort($hashes);$result[$table]=['rows'=>count($rows),'hash'=>hash('sha256',implode("\n",$hashes))]; }
    return $result;
}
function h1dMaintenance(array $c,array $binding): PDO {
    return new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$binding['schema'].';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
}
$service=new EmployeeHafta($db);$data=$service->data();$service->requireReconciled();$result=['readOnly'=>true,'database'=>$binding['schema'],'runtime'=>$runtime->query('SELECT CURRENT_USER()')->fetchColumn(),'tableCount'=>count($runtime->query('SHOW TABLES')->fetchAll()),'guards'=>LaborExtensionGuards::verify(h1dMaintenance($c,$binding),$binding['runtime'],'php2_test_admin@127.0.0.1')];
$result['openings']=array_map(fn($r)=>array_intersect_key($r,array_flip(['id','employee_id','date','amount','reference','reason','created_at','actor_id'])),$data['labor_openings']);
$result['openingAudit']=array_values(array_filter($data['labor_audit'],fn($r)=>$r['entry_type']==='OPENING'));
$result['allocations']=array_map(fn($r)=>array_intersect_key($r,array_flip(['id','employee_id','expense_id','date','amount','reference','created_at'])),$data['labor_expense_allocations']);
$result['earnings']=array_map(fn($r)=>array_intersect_key($r,array_flip(['id','employee_id','document_id','date','amount'])),$data['labor_earnings']);
$result['report']=$service->report(['from'=>'2026-11-02','to'=>'2026-11-08','employeeId'=>'1']);
$result['fullPeriodReport']=$service->report(['from'=>'2026-11-03','to'=>'2026-11-08','employeeId'=>'1']);
$sourceAllocations=array_values(array_filter($data['labor_expense_allocations'],fn($r)=>(string)$r['expense_id']==='3'));if(count($sourceAllocations)!==1)throw new RuntimeException('H1E_EXACT_SOURCE_ALLOCATION_REQUIRED');$source=LaborExpenseAllocation::source('3',$data,(string)$sourceAllocations[0]['id']);$prior=json_decode(file_get_contents($repo.'/docs/uat-h1d/evidence/upgrade-result.json'),true);$hashes=h1dHashes($runtime);$unchanged=[];
foreach(['v1_documents','v1_lines','v1_stock','v1_stock_journal','v1_party_journal','money_batches','money_movements','money_audit'] as $table){$unchanged[$table]=$hashes[$table]===$prior['after']['originalFingerprints'][$table];}
$result['originalSourceUnchangedSinceH1D']=$unchanged;$result['sourceVerified']=['expenseId'=>'3','amount'=>$source['document']['total'],'batchId'=>(string)$source['batch']['id'],'movementId'=>(string)$source['movement']['id'],'canonicalVerified'=>true,'directLaborPayments'=>count($data['labor_payments']),'allocationCountForSource'=>count(array_filter($data['labor_expense_allocations'],fn($r)=>(string)$r['expense_id']==='3'))];
$result['fingerprints']=$hashes;echo json_encode($result,JSON_THROW_ON_ERROR);
