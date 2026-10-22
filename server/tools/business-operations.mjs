import { readFile,writeFile,access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createDatabase,capabilities } from '../src/identity/database.js';
import { migrate } from '../src/identity/migrations.js';
import { verifyRuntimeGrants,runtimePrivileges } from '../src/identity/grants.js';
import { businessRuntimePrivileges,businessPermissions,businessRoleGrants } from '../src/business/catalog.js';
import { verifyIdentitySchema } from './identity-schema.js';
import { canonical } from '../src/business/transactions.js';
import { databasePreflight } from '../src/identity/preflight.js';
const dir='server/.local/p22',restore='upms_restore_p22_20261021',test='upms_test_p22_20261021',testUser='upms_runtime_test_p22';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(name,value)=>writeFile(`${dir}/${name}.json`,JSON.stringify(value,null,2),{flag:'wx'});
async function absent(name){try{await access(`${dir}/${name}.json`);}catch(e){if(e.code==='ENOENT')return;throw e;}throw new Error('Prior operation evidence exists; no blind repeat.');}
export async function snapshots(db){
  const [tables]=await db.raw('SELECT TABLE_NAME AS name,ENGINE AS engine,TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
  const result={};for(const table of tables){const rows=await db(table.name).select('*');result[table.name]={engine:table.engine,collation:table.collation,count:rows.length,rows:rows.map(row=>sha(canonical(row))).sort()};}return result;
}
async function wildcard(db){const result=[];for(const username of ['upms_migrator','upms_runtime']){const [grants]=await db.raw('SHOW GRANTS FOR ?@?',[username,'%']);result.push({username,hash:sha(JSON.stringify(grants))});}return result;}
async function exact(db,account){const [rows]=await db.raw('SELECT CURRENT_USER() AS account,DATABASE() AS name,@@port AS port');if(rows[0].account!==account||rows[0].name!=='upms'||Number(rows[0].port)!==Number(process.env.DB_PORT))throw new Error('Exact target/account mismatch.');}
function client(name,input){
  const args=['--protocol=TCP',`--host=${process.env.DB_HOST}`,`--port=${process.env.DB_PORT}`,`--user=${process.env.DB_USER}`,'--default-character-set=utf8mb4'];
  if(name==='mysqldump')args.push('--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-comments','--hex-blob','--no-create-db','upms');
  else args.push(restore);
  const child=spawnSync(`C:/xampp/mysql/bin/${name}.exe`,args,{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},input,maxBuffer:32*1024*1024,windowsHide:true});
  if(child.status!==0)throw new Error('Private backup client failed; output withheld.');return child.stdout;
}
export async function grantBusinessRuntime(db,schema,user,all=false){
  if(!['upms',test,'upms_test_p22_identity_20261021'].includes(schema)||!['upms_runtime',testUser,'upms_runtime_test_p22_identity'].includes(user))throw new Error('Unreviewed grant scope.');
  const grants=all?runtimePrivileges:businessRuntimePrivileges;
  for(const [table,privileges]of Object.entries(grants))await db.raw(`GRANT ${privileges.join(',')} ON ??.?? TO ?@?`,[schema,table,user,'localhost']);
}
export async function verifyBusinessSchema(db,{runtime=false}={}){
  const [objects]=await db.raw('SELECT TABLE_NAME AS name,ENGINE AS engine,TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  const expected=Object.keys(businessRuntimePrivileges);
  if(!expected.every(name=>objects.some(row=>row.name===name&&row.engine==='InnoDB'&&row.collation.startsWith('utf8mb4_'))))throw new Error('Partial business schema.');
  const history=runtime?null:await db('upms_identity_migrations').orderBy('id').pluck('name');
  const expectedHistory=['202610210001_identity.js','202610210002_business_foundation.js'];
  if(!runtime&&JSON.stringify(history)!==JSON.stringify(expectedHistory)&&JSON.stringify(history)!==JSON.stringify([...expectedHistory,'202610220003_inventory_operations.js'])&&JSON.stringify(history)!==JSON.stringify([...expectedHistory,'202610220003_inventory_operations.js','202610220004_purchasing_accounts.js']))throw new Error('Unexpected migration history.');
  for(const [role,permissions]of Object.entries(businessRoleGrants)){const actual=await db('role_permissions').where({role_code:role}).pluck('permission_code');if(!permissions.every(p=>actual.includes(p)))throw new Error('Missing business permission grants.');}
  return {businessTables:expected.length,totalTables:objects.length,migrations:history,businessPermissions:businessPermissions.length,postingEnabled:false};
}
// Exported helpers have no side effects when imported by integration tests.
async function main(){
  let db;let stage='connect';
  try{
    const action=process.argv[2];db=createDatabase();
    await databasePreflight(db);
    const info=await capabilities(db);if(info.database_name!=='upms'||info.version!=='10.4.32-MariaDB')throw new Error('Reviewed endpoint changed.');
    if(action!=='inspect'&&process.env.UPMS_P22_APPROVED!=='P2.2-additive-reviewed')throw new Error('Explicit plan approval required.');
    if(action==='backup'){
      stage='backup-preflight';await absent('backup-verified');await verifyIdentitySchema(db);
      const [existing]=await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[restore]);if(existing.length)throw new Error('Restore schema exists; no reuse.');
      const before=await snapshots(db),accounts=await wildcard(db);
      const bytes=client('mysqldump');const sql=bytes.toString('utf8');
      if(/^(?:USE |DROP |TRUNCATE |CREATE DATABASE)/mi.test(sql)||!Object.keys(before).every(name=>sql.includes(`CREATE TABLE \`${name}\``)))throw new Error('Backup structure verification failed.');
      await writeFile(`${dir}/upms-before-p22.sql`,bytes,{flag:'wx'});
      if(sha(await readFile(`${dir}/upms-before-p22.sql`))!==sha(bytes))throw new Error('Backup readback failed.');
      await save('pre-migration',{target:{host:process.env.DB_HOST,port:process.env.DB_PORT,database:'upms'},info,before,accounts,backupSha256:sha(bytes)});
      stage='restore-drill';await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[restore]);client('mysql',bytes);
      // The general DB name guard deliberately disallows restore schemas: use the
      // already reviewed Owner connection with an explicit same-connection USE.
      const restoredSnapshot=await db.transaction(async trx=>{await trx.raw('USE ??',[restore]);try{return await snapshots(trx);}finally{await trx.raw('USE upms');}});
      if(JSON.stringify(before)!==JSON.stringify(restoredSnapshot))throw new Error('Backup restore fingerprint mismatch.');
      await save('backup-verified',{backup:'upms-before-p22.sql',sha256:sha(bytes),restoreSchema:restore,tables:Object.keys(before).length,readback:true,restoredFingerprintMatch:true,verifiedAt:new Date().toISOString()});
      console.info(JSON.stringify({action,backupVerified:true,restoreSchema:restore,tables:Object.keys(before).length,mainMutation:'none'}));
    }else if(action==='migrate'){
      stage='migration-preflight';await absent('migration-applied');await exact(db,'upms_migrator@localhost');await verifyIdentitySchema(db);
      const baseline=JSON.parse(await readFile(`${dir}/pre-migration.json`,'utf8')),backup=JSON.parse(await readFile(`${dir}/backup-verified.json`,'utf8'));
      if(sha(await readFile(`${dir}/${backup.backup}`))!==backup.sha256)throw new Error('Verified backup changed.');
      const source=(await readFile('server/migrations/202610210001_identity.js','utf8')).replaceAll('\r\n','\n');
      if(sha(source)!=='4c4e290353031d7cf3663a9fa6685b0ea5632dad87477a9c1ca3edeeb8e0deef')throw new Error('Original migration changed.');
      const immediate=await snapshots(db);
      for(const [name,table]of Object.entries(baseline.before))if(name!=='upms_identity_migrations_lock'&&!table.rows.every(hash=>immediate[name].rows.includes(hash)))throw new Error('Identity changed since backup; review needed.');
      stage='additive-migration';const migration=await migrate(db,{...process.env,UPMS_PREFLIGHT_VALIDATED:'true'});const schema=await verifyBusinessSchema(db),after=await snapshots(db);
      for(const [name,table]of Object.entries(immediate))if(name!=='upms_identity_migrations_lock'&&!table.rows.every(hash=>after[name].rows.includes(hash)))throw new Error('Preservation check failed; stop without cleanup.');
      await save('migration-applied',{migration,schema,preservedIdentityRows:true,originalMigrationUnchanged:true});console.info(JSON.stringify({action,...schema,preservedIdentityRows:true}));
    }else if(action==='grantruntime'){
      stage='runtime-grants';await absent('runtime-granted');await readFile(`${dir}/migration-applied.json`);const schema=await verifyBusinessSchema(db);
      const baseline=JSON.parse(await readFile(`${dir}/pre-migration.json`,'utf8'));if(JSON.stringify(await wildcard(db))!==JSON.stringify(baseline.accounts))throw new Error('Wildcard account fingerprints changed.');
      await grantBusinessRuntime(db,'upms','upms_runtime');await save('runtime-granted',{schema,wildcardAccountsUnchanged:true});console.info(JSON.stringify({action,tableScopes:Object.keys(businessRuntimePrivileges).length,wildcardAccountsUnchanged:true}));
    }else if(['provisiontest','provisionidentity'].includes(action)){
      const target=action==='provisionidentity'?'upms_test_p22_identity_20261021':test,user=action==='provisionidentity'?'upms_runtime_test_p22_identity':testUser;
      stage='new-test-environment';await absent(action==='provisionidentity'?'identity-test-environment':'test-environment');
      const [schemas]=await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[target]);
      const [users]=await db.raw('SELECT User FROM mysql.user WHERE User=?',[user]);if(schemas.length||users.length)throw new Error('Dedicated test schema/account exists; no reuse.');
      if(!process.env.UPMS_P22_TEST_PASSWORD||process.env.UPMS_P22_TEST_PASSWORD.length<32)throw new Error('Private generated test password required.');
      await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[target]);
      await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',process.env.UPMS_P22_TEST_PASSWORD]);
      const testDb=createDatabase({...process.env,DB_NAME:target,IDENTITY_DB_PURPOSE:'operator'});
      let schema;try{await migrate(testDb,{...process.env,DB_NAME:target,DB_CONFIRM_NAME:target});schema=await verifyBusinessSchema(testDb);}finally{await testDb.destroy();}
      await grantBusinessRuntime(db,target,user,true);await save(action==='provisionidentity'?'identity-test-environment':'test-environment',{database:target,account:`${user}@localhost`,schema});console.info(JSON.stringify({action,database:target,account:`${user}@localhost`,schema}));
    }else if(action==='inspect'){
      const schema=await verifyBusinessSchema(db,{runtime:true});const [account]=await db.raw('SELECT CURRENT_USER() AS account');const [grants]=await db.raw('SHOW GRANTS FOR CURRENT_USER');
      const proof=verifyRuntimeGrants(grants,'upms',account[0].account);const [admins]=await db('user_roles').where({role_code:'administrator'}).count('* AS count');
      const counts={};for(const table of ['business_categories','business_items','business_customers','business_vendors','business_money_accounts','business_documents','business_number_issues','business_posting_batches','business_periods','business_policy_versions'])counts[table]=Number((await db(table).count('* as n'))[0].n);
      const report={action,schema,proof,administrators:Number(admins.count),counts};
      await save(`final-verification-${Date.now()}`,report);console.info(JSON.stringify(report));
    }else throw new Error('Unknown operation.');
  }catch(error){console.error(`P2.2 operator stopped at ${stage}; code ${/^[A-Z0-9_]+$/.test(error.code||'')?error.code:'VALIDATION_STOP'}. Private state preserved; no SQL or credentials logged.`);process.exitCode=1;}
  finally{await db?.destroy();}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/business-operations.mjs'))await main();
