import mysql from 'mysql2/promise';
import knex from 'knex';
import {readFile,writeFile,access} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {initializeProduction,openingFingerprint} from '../src/production/setup.js';
import {createDatabase} from '../src/identity/database.js';
import {productionRuntimePrivileges} from '../src/identity/grants.js';
import {snapshots} from './business-operations.mjs';
const dir='server/.local/production-readiness',action=process.argv[2],schema='upms_test_production_20261024_01',restore='upms_test_production_restore_20261024_01';
export function stageEnvironment(meta,purpose='runtime'){
 return {NODE_ENV:'production',DB_HOST:'127.0.0.1',DB_PORT:'3311',DB_NAME:schema,DB_CONFIRM_NAME:schema,DB_USER:purpose==='runtime'?'upms_runtime_test_production_01':'upms_migrator_production_stage',DB_PASSWORD:process.env[purpose==='runtime'?'STAGE_RUNTIME_PASSWORD':'STAGE_MIGRATOR_PASSWORD'],IDENTITY_DB_PURPOSE:purpose,UPMS_SIMPLE_V1:'production-v1',UPMS_PRODUCTION_PURPOSE:'synthetic-staging',UPMS_EXPECTED_SERVER_ID:'331124',UPMS_PRODUCTION_INSTANCE:meta.instance,MANAGEMENT_ORIGIN:'https://localhost:7448',MANAGEMENT_ENABLED:'true',SESSION_SECRET:process.env.STAGE_SESSION_PASSWORD,UPMS_PRODUCTION_POSTING:'synthetic-reviewed'};
}
const settings={host:'127.0.0.1',port:3311,user:'root',password:process.env.STAGE_ROOT_PASSWORD,multipleStatements:false,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true};
async function admin(){for(let n=0;n<30;n++){try{return await mysql.createConnection(settings);}catch(e){if(n===29)throw e;await new Promise(r=>setTimeout(r,250));}}}
let root,db;try{
 root=await admin();const [[state]]=await root.query('SELECT @@server_id s,@@innodb_force_recovery r,VERSION() v');assert.equal(String(state.s),'331124');assert.equal(Number(state.r),0);assert.ok(!state.v.includes('MariaDB'));
 if(action==='provision'){
  try{await access(dir+'/stage.json');throw Error('Preserve existing staging receipt');}catch(e){if(e.code!=='ENOENT')throw e;}
  const [[count]]=await root.query('SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN (?,?)',[schema,restore]);assert.equal(Number(count.n),0);
  const [users]=await root.query('SELECT User FROM mysql.user WHERE User IN (?,?)',['upms_migrator_production_stage','upms_runtime_test_production_01']);assert.equal(users.length,0);
  await root.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);
  await root.query('CREATE USER ?@? IDENTIFIED BY ?',['upms_migrator_production_stage','localhost',process.env.STAGE_MIGRATOR_PASSWORD]);await root.query('GRANT ALL PRIVILEGES ON ??.* TO ?@?',[schema,'upms_migrator_production_stage','localhost']);
  const meta={schema,instance:randomUUID(),purpose:'synthetic-staging',port:3311,serverId:331124};db=createDatabase(stageEnvironment(meta,'operator'));
  const receipt=await initializeProduction(db,stageEnvironment(meta,'operator'),{cutoff:new Date().toISOString().slice(0,10),nextChallan:1,reviewReference:'Synthetic staging opening review only',username:'stage_operator',displayName:'Private staging operator',password:process.env.STAGE_OPERATOR_PASSWORD});await db.destroy();db=null;
  await root.query('CREATE USER ?@? IDENTIFIED BY ?',['upms_runtime_test_production_01','localhost',process.env.STAGE_RUNTIME_PASSWORD]);for(const [table,rights] of Object.entries(productionRuntimePrivileges))await root.query('GRANT '+rights.join(',')+' ON ??.?? TO ?@?',[schema,table,'upms_runtime_test_production_01','localhost']);
  await writeFile(dir+'/stage.json',JSON.stringify({...meta,...receipt,version:state.v},null,2),{flag:'wx'});console.log(JSON.stringify({schema,phase:'OPENING',realData:false,version:state.v}));
 }else if(action==='grant-metadata'){
  for(const table of ['upms_production_migrations','upms_production_migrations_lock'])await root.query('GRANT SELECT ON ??.?? TO ?@?',[schema,table,'upms_runtime_test_production_01','localhost']);
  console.log(JSON.stringify({newStagingSchemaOnly:true,metadataReadGrants:2}));
 }else if(action==='backup'){
  const meta=JSON.parse(await readFile(dir+'/stage.json','utf8'));db=createDatabase(stageEnvironment(meta,'operator'));
  const fingerprint=await openingFingerprint(db),before=await snapshots(db);const bin='tmp/production-readiness/mysql-runtime/mysql-8.4.13-winx64/bin/';
  const args=['--protocol=TCP','--host=127.0.0.1','--port=3311','--user=root','--single-transaction','--skip-add-drop-table','--no-tablespaces','--set-gtid-purged=OFF','--skip-comments','--hex-blob',schema];
  const dump=spawnSync(bin+'mysqldump.exe',args,{env:{...process.env,MYSQL_PWD:process.env.STAGE_ROOT_PASSWORD},windowsHide:true,maxBuffer:64*1024*1024});assert.equal(dump.status,0,'Private backup failed');assert.equal(await openingFingerprint(db),fingerprint);
  await writeFile(dir+'/opening-backup.sql',dump.stdout,{flag:'wx'});await root.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[restore]);
  const imported=spawnSync(bin+'mysql.exe',['--protocol=TCP','--host=127.0.0.1','--port=3311','--user=root',restore],{input:dump.stdout,env:{...process.env,MYSQL_PWD:process.env.STAGE_ROOT_PASSWORD},windowsHide:true,maxBuffer:8*1024*1024});assert.equal(imported.status,0,'Isolated restore failed');
  const copy=knex({client:'mysql2',connection:{...settings,database:restore},pool:{afterCreate(c,done){c.query("SET SESSION time_zone = '+00:00'",e=>done(e,c));}}});try{assert.deepEqual(await snapshots(copy),before);}finally{await copy.destroy();}
  const evidence={restoreVerified:true,openingFingerprint:fingerprint,backupSha256:createHash('sha256').update(dump.stdout).digest('hex'),reviewReference:'Verified isolated synthetic staging opening',restoreSchema:restore};await writeFile(dir+'/restore-evidence.json',JSON.stringify(evidence,null,2),{flag:'wx'});console.log(JSON.stringify({restoreVerified:true,tables:Object.keys(before).length,realData:false}));
 }else if(action==='verify-restore'){
  const meta=JSON.parse(await readFile(dir+'/stage.json','utf8'));db=createDatabase(stageEnvironment(meta,'operator'));assert.equal((await db('production_control').first()).phase,'OPENING');
  const copy=knex({client:'mysql2',connection:{...settings,database:restore},pool:{afterCreate(c,done){c.query("SET SESSION time_zone = '+00:00'",e=>done(e,c));}}});
  try{const original=await snapshots(db),restored=await snapshots(copy);const mismatches=Object.keys(original).filter(k=>JSON.stringify(original[k])!==JSON.stringify(restored[k]));await writeFile(dir+'/restore-comparison.json',JSON.stringify({mismatches},null,2));assert.deepEqual(restored,original);}finally{await copy.destroy();}
  const bytes=await readFile(dir+'/opening-backup.sql'),evidence={restoreVerified:true,openingFingerprint:await openingFingerprint(db),backupSha256:createHash('sha256').update(bytes).digest('hex'),reviewReference:'Verified isolated synthetic staging opening',restoreSchema:restore};await writeFile(dir+'/restore-evidence.json',JSON.stringify(evidence,null,2),{flag:'wx'});console.log(JSON.stringify({restoreVerified:true,readOnlyForwardVerification:true}));
 }else if(action==='verify'){
  const meta=JSON.parse(await readFile(dir+'/stage.json','utf8'));db=createDatabase(stageEnvironment(meta));const [[row]]=await db.raw('SELECT DATABASE() n,CURRENT_USER() a,VERSION() v');console.log(JSON.stringify({...row,syntheticStaging:true}));
 }else throw Error('Unknown staging action');
}catch(error){await writeFile(dir+'/last-error.private.txt',String(error.stack||error));console.error(JSON.stringify({stopped:true,code:error.code||error.name,message:'Preserve new staging data and private logs; do not reset or repeat partial DDL'}));process.exitCode=1;}finally{await db?.destroy();await root?.end();}
