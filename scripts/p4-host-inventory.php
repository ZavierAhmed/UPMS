<?php
declare(strict_types=1);
// Read-only, stdin-executed GoDaddy inventory. Never publishes an endpoint or writes a receipt remotely.
if (PHP_SAPI !== 'cli') { exit(1); }
$root = '/home/tsn6az96j3v7/upms-php83-staging';
$phase = 'autoload';
$result = ['format'=>'UPMS_P4_HOST_INVENTORY_V1','verifiedUtc'=>gmdate('c'),'databaseWrites'=>0,'hostFilesWritten'=>0,'credentialsPrinted'=>false];
try {
    require $root.'/php84-release/private/backend/vendor/autoload.php';
    $phase = 'runtime-profile';
    $config = App\Upms\ProductionProfile::load($root.'/runtime/runtime85.json');
    $pdo = App\Upms\ProductionConnection::connect($config);
    $result['identity'] = $pdo->query('SELECT VERSION() version,DATABASE() schema_name,CURRENT_USER() authenticated_account,USER() connection_account,@@hostname server_hostname,@@socket socket_path,@@port port,@@character_set_database charset_name')->fetch(PDO::FETCH_ASSOC);
    $phase = 'privileges';
    $result['privilegeVerification'] = App\Upms\RuntimePrivileges::verify($pdo,$config);
    $result['runtimeGrants'] = array_map(static fn($g)=>preg_replace('/ IDENTIFIED .*/i',' [authentication clause redacted]',$g),$pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN));
    $phase = 'guard-profile';
    $guardConfig = App\Upms\ProductionProfile::load($root.'/runtime/guard85-profile.json','read-only-transport-verification');
    $guard = App\Upms\ProductionConnection::connect($guardConfig);
    $result['guardVerification'] = App\Upms\CrudGuards::verify($guard);
    $result['guards'] = $guard->query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,DEFINER,SQL_MODE,CHARACTER_SET_CLIENT,COLLATION_CONNECTION,DATABASE_COLLATION FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')->fetchAll(PDO::FETCH_ASSOC);
    $phase = 'consistent-read';
    $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    $names=$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);sort($names);
    foreach($names as $table){
        $phase='snapshot_'.$table;
        if(!preg_match('/^[a-zA-Z0-9_]+$/D',$table)){throw new RuntimeException('TABLE_NAME_REJECTED');}
        $ddl=$pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        $hashes=[];
        foreach($pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC) as $row){ksort($row);$hashes[]=hash('sha256',serialize($row));}
        sort($hashes);
        $result['tables'][$table]=['rows'=>count($hashes),'rowSetSha256'=>hash('sha256',implode("\n",$hashes)),'ddlSha256'=>hash('sha256',$ddl),'ddl'=>$ddl];
    }
    $phase='administrator-metadata';
    $result['administrators']=$pdo->query("SELECT id,login_key,enabled FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    $result['migrationReceipt']=$pdo->query('SELECT id,state FROM upms_production_migrations ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    $result['control']=$pdo->query('SELECT id,version,operator_id,state,next_dc,next_item_code FROM v1_control ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    $phase='document-state-metadata';
    $result['documentStates']=$pdo->query('SELECT kind,status,COUNT(*) count FROM v1_documents GROUP BY kind,status ORDER BY kind,status')->fetchAll(PDO::FETCH_ASSOC);
    $pdo->rollBack();
    $result['php']=['version'=>PHP_VERSION,'sapi'=>PHP_SAPI,'extensions'=>get_loaded_extensions(),'disabledFunctions'=>ini_get('disable_functions'),'memoryLimit'=>ini_get('memory_limit'),'uploadMax'=>ini_get('upload_max_filesize'),'postMax'=>ini_get('post_max_size'),'maxExecutionTime'=>ini_get('max_execution_time')];
    $result['paths']=['publicRoot'=>$config['publicRoot'],'managementRoot'=>$config['managementRoot'],'privateRoot'=>$config['privateRoot'],'backend'=>realpath($root.'/php84-release/private/backend')];
    $envPath=$root.'/php84-release/private/backend/.env';
    $env=is_file($envPath)?file_get_contents($envPath):'';
    foreach(['UPMS_ENABLED','UPMS_PRODUCTION_RUNTIME_ENABLED','INQUIRY_MODE','APP_ENV','APP_DEBUG'] as $key){if(preg_match('/^'.preg_quote($key,'/').'=(.*)$/m',$env,$match)){$result['nonSecretFlags'][$key]=trim($match[1]);}}
    foreach(['composer.json','composer.lock','app/Upms/Schema.php','app/Upms/CrudGuards.php','app/Upms/RuntimePrivileges.php'] as $path){$f=$root.'/php84-release/private/backend/'.$path;if(is_file($f)){$result['releaseFiles'][$path]=hash_file('sha256',$f);}}
    $result['tableCount']=count($names);$result['guardCount']=count($result['guards']);$result['completed']=true;
    echo json_encode($result,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE).PHP_EOL;
}catch(Throwable $error){
    if(isset($pdo)&&$pdo->inTransaction()){$pdo->rollBack();}
    echo json_encode([...$result,'completed'=>false,'phase'=>$phase,'code'=>preg_match('/^[A-Z_]+$/D',$error->getMessage())?$error->getMessage():'READ_ONLY_INVENTORY_FAILED','exceptionClass'=>get_class($error),'sqlState'=>$error instanceof PDOException?($error->errorInfo[0]??null):null],JSON_PRETTY_PRINT|JSON_INVALID_UTF8_SUBSTITUTE).PHP_EOL;exit(1);
}
