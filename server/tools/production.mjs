// Offline owner CLI. Never called by HTTP startup. All secrets come from the private process environment.
import mysql from 'mysql2/promise';import knex from 'knex';import {spawnSync} from 'node:child_process';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {isAbsolute,resolve,relative} from 'node:path';import {randomUUID,createHash} from 'node:crypto';
import {productionProfile} from '../src/production/profile.js';import {createDatabase} from '../src/identity/database.js';import {productionRuntimePrivileges} from '../src/identity/grants.js';import {initializeProduction,activateReviewedOpening,openingFingerprint} from '../src/production/setup.js';import {validateEngine} from '../src/identity/engine.js';import {reconcileV1} from '../src/simple-v1/reconcile.js';
const env={...process.env,IDENTITY_DB_PURPOSE:'operator'},action=process.argv[2];let profile,db,owner;
const hash=b=>createHash('sha256').update(b).digest('hex');
function approve(name){if(env.UPMS_OPERATION_APPROVAL!==`${name}:${profile.schema}:${profile.instance}`)throw Error('Explicit owner operation approval is required');}
async function ownerConnection(){if(!env.DB_OWNER_USER||!env.DB_OWNER_PASSWORD)throw Error('Private database-owner credentials required');const c=await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_OWNER_USER,password:env.DB_OWNER_PASSWORD});const [[s]]=await c.query('SELECT @@server_id s,@@port p,@@innodb_force_recovery r,VERSION() v,CURRENT_USER() a');validateEngine(s.v,env);if(String(s.s)!==profile.serverId||Number(s.p)!==profile.port||Number(s.r)!==0||s.a!==env.DB_OWNER_USER+'@localhost')throw Error('Owner endpoint mismatch');return c;}
try{
 profile=productionProfile(env);
 if(!profile||profile.staging)throw Error('This CLI requires the separately approved real production identity');
 if(['provision','grant-runtime'].includes(action)){
  approve(action);owner=await ownerConnection();
  if(action==='provision'){
   for(const key of ['UPMS_RUNTIME_PASSWORD','UPMS_MIGRATOR_PASSWORD','UPMS_BACKUP_PASSWORD'])if(!env[key]||env[key].length<32)throw Error('Fresh private database passwords required');
   const [[count]]=await owner.query('SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[profile.schema]);if(Number(count.n))throw Error('Preserve existing schema; no reset/reuse');
   const [accounts]=await owner.query('SELECT User FROM mysql.user WHERE User IN (?,?,?)',['upms_runtime_production','upms_migrator_production','upms_backup_production']);if(accounts.length)throw Error('Preserve existing accounts; review a forward plan');
   await owner.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[profile.schema]);
   for(const [user,key]of [['upms_runtime_production','UPMS_RUNTIME_PASSWORD'],['upms_migrator_production','UPMS_MIGRATOR_PASSWORD'],['upms_backup_production','UPMS_BACKUP_PASSWORD']])await owner.query('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',env[key]]);
   await owner.query('GRANT ALL PRIVILEGES ON ??.* TO ?@?',[profile.schema,'upms_migrator_production','localhost']);await owner.query('GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON ??.* TO ?@?',[profile.schema,'upms_backup_production','localhost']);
  }else{
   const [[row]]=await owner.query('SELECT * FROM ??.production_control WHERE id=1',[profile.schema]);if(row.instance_id!==profile.instance||row.phase!=='OPENING'||row.purpose!=='production')throw Error('Reviewed initialization receipt required');
   for(const [table,rights]of Object.entries(productionRuntimePrivileges))await owner.query('GRANT '+rights.join(',')+' ON ??.?? TO ?@?',[profile.schema,table,profile.user,'localhost']);
  }
  console.log(JSON.stringify({action,schema:profile.schema,completed:true,postingActivated:false}));
 }else{
  db=createDatabase(env);
  if(action==='inspect'){
   const [[s]]=await db.raw('SELECT DATABASE() n,CURRENT_USER() a,@@server_id s,@@port p,@@innodb_force_recovery r,VERSION() v');if(s.n!==profile.schema||s.a!==env.DB_USER+'@localhost'||String(s.s)!==profile.serverId||Number(s.p)!==profile.port||Number(s.r)!==0)throw Error('Inspection identity mismatch');console.log(JSON.stringify({schema:s.n,account:s.a,engine:s.v,serverId:String(s.s),port:Number(s.p),readOnly:true}));
  }else if(action==='initialize'){
   approve(action);const receipt=await initializeProduction(db,env,{username:env.UPMS_ADMIN_LOGIN,displayName:env.UPMS_ADMIN_DISPLAY_NAME,password:env.UPMS_ADMIN_PASSWORD,cutoff:env.UPMS_OPENING_DATE,nextChallan:Number(env.UPMS_NEXT_CHALLAN),reviewReference:env.UPMS_OPENING_REVIEW_REFERENCE});console.log(JSON.stringify(receipt));
  }else if(action==='review-opening'){
   console.log(JSON.stringify({openingFingerprint:await openingFingerprint(db),reconciliation:await reconcileV1(db),postingActivated:false}));
  }else if(action==='approve-openings'){
   approve(action);const evidence=JSON.parse(await readFile(process.argv[3],'utf8'));console.log(JSON.stringify(await activateReviewedOpening(db,env,evidence)));
  }else if(action==='backup'){
   if(env.DB_USER!=='upms_backup_production')throw Error('Dedicated backup account required');
   const dir=env.UPMS_BACKUP_DIRECTORY;if(!dir||!isAbsolute(dir)||!relative(process.cwd(),resolve(dir)).startsWith('..'))throw Error('Backups must be in a private absolute directory outside the release');await mkdir(dir,{recursive:true,mode:0o700});
   const before=await openingFingerprint(db),dump=spawnSync(env.UPMS_MYSQLDUMP||'mysqldump',['--protocol=TCP','--host='+env.DB_HOST,'--port='+env.DB_PORT,'--user='+env.DB_USER,'--single-transaction','--routines','--events','--triggers','--no-tablespaces','--set-gtid-purged=OFF','--skip-add-drop-table','--hex-blob',profile.schema],{env:{...process.env,MYSQL_PWD:env.DB_PASSWORD},windowsHide:true,maxBuffer:512*1024*1024});if(dump.status!==0)throw Error('Private backup failed; inspect protected operator logs');
   const file=resolve(dir,new Date().toISOString().replaceAll(':','-')+'-'+randomUUID()+'.sql');await writeFile(file,dump.stdout,{flag:'wx',mode:0o600});const evidence={sourceInstance:profile.instance,schema:profile.schema,backupSha256:hash(dump.stdout),file,openingFingerprint:before===await openingFingerprint(db)?before:null,restoreVerified:false};await writeFile(file+'.json',JSON.stringify(evidence,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify({backupSaved:true,receipt:file+'.json',restoreVerified:false}));
  }else if(action==='verify-restore'){
   approve(action);const evidence=JSON.parse(await readFile(process.argv[3],'utf8')),bytes=await readFile(evidence.file),schema=env.UPMS_RESTORE_SCHEMA;
   if(evidence.sourceInstance!==profile.instance||evidence.schema!==profile.schema||hash(bytes)!==evidence.backupSha256||!/^upms_restore_production_[a-f0-9]{12}$/.test(schema||''))throw Error('Reviewed isolated restore identity required');owner=await ownerConnection();const [[count]]=await owner.query('SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]);if(Number(count.n))throw Error('Never reuse a restore schema');await owner.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);
   const imported=spawnSync(env.UPMS_MYSQL||'mysql',['--protocol=TCP','--host='+env.DB_HOST,'--port='+env.DB_PORT,'--user='+env.DB_OWNER_USER,schema],{input:bytes,env:{...process.env,MYSQL_PWD:env.DB_OWNER_PASSWORD},windowsHide:true,maxBuffer:8*1024*1024});if(imported.status!==0)throw Error('Preserve partial restore; do not reset/reimport');
   const restored=knex({client:'mysql2',connection:{host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_OWNER_USER,password:env.DB_OWNER_PASSWORD,database:schema,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true},pool:{afterCreate(c,done){c.query("SET SESSION time_zone='+00:00'",e=>done(e,c));}}});
   try{if(!(await reconcileV1(restored)).matched)throw Error('Restored source/journal reconciliation failed');if(evidence.openingFingerprint&&evidence.openingFingerprint!==await openingFingerprint(restored))throw Error('Restored opening fingerprint mismatch');}finally{await restored.destroy();}
   const receipt={...evidence,restoreVerified:true,restoreSchema:schema,reviewReference:env.UPMS_RESTORE_REVIEW_REFERENCE};await writeFile(process.argv[3]+'.verified.json',JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify({restoreVerified:true,receipt:process.argv[3]+'.verified.json',postingActivated:false}));
  }else throw Error('Use inspect, provision, initialize, grant-runtime, review-opening, backup, verify-restore or approve-openings');
 }
}catch(error){console.error(JSON.stringify({stopped:true,code:error.code||error.name,message:'No reset or automatic recovery. Preserve private state and review the initialization/restore forward plan.'}));process.exitCode=1;}finally{await db?.destroy();await owner?.end();}
