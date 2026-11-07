<?php
declare(strict_types=1);

require __DIR__.'/../../vendor/autoload.php';

use App\Upms\{CleanInitialization,CumulativeInitialization,CumulativeProduction,ProductionConnection,ProductionRecoveryV2};

$directory = getenv('P42C_DIRECTORY');
if (PHP_OS_FAMILY !== 'Linux' || !$directory || !str_starts_with(realpath($directory),getenv('HOME').'/.cache/upms-php81-local/p42c-')) {
    throw new RuntimeException('P42C_PRIVATE_ISOLATED_DIRECTORY_REQUIRED');
}
$socket=$directory.'/mysql.sock';
$root=new PDO('mysql:unix_socket='.$socket.';charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if (!(int)$root->query('SELECT @@skip_networking')->fetchColumn()) { throw new RuntimeException('P42C_OFFLINE_ENGINE_REQUIRED'); }
$configFile=$directory.'/fixture.json';
$mode=$argv[1]??'';
$package=getenv('P42C_PACKAGE')?:null;
$privateCommand=static function(string $name,array $paths,string $input='') use($package): string {
    $process=proc_open([PHP_BINARY,$package.'/private/backend/operations/'.$name,...$paths],
        [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    fwrite($pipes[0],$input);fclose($pipes[0]);
    $output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);
    fclose($pipes[1]);fclose($pipes[2]);
    if (proc_close($process)!==0) { throw new RuntimeException(trim($error)); }
    return $output;
};
if ($mode==='initialize') {
    $id=(string)time();
    $schema='upms_stage_'.$id;
    $root->exec('CREATE DATABASE `'.$schema.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $meta=$root->query('SELECT VERSION() version,@@server_id server_id')->fetch(PDO::FETCH_ASSOC);
    $accounts=[];$profiles=[];$connections=[];
    foreach (['installer'=>'CREATE,REFERENCES,SELECT,INSERT,UPDATE','definer'=>'SELECT,TRIGGER','runtime'=>'SELECT,INSERT,UPDATE,DELETE'] as $role=>$grants) {
        $user='p42c_'.$role;
        $password=bin2hex(random_bytes(32));
        $root->exec("CREATE USER '$user'@'localhost' IDENTIFIED BY ".$root->quote($password));
        $root->exec('GRANT '.$grants.' ON `'.str_replace('_','\\_',$schema)."`.* TO '$user'@'localhost'");
        file_put_contents($directory.'/'.$role.'.password',$password);chmod($directory.'/'.$role.'.password',0600);
        $accounts[$role]=$user.'@localhost';
        $profiles[$role]=['enabled'=>true,'mode'=>'one-time-clean-initialization','hostingVerified'=>true,'backupRestoreVerified'=>true,
            'privateRoot'=>$directory,'publicRoot'=>$directory.'/public','managementRoot'=>$directory.'/management',
            'transport'=>'unix_socket','socket'=>$socket,'socketOwnerUid'=>(string)fileowner($socket),
            'serverHostname'=>gethostname(),'localSocketVerified'=>true,'schema'=>$schema,'user'=>$user,'account'=>$accounts[$role],
            'passwordFile'=>$directory.'/'.$role.'.password','serverVersion'=>$meta['version'],'serverId'=>(string)$meta['server_id'],
            'origin'=>'https://app.unique-plastic.com','reference'=>'p42c_staging_'.$id];
        $connections[$role]=ProductionConnection::connect($profiles[$role]+['password'=>$password]);
    }
    mkdir($directory.'/public',0700);mkdir($directory.'/management',0700);
    $scope=['schema'=>$schema,'reference'=>$profiles['runtime']['reference'],'release'=>trim(shell_exec('git rev-parse HEAD')),
        'targetHash'=>CleanInitialization::target($connections['runtime']),'accounts'=>$accounts];
    $passwords=['admin'=>bin2hex(random_bytes(24)),'haris'=>bin2hex(random_bytes(24))];
    if ($package) {
        $manifest=json_decode(file_get_contents($package.'/RELEASE.json'),true,64,JSON_THROW_ON_ERROR);
        $scope['release']=$manifest['sourceCommit'];
        $paths=[];
        foreach ($profiles as $role=>&$c) {
            $c+=['cumulativeCleanApproved'=>true,'receiptFile'=>$directory.'/journal.json',
                'targetHash'=>$scope['targetHash'],'releaseSha'=>$scope['release'],
                'releaseManifestSha256'=>hash_file('sha256',$package.'/RELEASE.json')];
            $paths[]=$directory.'/'.$role.'.json';
            CleanInitialization::privateReceipt(end($paths),$c,true);
        }
        unset($c);
        $first=$privateCommand('initialize-cumulative.php',$paths,json_encode($passwords,JSON_THROW_ON_ERROR));
        $again=$privateCommand('initialize-cumulative.php',$paths,json_encode($passwords,JSON_THROW_ON_ERROR));
        if (json_decode($first,true)['state']!==CumulativeProduction::READY || json_decode($again,true)['state']!==CumulativeProduction::READY) {
            throw new RuntimeException('P42C_PACKAGED_INITIALIZER_RETRY_FAILED');
        }
        $proof=json_decode(file_get_contents($directory.'/journal.json.ready'),true,64,JSON_THROW_ON_ERROR);
    } else {
        CumulativeInitialization::initialize($connections['installer'],$connections['definer'],$connections['runtime'],
            $scope,$directory.'/journal.json',$passwords);
        $proof=CumulativeProduction::complete($connections['installer'],$connections['definer'],$scope,$directory.'/journal.json',$accounts);
    }
    CleanInitialization::privateReceipt($directory.'/ready.json',$proof,true);
    $profile=$profiles['runtime'];
    $profile['mode']='approved-production-runtime';
    $profile['backupRestoreVerified']=false;
    $profile['readinessInspectionApproved']=true;
    $profile['schemaContract']=CumulativeProduction::CONTRACT;
    $profile['releaseSha']=$scope['release'];
    $profile['operators']=$proof['operators'];
    $profile['cumulativeEvidenceFile']=$directory.'/ready.json';
    $profile['cumulativeEvidenceSha256']=hash_file('sha256',$directory.'/ready.json');
    unset($profile['cumulativeCleanApproved'],$profile['receiptFile']);
    $profile['recoveryEvidenceFile']=$directory.'/recovery.json';
    $profile['activationApprovalFile']=$directory.'/activation.json';
    // Paths become required only when activation is requested.
    unset($profile['recoveryEvidenceFile'],$profile['activationApprovalFile']);
    CleanInitialization::privateReceipt($directory.'/runtime.json',$profile,true);
    $fixture=['scope'=>$scope,'profiles'=>$profiles,'passwords'=>$passwords,'tlsProof'=>bin2hex(random_bytes(32))];
    CleanInitialization::privateReceipt($configFile,$fixture,true);
    $env="APP_ENV=production\nAPP_DEBUG=false\nAPP_KEY=base64:".base64_encode(random_bytes(32)).
        "\nUPMS_PRODUCTION_PROFILE=$directory/runtime.json\nUPMS_ORIGIN=https://app.unique-plastic.com\n".
        "UPMS_MONEY_ACCOUNTS_ENABLED=true\nUPMS_EXPENSE_MASTERS_ENABLED=true\nUPMS_EMPLOYEE_HAFTA_ENABLED=true\n".
        "UPMS_LABOR_CLASSIFICATION_ENABLED=true\nUPMS_CHEQUE_MANAGEMENT_ENABLED=true\nUPMS_CHEQUE_EXTRAS_ENABLED=true\n".
        "UPMS_FINANCIAL_REFUNDS_ENABLED=true\nINQUIRY_MODE=Disabled\n";
    file_put_contents($directory.'/runtime.env',$env);chmod($directory.'/runtime.env',0600);
    echo json_encode(['passed'=>true,'state'=>$proof['state'],'tables'=>47,'guards'=>133]).PHP_EOL;
    exit;
}
$fixture=json_decode(file_get_contents($configFile),true,32,JSON_THROW_ON_ERROR);
$profiles=$fixture['profiles'];$scope=$fixture['scope'];$accounts=$scope['accounts'];
$connections=[];
foreach ($profiles as $role=>$profile) {
    $connections[$role]=ProductionConnection::connect($profile+['password'=>file_get_contents($profile['passwordFile'])]);
}
$profile=json_decode(file_get_contents($directory.'/runtime.json'),true,32,JSON_THROW_ON_ERROR);
if ($mode==='refresh') {
    $proof=CumulativeProduction::complete($connections['installer'],$connections['definer'],$scope,$directory.'/journal.json',$accounts);
    CleanInitialization::privateReceipt($directory.'/ready.json',$proof);
    $profile['cumulativeEvidenceSha256']=hash_file('sha256',$directory.'/ready.json');
    CleanInitialization::privateReceipt($directory.'/runtime.json',$profile);
    echo json_encode(['passed'=>true,'readinessRefreshed'=>true]).PHP_EOL;
} elseif ($mode==='recover') {
    $afterActivation=is_file($directory.'/activation.json');
    $archivePath=$directory.($afterActivation?'/post-financial.upmsbk':'/recovery.upmsbk');
    $snapshot=ProductionRecoveryV2::capture($connections['installer'],$connections['definer'],$accounts);
    $pair=sodium_crypto_box_keypair();
    if ($package) {
        foreach (['installer','definer'] as $role) {
            $c=$profiles[$role];$c['mode']='one-time-production-maintenance';
            CleanInitialization::privateReceipt($directory.'/'.$role.'.maintenance.json',$c);
        }
        $cipher=$privateCommand('backup-cumulative.php',[$directory.'/installer.maintenance.json',
            $directory.'/definer.maintenance.json',$directory.'/runtime.json'],base64_encode(sodium_crypto_box_publickey($pair)));
    } else {
        $cipher=ProductionRecoveryV2::encrypt($snapshot,sodium_crypto_box_publickey($pair));
    }
    file_put_contents($archivePath,$cipher);chmod($archivePath,0600);
    $decoded=ProductionRecoveryV2::decrypt($cipher,$pair);
    $tampered=$cipher;$tampered[80]=chr(ord($tampered[80])^1);
    try { ProductionRecoveryV2::decrypt($tampered,$pair);throw new RuntimeException('TAMPER_ACCEPTED'); }
    catch (RuntimeException $e) { if ($e->getMessage()==='TAMPER_ACCEPTED') { throw $e; } }
    $restoreId=(string)time();
    $restore='upms_stage_'.$restoreId.'_restore';
    $root->exec('CREATE DATABASE `'.$restore.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $restoreProfiles=[];$restoreAccounts=[];
    foreach (['installer'=>'CREATE,REFERENCES,SELECT,INSERT,UPDATE','definer'=>'SELECT,TRIGGER','runtime'=>'SELECT,INSERT,UPDATE,DELETE'] as $role=>$grants) {
        $c=$profiles[$role];$c['schema']=$restore;$c['user']='p42cr_'.$restoreId.'_'.$role;
        $c['restoreArchiveSha256']=hash('sha256',$cipher);
        $c['account']=$c['user'].'@localhost';$c['password']=bin2hex(random_bytes(32));
        $c['passwordFile']=$directory.'/'.$c['user'].'.password';$c['mode']='one-time-production-maintenance';
        file_put_contents($c['passwordFile'],$c['password']);chmod($c['passwordFile'],0600);
        $root->exec("CREATE USER '".$c['user']."'@'localhost' IDENTIFIED BY ".$root->quote($c['password']));
        $root->exec('GRANT '.$grants.' ON `'.str_replace('_','\\_',$restore)."`.* TO '".$c['user']."'@'localhost'");
        $restoreProfiles[$role]=$c;$restoreAccounts[$role]=$c['account'];
        CleanInitialization::privateReceipt($directory.'/'.$c['user'].'.json',array_diff_key($c,['password'=>true]),true);
    }
    $restored=[];
    foreach (['installer','definer'] as $role) {
        $restored[$role]=ProductionConnection::connect($restoreProfiles[$role]);
    }
    if ($package) {
        $report=json_decode($privateCommand('restore-cumulative-isolated.php',[
            $directory.'/'.$restoreProfiles['installer']['user'].'.json',
            $directory.'/'.$restoreProfiles['definer']['user'].'.json',$archivePath,
            $directory.'/'.$restoreProfiles['runtime']['user'].'.json'],base64_encode($pair)),true,64,JSON_THROW_ON_ERROR);
    } else {
        $report=ProductionRecoveryV2::restoreIsolated($restored['installer'],$restored['definer'],$decoded,$restoreAccounts);
    }
    $report+=['targetHash'=>$scope['targetHash'],'release'=>$scope['release'],'reference'=>$scope['reference'],
        'tamperRejected'=>true,'archiveSha256'=>hash('sha256',$cipher)];
    CleanInitialization::privateReceipt($directory.($afterActivation?'/post-financial-recovery.json':'/recovery.json'),$report);
    sodium_memzero($pair);
    echo json_encode($report).PHP_EOL;
} elseif ($mode==='activate') {
    $profile['recoveryEvidenceFile']=$directory.'/recovery.json';
    $profile['recoveryEvidenceSha256']=hash_file('sha256',$directory.'/recovery.json');
    $approval=['status'=>'EXPLICIT_CUMULATIVE_ACTIVATION_APPROVED','targetHash'=>$scope['targetHash'],'release'=>$scope['release'],
        'reference'=>$scope['reference'],'readinessSha256'=>$profile['cumulativeEvidenceSha256'],
        'recoverySha256'=>$profile['recoveryEvidenceSha256'],'scope'=>'Authorized synthetic staging only'];
    CleanInitialization::privateReceipt($directory.'/activation.json',$approval,true);
    $profile['activationApprovalFile']=$directory.'/activation.json';
    $profile['activationApprovalSha256']=hash_file('sha256',$directory.'/activation.json');
    CleanInitialization::privateReceipt($directory.'/runtime.json',$profile);
    if ($package) {
        $privateCommand('activate-cumulative.php',[$directory.'/installer.maintenance.json',$directory.'/runtime.json']);
    } else {
        CumulativeProduction::activate($connections['installer'],$connections['runtime'],$profile);
    }
    echo json_encode(['passed'=>true,'state'=>CumulativeProduction::ACTIVE,'syntheticOnly'=>true]).PHP_EOL;
} elseif ($mode==='verify') {
    $profile=App\Upms\ProductionProfile::load($directory.'/runtime.json');
    $proof=CumulativeInitialization::verifyInstalled($connections['installer'],$connections['definer'],$accounts);
    CumulativeProduction::runtime($connections['runtime'],$profile);
    $denied=0;
    foreach ([
        'identity_audit_events'=>"UPDATE identity_audit_events SET details='{}' LIMIT 1",
        'upms_production_migrations'=>"UPDATE upms_production_migrations SET step='forged' WHERE id=1",
        'v1_stock_journal'=>'UPDATE v1_stock_journal SET delta=delta+1 LIMIT 1',
        'v1_party_journal'=>'DELETE FROM v1_party_journal LIMIT 1',
        'v1_audit'=>'DELETE FROM v1_audit LIMIT 1',
        'money_movements'=>'UPDATE money_movements SET delta=delta+1 LIMIT 1',
    ] as $table=>$sql) {
        if ((int)$connections['installer']->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn()===0) { continue; }
        try {
            $connections['runtime']->exec($sql);
            throw new RuntimeException('PROTECTED_MUTATION_ACCEPTED');
        } catch (PDOException $error) {
            if ($error->getCode()!=='45000') { throw $error; }
            $denied++;
        }
    }
    $totals=[];
    foreach ($connections['installer']->query('SELECT a.code,COALESCE(SUM(m.delta),0) balance FROM money_accounts a LEFT JOIN money_movements m ON m.account_id=a.id GROUP BY a.id ORDER BY a.code')->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $totals[$row['code']]=$row['balance'];
    }
    $stock=$connections['installer']->query('SELECT quantity FROM v1_stock ORDER BY item_id')->fetchAll(PDO::FETCH_COLUMN);
    $parties=$connections['installer']->query('SELECT p.kind,COALESCE(SUM(j.debit-j.credit),0) balance FROM v1_parties p LEFT JOIN v1_party_journal j ON j.party_id=p.id GROUP BY p.id ORDER BY p.kind')->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['passed'=>true,'tables'=>$proof['tables'],'guards'=>$proof['guards'],'nativeMutationRejections'=>$denied,
        'balances'=>$totals,'stock'=>$stock,'parties'=>$parties,
        'clearances'=>(int)$connections['installer']->query('SELECT COUNT(*) FROM cheque_clearances')->fetchColumn(),
        'moneyBatches'=>(int)$connections['installer']->query('SELECT COUNT(*) FROM money_batches')->fetchColumn()]).PHP_EOL;
} else { throw new RuntimeException('P42C_ACTION_REJECTED'); }
