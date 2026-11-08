<?php
declare(strict_types=1);

// Resource-only approval recorded by the owner. Never initializes application tables.
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') { exit(1); }
$mode = getenv('UPMS_P43_RESOURCE_CREATION');
if (!in_array($mode, ['owner-approved-2026-11-08','verify'], true)) { fwrite(STDERR,"EXPLICIT_RESOURCE_MODE_REQUIRED\n"); exit(1); }
$verifyOnly = $mode === 'verify';
ini_set('zend.exception_ignore_args', '1');
ini_set('display_errors', '0');
umask(0077);
$stage = 'account';
$root = '/home/tsn6az96j3v7/upms-private/p43';
$secretFile = $root.'/resource-credentials.json';
$stateFile = $root.'/resource-state.json';
$targets = [
    'upms_v2' => [
        'upms_init_v2' => ['CREATE','REFERENCES','SELECT','INSERT','UPDATE'],
        'upms_guard_v2' => ['SELECT','TRIGGER'],
        'upms_runtime_v2' => ['SELECT','INSERT','UPDATE','DELETE'],
        'upms_backup_v2' => ['SELECT'],
    ],
    'upms_stage_43' => [
        'upms_i43' => ['CREATE','REFERENCES','SELECT','INSERT','UPDATE'],
        'upms_g43' => ['SELECT','TRIGGER'],
        'upms_r43' => ['SELECT','INSERT','UPDATE','DELETE'],
        'upms_b43' => ['SELECT'],
    ],
];
function api43(string $function, array $args = []): array {
    $p = proc_open(['/usr/bin/uapi','--output=json','--input=json','Mysql',$function],
        [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes);
    if (!is_resource($p)) { throw new RuntimeException('UAPI_UNAVAILABLE'); }
    fwrite($pipes[0], json_encode((object)$args, JSON_THROW_ON_ERROR)); fclose($pipes[0]);
    $out=stream_get_contents($pipes[1]); stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]); $exit=proc_close($p);
    $result=json_decode($out,true,64,JSON_THROW_ON_ERROR)['result']??[];
    if ($exit!==0 || ($result['status']??0)!==1) { throw new RuntimeException('UAPI_OPERATION_FAILED'); }
    return $result['data']??[];
}
function save43(string $path, array $data): void {
    $tmp=$path.'.new';
    if (is_link($path) || is_link($tmp)) { throw new RuntimeException('PRIVATE_PATH_REJECTED'); }
    $bytes=json_encode($data,JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT)."\n";
    if (file_put_contents($tmp,$bytes,LOCK_EX)!==strlen($bytes) || !chmod($tmp,0600) || !rename($tmp,$path)) {
        throw new RuntimeException('PRIVATE_EVIDENCE_WRITE_FAILED');
    }
}
function inventory43(): array {
    $dbs=api43('list_databases'); $users=api43('list_users');
    $result=['databases'=>[], 'users'=>[]];
    foreach($dbs as $db){ $names=$db['users'];sort($names);$result['databases'][$db['database']]=$names; }
    foreach($users as $user){$names=$user['databases'];sort($names);$result['users'][$user['user']]=$names;}
    ksort($result['databases']);ksort($result['users']);return $result;
}
function verify43(string $db,string $user,string $password,array $expected): array {
    $pdo=new PDO('mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname='.$db.';charset=utf8mb4', $user,$password,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false]);
    $id=$pdo->query('SELECT DATABASE() db, CURRENT_USER() account, @@hostname host')->fetch(PDO::FETCH_ASSOC);
    if($id!==['db'=>$db,'account'=>$user.'@localhost','host'=>'sg2plzcpnl508885.prod.sin2.secureserver.net']){
        throw new RuntimeException('AUTHENTICATED_IDENTITY_REJECTED');
    }
    $actual=[];
    foreach($pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN) as $grant){
        if(str_contains($grant,'WITH GRANT OPTION') || !preg_match('/^GRANT (.+) ON (.+) TO /D',$grant,$m)){
            throw new RuntimeException('UNAUTHORIZED_GRANT');
        }
        $scope=str_replace(['\\_','\\%'],['_','%'],$m[2]);
        if($scope==='*.*' && $m[1]==='USAGE'){continue;}
        if($scope!=='`'.$db.'`.*'){throw new RuntimeException('UNAUTHORIZED_SCOPE');}
        array_push($actual,...explode(', ',$m[1]));
    }
    sort($actual);sort($expected);
    if($actual!==$expected){throw new RuntimeException('EXACT_GRANTS_REJECTED');}
    $count=(int)$pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE()')->fetchColumn();
    if($count!==0 || $pdo->query('SHOW FULL TABLES')->fetchAll()) {throw new RuntimeException('TARGET_NOT_EMPTY');}
    return ['schema'=>$db,'account'=>$id['account'],'privileges'=>$actual,'tables'=>0,'passed'=>true];
}
try {
    if((posix_getpwuid(posix_geteuid())['name']??'')!=='tsn6az96j3v7'
        || gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net') {throw new RuntimeException('HOST_ACCOUNT_REJECTED');}
    require '/home/tsn6az96j3v7/upms-php83-staging/php84-tools/support.php';
    $before=inventory43();
    $limits=api('Variables','get_user_information',[]);
    $rules=api43('get_restrictions');
    if((int)($limits['maximum_databases']??0)!==10 || ($rules['prefix']??null)!==null
        || (int)($rules['max_database_name_length']??0)<13 || (int)($rules['max_username_length']??0)<15) {
        throw new RuntimeException('PROVIDER_LIMITS_CHANGED');
    }
    foreach(['/home/tsn6az96j3v7/upms-private',$root] as $dir){
        if(is_link($dir)){throw new RuntimeException('PRIVATE_DIRECTORY_REJECTED');}
        if(!is_dir($dir) && ($verifyOnly || !mkdir($dir,0700))){throw new RuntimeException('PRIVATE_DIRECTORY_FAILED');}
        if((fileperms($dir)&0077)!==0 || fileowner($dir)!==posix_geteuid()){throw new RuntimeException('PRIVATE_PERMISSIONS_REJECTED');}
    }
    $lock=fopen($root.'/resource-provision.lock','c');
    if(!$lock || !flock($lock,LOCK_EX|LOCK_NB)){throw new RuntimeException('PROVISIONING_ALREADY_RUNNING');}
    if(is_link($stateFile)||is_link($secretFile)){throw new RuntimeException('PRIVATE_PATH_REJECTED');}
    if(file_exists($stateFile)){
        foreach([$stateFile,$secretFile] as $f){if(!is_file($f)||(fileperms($f)&0077)!==0||fileowner($f)!==posix_geteuid()){throw new RuntimeException('PRIVATE_EVIDENCE_REJECTED');}}
        $state=json_decode(file_get_contents($stateFile),true,32,JSON_THROW_ON_ERROR);
        $secrets=json_decode(file_get_contents($secretFile),true,32,JSON_THROW_ON_ERROR);
        if(($state['targets']??null)!==$targets || ($state['approval']??'')!=='P43_RESOURCE_ONLY_OWNER_APPROVED'){
            throw new RuntimeException('EXISTING_RESOURCE_STATE_REJECTED');
        }
    }else{
        if($verifyOnly){throw new RuntimeException('RESOURCE_RECEIPT_REQUIRED');}
        if(file_exists($secretFile)){throw new RuntimeException('UNCLAIMED_PRIVATE_CREDENTIALS');}
        if(count($before['databases'])+count($targets)>10){throw new RuntimeException('DATABASE_QUOTA_REJECTED');}
        foreach($targets as $db=>$users){
            if(isset($before['databases'][$db])){throw new RuntimeException('TARGET_DATABASE_EXISTS');}
            foreach($users as $user=>$grants){if(isset($before['users'][$user])){throw new RuntimeException('TARGET_USER_EXISTS');}}
        }
        $secrets=[];
        foreach($targets as $db=>$users){foreach($users as $user=>$grants){$secrets[$user]=bin2hex(random_bytes(32));}}
        $state=['approval'=>'P43_RESOURCE_ONLY_OWNER_APPROVED','createdUtc'=>gmdate('c'),'targets'=>$targets,
            'baseline'=>$before,'operations'=>[]];
        save43($secretFile,$secrets);save43($stateFile,$state);
    }
    $perform=function(string $key,string $function,array $args)use(&$state,$stateFile,&$stage,$verifyOnly):void{
        $stage=$key;
        $status=$state['operations'][$key]??null;
        if($status==='done'){return;}
        if($verifyOnly){throw new RuntimeException('RESOURCE_OPERATION_NOT_COMPLETED');}
        if($status!==null){throw new RuntimeException('INTERRUPTED_OPERATION_REQUIRES_REVIEW');}
        $state['operations'][$key]='in_progress';save43($stateFile,$state);
        api43($function,$args);
        $state['operations'][$key]='done';save43($stateFile,$state);
    };
    foreach($targets as $db=>$users){
        $perform('database:'.$db,'create_database',['name'=>$db]);
        foreach($users as $user=>$grants){
            $perform('user:'.$user,'create_user',['name'=>$user,'password'=>$secrets[$user]]);
            $perform('grant:'.$user,'set_privileges_on_database',['user'=>$user,'database'=>$db,'privileges'=>implode(',',$grants)]);
        }
    }
    $stage='verification';$verified=[];
    foreach($targets as $db=>$users){foreach($users as $user=>$grants){$verified[]=verify43($db,$user,$secrets[$user],$grants);}}
    $after=inventory43();
    foreach($state['baseline'] as $kind=>$objects){foreach($objects as $name=>$value){
        if(($after[$kind][$name]??null)!==$value){throw new RuntimeException('EXISTING_RESOURCE_INVENTORY_CHANGED');}
    }}
    $report=['verifiedUtc'=>gmdate('c'),'passed'=>true,'resourceOnly'=>true,'verificationOnly'=>$verifyOnly,'accounts'=>$verified,
        'databaseCount'=>count($after['databases']),'existingInventoryUnchanged'=>true,'applicationTablesCreated'=>0,
        'administratorsCreated'=>0,'applicationReleaseChanged'=>false,'initializationPerformed'=>false,
        'backupReaderCompatible'=>false,'financialPostingActivated'=>false];
    save43($root.'/resource-verification.json',$report);
    echo json_encode($report,JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $error){
    $code=preg_match('/^[A-Z][A-Z0-9_]{5,90}$/D',$error->getMessage())?$error->getMessage():'RESOURCE_PROVISIONING_FAILED';
    echo json_encode(['passed'=>false,'stage'=>$stage,'error'=>$code,'automaticRollback'=>false,
        'evidencePreserved'=>true],JSON_THROW_ON_ERROR).PHP_EOL;exit(1);
}
