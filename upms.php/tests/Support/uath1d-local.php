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
function h1dSnapshotHashes(array $snapshot): array {
    $result=[];foreach($snapshot['tables'] as $table=>$content) { if(in_array($table,['sessions','login_attempts'],true))continue;$hashes=array_map(EmployeeHafta::rowHash(...),$content['rows']);sort($hashes);$result[$table]=['rows'=>count($hashes),'hash'=>hash('sha256',implode("\n",$hashes))]; }ksort($result);return $result;
}
function h1dOriginalRows(PDO $pdo,array $snapshot): bool {
    foreach($snapshot['tables'] as $table=>$content) { $actual=array_count_values(array_map(EmployeeHafta::rowHash(...),$pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC)));foreach($content['rows'] as $r) { $hash=EmployeeHafta::rowHash($r);if(($actual[$hash]??0)<1)return false;$actual[$hash]--; }if(!in_array($table,['permissions','role_permissions'],true)&&array_sum($actual)!==0)return false; }
    return true;
}
function h1dMaintenance(array $c,array $binding): PDO {
    $p=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$binding['schema'].';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);MoneySchema::assertIsolated($p);return $p;
}
function h1dGrants(PDO $pdo,array $binding): array {
    $raw=array_map(fn($r)=>array_values($r)[0],$pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_ASSOC));$own=array_values(array_filter($raw,fn($r)=>!str_ends_with($r,' TO PUBLIC')));
    $account='`'.$binding['runtime'].'`@`localhost`';$expected='GRANT SELECT, INSERT, UPDATE, DELETE ON `'.str_replace('_','\\_',$binding['schema']).'`.* TO '.$account;
    if(count($own)!==2||!in_array($expected,$own,true)||count(array_filter($own,fn($g)=>str_starts_with($g,'GRANT USAGE ON *.* TO '.$account)&&!str_contains($g,'WITH GRANT OPTION')))!==1)throw new RuntimeException('H1D_EXACT_TARGET_CRUD_GRANTS_REQUIRED');
    return array_map(fn($g)=>preg_replace('/ IDENTIFIED .*/',' [authentication omitted]',$g),$raw);
}
function h1dPreservedBaseHashes(PDO $pdo): array {
    $result=[];$caps=implode(',',array_map($pdo->quote(...),LaborExtensionSchema::PERMISSIONS));
    foreach(EmployeeHaftaRecovery::tables() as $table) { if(in_array($table,['sessions','login_attempts'],true))continue;$where=$table==='permissions'?' WHERE code NOT IN('.$caps.')':($table==='role_permissions'?' WHERE permission_code NOT IN('.$caps.')':'');$rows=$pdo->query('SELECT * FROM `'.$table.'`'.$where)->fetchAll(PDO::FETCH_ASSOC);$hashes=array_map(EmployeeHafta::rowHash(...),$rows);sort($hashes);$result[$table]=['rows'=>count($rows),'hash'=>hash('sha256',implode("\n",$hashes))]; }
    foreach(LaborExtensionSchema::PERMISSIONS as $cap) { if((int)$pdo->query('SELECT COUNT(*) FROM permissions WHERE code='.$pdo->quote($cap))->fetchColumn()!==1||(int)$pdo->query('SELECT COUNT(*) FROM role_permissions WHERE permission_code='.$pdo->quote($cap).' AND role_code=\'administrator\'')->fetchColumn()!==1||(int)$pdo->query('SELECT COUNT(*) FROM role_permissions WHERE permission_code='.$pdo->quote($cap))->fetchColumn()!==1)throw new RuntimeException('H1D_ONLY_APPROVED_PERMISSION_ADDITIONS_REQUIRED'); }
    return $result;
}
function h1dRestoreReview(array $c,array $binding,string $root): array {
    $proof=json_decode(file_get_contents($root.'/preflight.json'),true,512,JSON_THROW_ON_ERROR);
    if(($proof['passed']??false)!==true||($proof['sourceDatabase']??'')!==$binding['schema']||dirname(realpath($proof['archive']))!==$root||hash_file('sha256',$proof['archive'])!==$proof['archiveSha256'])throw new RuntimeException('H1D_RECOVERY_ARCHIVE_CHECKSUM_REQUIRED');
    $kp=base64_decode($c['keyPair'],true);$snapshot=EmployeeHaftaRecovery::decrypt(file_get_contents($proof['archive']),$kp);sodium_memzero($kp);
    if(h1dSnapshotHashes($snapshot)!==$proof['sourceFingerprints'])throw new RuntimeException('H1D_RECOVERY_SOURCE_HASHES_REJECTED');
    $source=h1dMaintenance($c,$binding);$stamp=(string)time().random_int(100000,999999);$clone='upms_test_php_money_'.$stamp.'_restore';$rt='money_rt_'.$stamp;$password=bin2hex(random_bytes(32));
    $source->exec('CREATE DATABASE `'.$clone.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');$source->exec("CREATE USER '$rt'@'localhost' IDENTIFIED BY ".$source->quote($password));$source->exec('GRANT SELECT,INSERT,UPDATE,DELETE ON `'.str_replace('_','\\_',$clone).'`.* TO `'.$rt.'`@\'localhost\'');
    $copy=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$clone.';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);$restored=EmployeeHaftaRecovery::restoreIsolated($copy,$snapshot,$rt);
    if(h1dHashes($copy)!==$proof['sourceFingerprints'])throw new RuntimeException('H1D_RECOVERY_ORIGINAL_ROW_HASHES_MISMATCH');
    $g=EmployeeHaftaGuards::verify($copy,$rt,(string)$copy->query('SELECT CURRENT_USER()')->fetchColumn());$money=MoneySchema::verify($copy);$common=[...$g,'runtime'=>$rt.'@localhost','targetHash'=>CleanInitialization::target($copy),'planHash'=>MoneySchema::hash(),'accountsHash'=>$money['accountsHash'],'expensePlanHash'=>ExpenseSchema::hash()];
    $base=$root.'/review-'.$stamp.'-72.json';$labor=$root.'/review-'.$stamp.'-88.json';file_put_contents($base,json_encode([...$common,'totalGuards'=>72],JSON_THROW_ON_ERROR));file_put_contents($labor,json_encode([...$common,'laborPlanHash'=>EmployeeHaftaSchema::hash()],JSON_THROW_ON_ERROR));
    config(['upms.database'=>$clone,'upms.username'=>$rt,'upms.password'=>$password,'upms.money_guard_evidence'=>$base,'upms.expense_guard_evidence'=>$base,'upms.employee_hafta_guard_evidence'=>$labor,'upms.labor_classification_enabled'=>false]);
    $inventory=(new Reconciliation(new Database()))->run();if(!$inventory['matched'])throw new RuntimeException('H1D_REVIEW_COPY_INVENTORY_RECONCILIATION_FAILED');
    return ['passed'=>true,'database'=>$clone,'tables'=>34,'guards'=>88,'rows'=>$restored['rows'],'allOriginalTableHashesMatched'=>true,'inventoryFinancialAndLaborReconciled'=>true,'authenticatedDecryptionVerified'=>true,'ownerDatabaseModified'=>false,'ownerBindingChanged'=>false,'sourceDatabasePreserved'=>$binding['schema'],'productionConnected'=>false];
}
try { switch ($c['action']) {
    case 'inspect':
        $p=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$binding['schema'].';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);MoneySchema::assertIsolated($p);
        $schema=LaborExtensionSchema::enabled()?LaborExtensionSchema::verify($p):EmployeeHaftaSchema::verify($p);$guards=LaborExtensionSchema::enabled()?LaborExtensionGuards::verify($p,$binding['runtime'],(string)$p->query('SELECT CURRENT_USER()')->fetchColumn()):EmployeeHaftaGuards::verify($p,$binding['runtime'],(string)$p->query('SELECT CURRENT_USER()')->fetchColumn());
        $grants=h1dGrants($runtime,$binding);
        $data=(new EmployeeHafta($db))->data();$data['money_movements']=$db->rows('SELECT * FROM money_movements');$employees=$db->rows("SELECT id,name,active,version FROM employees WHERE name='Ahmed'");$sources=[];
        foreach($data['v1_documents'] as $d) { $payload=SimpleV1::payload($d);if($d['kind']!=='EXPENSE'||$d['status']!=='POSTED'||($payload['employeeSnapshot']['name']??'')!=='Ahmed') { continue; }
            try { $source=LaborExpenseAllocation::source((string)$d['id'],$data);$balance=LaborExpenseAllocation::balance($data,(string)$payload['employeeId']);$sources[]=['expenseId'=>(string)$d['id'],'amount'=>$d['total'],'date'=>$d['date'],'employeeId'=>$payload['employeeId'],'employeeName'=>$payload['employeeSnapshot']['name'],'canonicalSourceVerified'=>true,'batchId'=>(string)$source['batch']['id'],'movementId'=>(string)$source['movement']['id'],'sourceHashes'=>['expense'=>EmployeeHafta::rowHash($d),'batch'=>EmployeeHafta::rowHash($source['batch']),'movement'=>EmployeeHafta::rowHash($source['movement'])],'opening'=>$balance['opening']?['date'=>$balance['opening']['date'],'amount'=>$balance['opening']['amount']]:null,'verifiedCurrentPayable'=>$balance['available'],'manualOpeningReviewRequired'=>$balance['opening']===null]; }
            catch(Throwable $e) { $sources[]=['expenseId'=>(string)$d['id'],'canonicalSourceVerified'=>false,'code'=>$e instanceof App\Upms\ApiError?$e->apiCode:'SOURCE_INSPECTION_FAILED']; }
        }
        $admins=[];$identity=new Identity($db);foreach($db->rows("SELECT u.id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_code='administrator'") as $u) { $admins[]=$identity->user((string)$u['id']); }
        $reconciliation=(new Reconciliation($db))->run();if(!$reconciliation['matched']) { throw new RuntimeException('H1D_OWNER_RECONCILIATION_FAILED'); }
        echo json_encode(['passed'=>true,'readOnly'=>true,'database'=>$binding['schema'],'targetHost'=>'127.0.0.1','port'=>3330,'targetHash'=>CleanInitialization::target($runtime),'runtimeAuthenticatedAs'=>$runtime->query('SELECT CURRENT_USER()')->fetchColumn(),'runtimeGrants'=>$grants,'maintenanceDefiner'=>$guards['definer'],'schema'=>$schema,'guards'=>$guards,'tableCount'=>(int)$p->query('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')->fetchColumn(),'administrators'=>$admins,'employees'=>$employees,'earnings'=>array_map(fn($r)=>array_intersect_key($r,array_flip(['id','document_id','employee_id','date','quantity','labor_rate','amount'])),$data['labor_earnings']),'ahmedSources'=>$sources,'reconciliation'=>$reconciliation,'originalFingerprints'=>h1dHashes($p),'migrationVersion'=>LaborExtensionSchema::VERSION,'migrationPlanHash'=>LaborExtensionSchema::hash(),'productionConnected'=>false,'ownerRecordsWritten'=>false],JSON_THROW_ON_ERROR);break;
    case 'keygen': $kp=sodium_crypto_box_keypair();echo json_encode(['keyPair'=>base64_encode($kp),'publicKey'=>base64_encode(sodium_crypto_box_publickey($kp))]);sodium_memzero($kp);break;
    case 'restore-review': $root=realpath($repo.'/tmp/php-runtime/uath1d-owner-protection');echo json_encode(h1dRestoreReview($c,$binding,$root),JSON_THROW_ON_ERROR);break;
    case 'checkpoint':
        $root=realpath($repo.'/tmp/php-runtime/uath1d-owner-protection');$proof=json_decode(file_get_contents($root.'/preflight.json'),true,512,JSON_THROW_ON_ERROR);$p=h1dMaintenance($c,$binding);h1dGrants($runtime,$binding);LaborExtensionSchema::verify($p);
        if(hash_file('sha256',$proof['archive'])!==$proof['archiveSha256'])throw new RuntimeException('H1D_ORIGINAL_BACKUP_CHECKSUM_FAILED');
        $kp=base64_decode($c['keyPair'],true);$old=EmployeeHaftaRecovery::decrypt(file_get_contents($proof['archive']),$kp);$public=sodium_crypto_box_publickey($kp);
        $current=LaborExtensionRecovery::capture($p,$binding['runtime']);$additions=[];
        foreach($old['tables'] as $table=>$content) { if(in_array($table,['sessions','login_attempts'],true))continue;$actual=array_count_values(array_map(EmployeeHafta::rowHash(...),$current['tables'][$table]['rows']));foreach($content['rows'] as $row){$hash=EmployeeHafta::rowHash($row);if(($actual[$hash]??0)<1)throw new RuntimeException('H1D_ORIGINAL_RECORD_CHANGED');$actual[$hash]--;}$additions[$table]=array_sum($actual); }
        $beforeSource=$proof['sourceFingerprints'];foreach(LaborExtensionSchema::PERMISSIONS as $cap){if((int)$p->query('SELECT COUNT(*) FROM permissions WHERE code='.$p->quote($cap))->fetchColumn()!==1||(int)$p->query('SELECT COUNT(*) FROM role_permissions WHERE permission_code='.$p->quote($cap).' AND role_code=\'administrator\'')->fetchColumn()!==1)throw new RuntimeException('H1D_PERMISSION_PROOF_MISMATCH');}
        $stamp=(string)time().random_int(100000,999999);$archive=$root.'/postupgrade-'.$stamp.'.sealed';$cipher=LaborExtensionRecovery::encrypt($current,$public);$cipherHash=hash('sha256',$cipher);$file=fopen($archive,'xb');try{if(fwrite($file,$cipher)!==strlen($cipher))throw new RuntimeException('H1D_CHECKPOINT_WRITE_FAILED');}finally{fclose($file);}unset($current,$cipher);
        if(hash_file('sha256',$archive)!==$cipherHash)throw new RuntimeException('H1D_CHECKPOINT_CHECKSUM_FAILED');$snapshot=LaborExtensionRecovery::decrypt(file_get_contents($archive),$kp);sodium_memzero($kp);
        $clone='upms_test_php_money_'.$stamp.'_restore';$rt='money_rt_'.$stamp;$password=bin2hex(random_bytes(32));$p->exec('CREATE DATABASE `'.$clone.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');$p->exec("CREATE USER '$rt'@'localhost' IDENTIFIED BY ".$p->quote($password));$p->exec('GRANT SELECT,INSERT,UPDATE,DELETE ON `'.str_replace('_','\\_',$clone).'`.* TO `'.$rt.'`@\'localhost\'');
        $copy=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$clone.';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);$restored=LaborExtensionRecovery::restoreIsolated($copy,$snapshot,$rt);
        $money=MoneySchema::verify($copy);$guards=LaborExtensionGuards::verify($copy,$rt,(string)$copy->query('SELECT CURRENT_USER()')->fetchColumn());$common=[...$guards,'runtime'=>$rt.'@localhost','targetHash'=>CleanInitialization::target($copy),'planHash'=>MoneySchema::hash(),'accountsHash'=>$money['accountsHash'],'expensePlanHash'=>ExpenseSchema::hash()];
        $base=$root.'/checkpoint-'.$stamp.'-72.json';$extension=$root.'/checkpoint-'.$stamp.'-103.json';file_put_contents($base,json_encode([...$common,'totalGuards'=>72],JSON_THROW_ON_ERROR));file_put_contents($extension,json_encode([...$common,'extensionPlanHash'=>LaborExtensionSchema::hash()],JSON_THROW_ON_ERROR));
        config(['upms.database'=>$clone,'upms.username'=>$rt,'upms.password'=>$password,'upms.money_guard_evidence'=>$base,'upms.expense_guard_evidence'=>$base,'upms.labor_extension_guard_evidence'=>$extension,'upms.labor_classification_enabled'=>true]);$inventory=(new Reconciliation(new Database()))->run();if(!$inventory['matched'])throw new RuntimeException('H1D_POSTUPGRADE_RESTORE_RECONCILIATION_FAILED');
        $businessTables=['v1_documents','v1_lines','v1_stock','v1_stock_journal','v1_party_journal','money_batches','money_movements','money_audit','labor_openings','labor_earnings','labor_payments','labor_audit'];$businessAdded=array_intersect_key($additions,array_flip($businessTables));
        echo json_encode(['passed'=>true,'ownerDatabase'=>$binding['schema'],'allOriginalNonSessionRowsPreserved'=>true,'originalBusinessRowsAdded'=>$businessAdded,'identityAuditRowsAdded'=>$additions['identity_audit_events'],'permissionRowsAdded'=>$additions['permissions'],'administratorPermissionGrantsAdded'=>$additions['role_permissions'],'newAllocations'=>count($snapshot['tables']['labor_expense_allocations']['rows']),'archive'=>$archive,'archiveSha256'=>$cipherHash,'format'=>LaborExtensionRecovery::FORMAT,'authenticatedDecryptionVerified'=>true,'plaintextWrittenToDisk'=>false,'independentRestore'=>['database'=>$clone,'tables'=>38,'guards'=>$restored['guards']['totalGuards'],'rows'=>$restored['rows'],'allRowsCompared'=>true,'financialInventoryLaborReconciled'=>$inventory['matched']],'ownerBindingChanged'=>false,'ownerFinancialTransactionsPostedByThisCommand'=>false,'productionConnected'=>false],JSON_THROW_ON_ERROR);break;
    case 'verify-rehearsal':
        $root=realpath($repo.'/tmp/php-runtime/uath1d-owner-protection');$proof=json_decode(file_get_contents($root.'/preflight.json'),true,512,JSON_THROW_ON_ERROR);$clone=$proof['independentRestore']['database'];
        if(!preg_match('/^upms_test_php_money_[0-9]+_restore$/D',$clone)||$clone===$binding['schema'])throw new RuntimeException('H1D_REHEARSAL_COPY_REQUIRED');
        $copy=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$clone.';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);MoneySchema::assertIsolated($copy,true);
        $cloneRuntime=explode('@',$proof['migrationRehearsal']['proof']['runtime'])[0];$guards=LaborExtensionGuards::verify($copy,$cloneRuntime,(string)$copy->query('SELECT CURRENT_USER()')->fetchColumn());
        if(h1dPreservedBaseHashes($copy)!==$proof['sourceFingerprints'])throw new RuntimeException('H1D_REHEARSAL_PRESERVATION_COMPARISON_FAILED');
        echo json_encode(['passed'=>true,'schema'=>LaborExtensionSchema::verify($copy),'guards'=>$guards['totalGuards'],'originalBaseRowsPreserved'=>true,'onlyApprovedPermissionAdditions'=>true,'ownerDatabaseModified'=>false],JSON_THROW_ON_ERROR);break;
    case 'upgrade':
        $root=realpath($repo.'/tmp/php-runtime/uath1d-owner-protection');$preflightPath=$root.'/preflight.json';
        if(($c['ownerAuthorized']??false)!==true||!is_string($c['approvalReference']??null)||strlen(trim($c['approvalReference']))<10||!is_file($preflightPath)||!hash_equals(hash_file('sha256',$preflightPath),$c['preflightSha256']??''))throw new RuntimeException('H1D_SEPARATE_OWNER_AUTHORIZATION_REQUIRED');
        $proof=json_decode(file_get_contents($preflightPath),true,512,JSON_THROW_ON_ERROR);$marker=json_decode(file_get_contents($directory.'/uath1d-maintenance.json'),true,32,JSON_THROW_ON_ERROR);
        if(($proof['passed']??false)!==true||($proof['authenticatedDecryptionVerified']??false)!==true||($proof['sourceDatabase']??'')!==$binding['schema']||($proof['expectedMigrationPlanHash']??'')!==LaborExtensionSchema::hash()||($marker['status']??'')!=='INSTALLING'||($marker['preflightSha256']??'')!==$c['preflightSha256']||!is_file($proof['archive'])||hash_file('sha256',$proof['archive'])!==$proof['archiveSha256'])throw new RuntimeException('H1D_TARGET_BOUND_PREFLIGHT_REQUIRED');
        $p=h1dMaintenance($c,$binding);h1dGrants($runtime,$binding);
        if(CleanInitialization::target($p)!==$proof['sourceTargetHash']||h1dHashes($p)!==$proof['sourceFingerprints'])throw new RuntimeException('H1D_STALE_PREFLIGHT_NO_MIGRATION');
        if(!(new Reconciliation($db))->run()['matched'])throw new RuntimeException('H1D_IMMEDIATE_PREUPGRADE_RECONCILIATION_FAILED');
        $installed=LaborExtensionSchema::installIsolated($p,$binding['runtime']);
        if(h1dPreservedBaseHashes($p)!==$proof['sourceFingerprints'])throw new RuntimeException('H1D_UPGRADE_ORIGINAL_ROWS_CHANGED');
        h1dGrants($runtime,$binding);
        echo json_encode(['passed'=>true,'database'=>$binding['schema'],'schema'=>LaborExtensionSchema::verify($p),'guards'=>$installed,'preservedOriginalRows'=>true,'permissionRowsAdded'=>2,'administratorPermissionGrantsAdded'=>2,'originalBusinessRecordsModified'=>false,'originalAdministratorRowsModified'=>false,'approvalReference'=>$c['approvalReference'],'preflightSha256'=>$c['preflightSha256'],'manualOpeningAndAllocationPerformed'=>false,'productionConnected'=>false],JSON_THROW_ON_ERROR);break;
    case 'backup-rehearse':
        $root=realpath($repo.'/tmp/php-runtime/uath1d-owner-protection');
        if(!$root||realpath($c['proofDirectory']??'')!==$root||!preg_match('/^preupgrade-[0-9]+\.sealed$/D',basename($c['archivePath']??''))||dirname($c['archivePath'])!==$root||file_exists($c['archivePath']))throw new RuntimeException('H1D_PRIVATE_NEW_ARCHIVE_REQUIRED');
        $p=h1dMaintenance($c,$binding);$before=h1dHashes($p);
        if(!(new Reconciliation($db))->run()['matched'])throw new RuntimeException('H1D_SOURCE_RECONCILIATION_REQUIRED');
        $snapshot=EmployeeHaftaRecovery::capture($p,$binding['runtime']);
        if(h1dSnapshotHashes($snapshot)!==$before||h1dHashes($p)!==$before)throw new RuntimeException('H1D_SOURCE_CHANGED_DURING_BACKUP');
        $public=base64_decode($c['publicKey'],true);$keyPair=base64_decode($c['keyPair'],true);unset($c['keyPair']);
        if(!$keyPair||!$public||sodium_crypto_box_publickey($keyPair)!==$public)throw new RuntimeException('H1D_RECIPIENT_REJECTED');
        $cipher=EmployeeHaftaRecovery::encrypt($snapshot,$public);$manifestHash=hash('sha256',BusinessCommand::json($snapshot));unset($snapshot);
        $file=fopen($c['archivePath'],'xb');if(!$file)throw new RuntimeException('H1D_ARCHIVE_CREATE_FAILED');try{if(fwrite($file,$cipher)!==strlen($cipher))throw new RuntimeException('H1D_ARCHIVE_WRITE_FAILED');}finally{fclose($file);}
        $cipherHash=hash('sha256',$cipher);unset($cipher);
        if(hash_file('sha256',$c['archivePath'])!==$cipherHash)throw new RuntimeException('H1D_CIPHERTEXT_CHECKSUM_FAILED');
        $snapshot=EmployeeHaftaRecovery::decrypt(file_get_contents($c['archivePath']),$keyPair);sodium_memzero($keyPair);
        if(hash('sha256',BusinessCommand::json($snapshot))!==$manifestHash)throw new RuntimeException('H1D_AUTHENTICATED_MANIFEST_MISMATCH');
        $stamp=(string)time().random_int(100000,999999);$clone='upms_test_php_money_'.$stamp.'_restore';$cloneRuntime='money_rt_'.$stamp;$clonePassword=bin2hex(random_bytes(32));
        $p->exec('CREATE DATABASE `'.$clone.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $p->exec("CREATE USER '$cloneRuntime'@'localhost' IDENTIFIED BY ".$p->quote($clonePassword));
        $p->exec('GRANT SELECT,INSERT,UPDATE,DELETE ON `'.str_replace('_','\\_',$clone).'`.* TO `'.$cloneRuntime.'`@\'localhost\'');
        $copy=new PDO('mysql:host=127.0.0.1;port=3330;dbname='.$clone.';charset=utf8mb4','php2_test_admin',$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
        $restored=EmployeeHaftaRecovery::restoreIsolated($copy,$snapshot,$cloneRuntime);
        if(!$restored['passed']||h1dHashes($copy)!==$before)throw new RuntimeException('H1D_RESTORED_ORIGINAL_HASHES_MISMATCH');
        $target=CleanInitialization::target($copy);$money=MoneySchema::verify($copy);$guards=EmployeeHaftaGuards::verify($copy,$cloneRuntime,(string)$copy->query('SELECT CURRENT_USER()')->fetchColumn());
        $common=[...$guards,'runtime'=>$cloneRuntime.'@localhost','targetHash'=>$target,'planHash'=>MoneySchema::hash(),'accountsHash'=>$money['accountsHash'],'expensePlanHash'=>ExpenseSchema::hash()];
        $basePath=$root.'/restore-'.$stamp.'-72.json';$laborPath=$root.'/restore-'.$stamp.'-88.json';
        file_put_contents($basePath,json_encode([...$common,'totalGuards'=>72],JSON_THROW_ON_ERROR));file_put_contents($laborPath,json_encode([...$common,'laborPlanHash'=>EmployeeHaftaSchema::hash()],JSON_THROW_ON_ERROR));
        config(['upms.database'=>$clone,'upms.username'=>$cloneRuntime,'upms.password'=>$clonePassword,'upms.money_guard_evidence'=>$basePath,'upms.expense_guard_evidence'=>$basePath,'upms.employee_hafta_guard_evidence'=>$laborPath,'upms.labor_classification_enabled'=>false]);
        $copyDb=new Database();$inventory=(new Reconciliation($copyDb))->run();if(!$inventory['matched'])throw new RuntimeException('H1D_INDEPENDENT_RESTORE_RECONCILIATION_FAILED');
        $rehearsal=LaborExtensionSchema::installIsolated($copy,$cloneRuntime);
        if(!h1dOriginalRows($copy,$snapshot))throw new RuntimeException('H1D_REHEARSAL_ORIGINAL_ROWS_CHANGED');
        if(h1dHashes($p)!==$before)throw new RuntimeException('H1D_OWNER_CHANGED_DURING_PREFLIGHT');
        echo json_encode(['passed'=>true,'sourceDatabase'=>$binding['schema'],'sourceTargetHash'=>CleanInitialization::target($p),'sourceTables'=>34,'sourceGuards'=>88,'sourceFingerprints'=>$before,'archive'=>$c['archivePath'],'archiveSha256'=>$cipherHash,'archiveBytes'=>filesize($c['archivePath']),'snapshotManifestSha256'=>$manifestHash,'format'=>EmployeeHaftaRecovery::FORMAT,'authenticatedDecryptionVerified'=>true,'plaintextWrittenToDisk'=>false,'privateKeyProtection'=>'Windows DPAPI CurrentUser','independentRestore'=>['database'=>$clone,'tables'=>34,'guards'=>88,'rows'=>$restored['rows'],'allTableHashesMatched'=>true,'reconciliation'=>$restored['reconciliation'],'inventoryReconciliation'=>$inventory],'migrationRehearsal'=>['tables'=>38,'guards'=>$rehearsal['totalGuards'],'allOriginalRowsPreserved'=>true,'proof'=>$rehearsal],'ownerDatabaseMigrated'=>false,'ownerRecordsWritten'=>false,'productionConnected'=>false],JSON_THROW_ON_ERROR);break;
    default:throw new RuntimeException('H1D_UNKNOWN_ACTION');
} } catch(Throwable $error) {
    $diagnostic=['failed'=>true,'type'=>get_class($error),'native'=>$error instanceof PDOException?($error->errorInfo[1]??null):null,'code'=>preg_match('/^[A-Z][A-Z_]+$/D',$error->getMessage())?$error->getMessage():'H1D_NATIVE_STAGE_FAILED','file'=>basename($error->getFile()),'line'=>$error->getLine(),'trace'=>array_map(fn($r)=>['file'=>basename($r['file']??''),'line'=>$r['line']??null,'function'=>$r['function']],array_slice($error->getTrace(),0,5))];
    $safeRoot=realpath($repo.'/tmp/php-runtime/uath1d-owner-protection');if($safeRoot)file_put_contents($safeRoot.'/native-failure.json',json_encode($diagnostic,JSON_THROW_ON_ERROR));
    fwrite(STDERR,$diagnostic['code']);exit(1);
}
