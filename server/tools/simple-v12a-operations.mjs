import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createDatabase} from '../src/identity/database.js';
import {migrate} from '../src/identity/migrations.js';
import {databasePreflight,knownMigrations} from '../src/identity/preflight.js';
import {simpleV1RuntimePrivileges} from '../src/identity/grants.js';
import {snapshots} from './business-operations.mjs';
import {up as v1} from '../simple-v1-migrations/202610240001_simple_v1.js';
import {createIdentityService} from '../src/identity/service.js';
const dir='server/.local/simple-v12a',action=process.argv[2],target=process.argv[3]||'01';
assert.ok(/^(?:0[1-6]|demo)$/.test(target));
const schema=target==='demo'?'upms_test_simplev12a_demo_20261024_01':'upms_test_simplev12a_20261024_'+target,user='upms_runtime_v12a_'+target,migrator='upms_migrator_v12a_'+target;
async function absent(path){try{await access(path);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Existing target/evidence: preserve without reuse');}
const save=(name,value)=>writeFile(dir+'/'+name+'.json',JSON.stringify(value,null,2),{flag:'wx'});
function connection(database){return createDatabase({...process.env,DB_NAME:database,DB_CONFIRM_NAME:database,IDENTITY_DB_PURPOSE:'operator'});}
let db;try{
 assert.equal(process.env.DB_NAME,'upms');assert.equal(process.env.DB_PORT,'3309');db=createDatabase();await databasePreflight(db,process.env,{runtime:false,expectedTables:111,expectedMigrations:knownMigrations});assert.equal(Number((await db.raw('SELECT @@innodb_force_recovery n'))[0][0].n),0);
 await mkdir(dir,{recursive:true});
 if(action==='preserve'||action==='verify'){
  const names=['upms','upms_test_simplev1_demo_20261024_01','upms_test_simplev11_demo_20261024_01','upms_test_simplev12_demo_20261024_01'];
  const evidence=action==='verify'?JSON.parse(await readFile(dir+'/preservation.json','utf8')):{};
  for(const name of names){const c=connection(name);try{const current=await snapshots(c);if(action==='preserve')evidence[name]=current;else for(const [table,fingerprint]of Object.entries(evidence[name]))if(name==='upms'||table.startsWith('v1_'))assert.deepEqual(current[table],fingerprint);}finally{await c.destroy();}}
  if(action==='preserve')await save('preservation',{...evidence,preservationVerified:true,scope:'Read-only fingerprints; no restore or migration to preserved data.'});
  console.info(JSON.stringify({preservedDatabases:names.length,readOnly:true,verified:action==='verify'}));
 }else if(action==='provision'){
  assert.equal(JSON.parse(await readFile(dir+'/preservation.json','utf8')).scope,'Read-only fingerprints; no restore or migration to preserved data.');await absent(dir+'/'+target+'-provisioned.json');assert.equal((await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]))[0].length,0);assert.equal((await db.raw('SELECT User FROM mysql.user WHERE User IN (?,?)',[user,migrator]))[0].length,0);
  await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[migrator,'localhost',process.env.V1_MIGRATOR_PASSWORD]);await db.raw('GRANT ALL PRIVILEGES ON ??.* TO ?@?',[schema,migrator,'localhost']);const env={...process.env,DB_NAME:schema,DB_CONFIRM_NAME:schema,DB_USER:migrator,DB_PASSWORD:process.env.V1_MIGRATOR_PASSWORD,IDENTITY_DB_PURPOSE:'operator'},migration=createDatabase(env);
  try{await migrate(migration,env);await v1(migration);if(!['01'].includes(target)){const {up}=await import('../simple-v1-migrations/202610240002_entry_fixes.js');await up(migration);}const operator=await createIdentityService(migration).bootstrap({username:'v1_operator',displayName:'Synthetic V1.2A Operator',password:process.env.V1_OPERATOR_PASSWORD});await migration('v1_control').where({id:1}).update({operator_id:operator,state:'READY',cutover_evidence:'Fresh synthetic V1.2 acceptance only; no company import. DC-0001 approved for this isolated fixture.'});}finally{await migration.destroy();}
  await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',process.env.V1_RUNTIME_PASSWORD]);for(const [table,rights]of Object.entries(simpleV1RuntimePrivileges))await db.raw('GRANT '+rights.join(',')+' ON ??.?? TO ?@?',[schema,table,user,'localhost']);await save(target+'-provisioned',{schema,user,migrator,entryVersion:['01'].includes(target)?1:2,tables:121,synthetic:true});console.info(JSON.stringify({provisioned:schema,entryVersion:['01'].includes(target)?1:2,mainUnchanged:true}));
 }else throw Error('Unknown action');
}catch(e){console.error(JSON.stringify({stopped:true,code:e.code||e.name,message:'Preserve partial state and private evidence; no reset or repeat DDL.'}));process.exitCode=1;}finally{await db?.destroy();}
