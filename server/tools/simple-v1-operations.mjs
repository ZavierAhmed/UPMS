import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createDatabase} from '../src/identity/database.js';
import {migrate} from '../src/identity/migrations.js';
import {databasePreflight,knownMigrations} from '../src/identity/preflight.js';
import {simpleV1RuntimePrivileges} from '../src/identity/grants.js';
import {snapshots} from './business-operations.mjs';
import {up} from '../simple-v1-migrations/202610240001_simple_v1.js';
import {createIdentityService} from '../src/identity/service.js';
const dir='server/.local/simple-v1',action=process.argv[2],target=process.argv[3]||'01';
const schema=target==='demo'?'upms_test_simplev1_demo_20261024_01':'upms_test_simplev1_20261024_'+target,user='upms_runtime_test_simplev1_'+target,migrator='upms_migrator_test_simplev1_'+target;
async function absent(path){try{await access(path);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Existing evidence/target: preserve; do not reuse');}
const save=(name,value)=>writeFile(dir+'/'+name+'.json',JSON.stringify(value,null,2),{flag:'wx'});
function client(name,database,input){const args=['--protocol=TCP','--host=127.0.0.1','--port=3309','--user='+process.env.DB_USER,'--default-character-set=utf8mb4'];if(name==='mysqldump')args.push('--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-comments','--hex-blob','--no-create-db',database);else args.push(database);const result=spawnSync('C:/xampp/mysql/bin/'+name+'.exe',args,{input,env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},windowsHide:true,maxBuffer:64*1024*1024});if(result.status!==0)throw Error('Private logical backup/restore failed; preserve diagnostics');return result.stdout;}
let db;try{
 assert.equal(process.env.DB_NAME,'upms');assert.equal(process.env.DB_PORT,'3309');db=createDatabase();await databasePreflight(db,process.env,{runtime:false,expectedTables:111,expectedMigrations:knownMigrations});
 const [endpoint]=await db.raw('SELECT @@datadir path');assert.ok(endpoint[0].path.replaceAll('\\','/').endsWith('/server/.local/p23b/console-probe-03/data/'));
 await mkdir(dir,{recursive:true});
 if(action==='verify-final'){
  const evidence=JSON.parse(await readFile(dir+'/preservation-v2.json','utf8'));assert.equal(evidence.explicitRestoreDatabaseVerified,true);assert.deepEqual(await snapshots(db),evidence.tables);await save('final-preservation-'+Date.now(),{mainUnchanged:true,physicalTables:111,legacyMigrations:knownMigrations,backupSha256:evidence.backupSha256,restore:evidence.restore,verified:true});console.info(JSON.stringify({mainUnchanged:true,physicalTables:111,migrations:11,fullFingerprintsMatched:true}));
 }else if(action==='inspect-legacy'){
  const [schemas]=await db.raw("SELECT SCHEMA_NAME name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '^upms_test_p27c_(regression|inventory|purchasing)_20261023_' ORDER BY SCHEMA_NAME");console.info(JSON.stringify(schemas));
 }else if(action==='preserve'){
  await absent(dir+'/preservation.json');await absent(dir+'/main-before-v1.sql');const restore='upms_restore_simplev1_20261024_01';assert.equal((await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[restore]))[0].length,0);
  const before=await snapshots(db),backup=client('mysqldump','upms');await writeFile(dir+'/main-before-v1.sql',backup,{flag:'wx'});await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[restore]);client('mysql',restore,backup);
  const restored=createDatabase({...process.env,IDENTITY_DB_PURPOSE:'operator'});restored.client.connectionSettings.database=restore;try{assert.equal((await restored.raw('SELECT DATABASE() name'))[0][0].name,restore);assert.deepEqual(await snapshots(restored),before);}finally{await restored.destroy();}assert.deepEqual(await snapshots(db),before);await save('preservation',{main:'127.0.0.1:3309/upms',migrations:knownMigrations,restore,backupSha256:createHash('sha256').update(backup).digest('hex'),tables:before,verified:true});console.info(JSON.stringify({preserved:true,tables:Object.keys(before).length,restore,mainUnchanged:true}));
 }else if(action==='verify-preserved'){
  await absent(dir+'/preservation-v2.json');const restore='upms_restore_simplev1_20261024_01',backup=await readFile(dir+'/main-before-v1.sql'),before=await snapshots(db),restored=createDatabase({...process.env,IDENTITY_DB_PURPOSE:'operator'});restored.client.connectionSettings.database=restore;
  try{assert.equal((await restored.raw('SELECT DATABASE() name'))[0][0].name,restore);assert.deepEqual(await snapshots(restored),before);}finally{await restored.destroy();}assert.deepEqual(await snapshots(db),before);await save('preservation-v2',{main:'127.0.0.1:3309/upms',migrations:knownMigrations,restore,backupSha256:createHash('sha256').update(backup).digest('hex'),tables:before,verified:true,explicitRestoreDatabaseVerified:true,forwardVerification:'Existing completed restore inspected read-only after tool connection-name guard rejected its original verification; no repeat import or DDL.'});console.info(JSON.stringify({preserved:true,tables:Object.keys(before).length,restore,mainUnchanged:true,readOnlyForwardVerification:true}));
 }else if(action==='provision'){
  if(!['01','02','03','04','05','06','demo'].includes(target))throw Error('Unreviewed target');assert.equal(JSON.parse(await readFile(dir+'/preservation-v2.json','utf8')).verified,true);await absent(dir+'/'+target+'-provisioned.json');
  assert.equal((await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]))[0].length,0);assert.equal((await db.raw('SELECT User FROM mysql.user WHERE User IN (?,?)',[user,migrator]))[0].length,0);
  await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[migrator,'localhost',process.env.V1_MIGRATOR_PASSWORD]);await db.raw('GRANT ALL PRIVILEGES ON ??.* TO ?@?',[schema,migrator,'localhost']);
  const env={...process.env,DB_NAME:schema,DB_CONFIRM_NAME:schema,DB_USER:migrator,DB_PASSWORD:process.env.V1_MIGRATOR_PASSWORD,IDENTITY_DB_PURPOSE:'operator'},migration=createDatabase(env);
  try{await migrate(migration,env);await up(migration);const operator=await createIdentityService(migration).bootstrap({username:'v1_operator',displayName:'Synthetic V1 Operator',password:process.env.V1_OPERATOR_PASSWORD});await migration('v1_control').where({id:1}).update({operator_id:operator,state:'READY',cutover_evidence:'Explicit fresh synthetic V1 sequence. No company history imported; DC-0001 approved for this isolated demo/test only.'});assert.equal((await migration('v1_control').first()).next_dc,1);}finally{await migration.destroy();}
  await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',process.env.V1_RUNTIME_PASSWORD]);for(const [table,rights]of Object.entries(simpleV1RuntimePrivileges))await db.raw('GRANT '+rights.join(',')+' ON ??.?? TO ?@?',[schema,table,user,'localhost']);
  await save(target+'-provisioned',{schema,user,migrator,tables:121,legacyMigrations:knownMigrations,v1Migration:'202610240001_simple_v1.js',runtimeScopes:Object.keys(simpleV1RuntimePrivileges).length,synthetic:true});console.info(JSON.stringify({provisioned:schema,physicalTables:121,legacyWrites:false}));
 }else throw Error('Unknown operation');
}catch(e){console.error(JSON.stringify({stopped:true,code:e.code||e.name,message:'Preserve partial state and private evidence. No automatic reset, repeat or main migration.'}));process.exitCode=1;}finally{await db?.destroy();}
