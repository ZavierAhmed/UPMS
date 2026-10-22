import { readFile,writeFile,access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createDatabase,capabilities } from '../src/identity/database.js';
import { migrate } from '../src/identity/migrations.js';
import { runtimePrivileges,verifyRuntimeGrants } from '../src/identity/grants.js';
import { snapshots,verifyBusinessSchema } from './business-operations.mjs';
import { inventoryRuntimePrivileges,inventoryRoleGrants } from '../src/inventory/catalog.js';
import { databasePreflight } from '../src/identity/preflight.js';
const recovered=process.env.UPMS_P23_RECOVERED==='true';
const directory=recovered?'server/.local/p23b/resumption':'server/.local/p23',restore=recovered?'upms_restore_p23b_resume_20261022':'upms_restore_p23_20261022';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(name,value)=>writeFile(`${directory}/${name}.json`,JSON.stringify(value,null,2),{flag:'wx'});
async function absent(name){try{await access(`${directory}/${name}.json`);}catch(error){if(error.code==='ENOENT')return;throw error;}throw Error('Existing operation evidence; stop without reuse.');}
async function wildcard(db){const result=[];for(const user of ['upms_migrator','upms_runtime']){if(recovered){const [users]=await db.raw('SELECT User FROM mysql.user WHERE User=? AND Host=?',[user,'%']);if(!users.length){result.push({user,present:false});continue;}}const [grants]=await db.raw('SHOW GRANTS FOR ?@?',[user,'%']);result.push({user,fingerprint:sha(JSON.stringify(grants))});}return result;}
export async function inventorySchema(db,{runtime=false}={}){
  const base=await verifyBusinessSchema(db,{runtime});const [tables]=await db.raw('SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  if(!Object.keys(inventoryRuntimePrivileges).every(name=>tables.some(t=>t.name===name&&t.engine==='InnoDB')))throw Error('Incomplete inventory schema.');
  if(!runtime&&JSON.stringify(base.migrations)!==JSON.stringify(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js'])&&JSON.stringify(base.migrations)!==JSON.stringify(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js','202610220004_purchasing_accounts.js'])&&JSON.stringify(base.migrations)!==JSON.stringify(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js','202610220004_purchasing_accounts.js','202610220005_sales_challans.js'])&&JSON.stringify(base.migrations)!==JSON.stringify(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js','202610220004_purchasing_accounts.js','202610220005_sales_challans.js','202610220006_classified_receivables.js'])&&JSON.stringify(base.migrations)!==JSON.stringify(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js','202610220004_purchasing_accounts.js','202610220005_sales_challans.js','202610220006_classified_receivables.js','202610220007_customer_receipts.js'])&&JSON.stringify(base.migrations)!==JSON.stringify(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js','202610220004_purchasing_accounts.js','202610220005_sales_challans.js','202610220006_classified_receivables.js','202610220007_customer_receipts.js','202610220008_customer_cheques.js']))throw Error('Unexpected migration history.');
  for(const [role,grants]of Object.entries(inventoryRoleGrants)){const actual=await db('role_permissions').where({role_code:role}).pluck('permission_code');if(!grants.every(p=>actual.includes(p)))throw Error('Missing inventory permission.');}
  return {...base,inventoryTables:6,tableCount:tables.length,warehouseCount:1,conditionTransfersEnabled:false};
}
async function historicSources(){
  for(const [file,digest]of [['202610210001_identity.js','4c4e290353031d7cf3663a9fa6685b0ea5632dad87477a9c1ca3edeeb8e0deef'],['202610210002_business_foundation.js','a913d4b78499f1d58387c9dd0dd0b259f5fd76acb36b87700b2b59732c289862']])if(sha(await readFile(`server/migrations/${file}`))!==digest)throw Error('Historical migration fingerprint changed.');
}
function backupClient(name,input){
  const args=['--protocol=TCP',`--host=${process.env.DB_HOST}`,`--port=${process.env.DB_PORT}`,`--user=${process.env.DB_USER}`,'--default-character-set=utf8mb4'];
  if(name==='mysqldump')args.push('--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-comments','--hex-blob','--no-create-db','upms');else args.push(restore);
  const child=spawnSync(`C:/xampp/mysql/bin/${name}.exe`,args,{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},input,maxBuffer:64*1024*1024,windowsHide:true});if(child.status!==0)throw Error('Private backup client failed.');return child.stdout;
}
async function grant(db,schema,user,privileges){for(const [table,rights]of Object.entries(privileges))await db.raw(`GRANT ${rights.join(',')} ON ??.?? TO ?@?`,[schema,table,user,'localhost']);}
async function main(){let db,stage='connect';try{
  const action=process.argv[2];db=createDatabase();const info=await capabilities(db);if(info.database_name!=='upms'||info.version!=='10.4.32-MariaDB')throw Error('Unreviewed database endpoint.');
  await databasePreflight(db);
  if(recovered){const [rows]=await db.raw('SELECT @@datadir path,@@port port,@@innodb_force_recovery recovery');if(Number(rows[0].port)!==3309||Number(rows[0].recovery)!==0||!rows[0].path.replaceAll('\\','/').endsWith('/server/.local/p23b/console-probe-03/data/'))throw Error('Unreviewed recovered endpoint.');}
  if(action!=='inspect'&&process.env.UPMS_P23_APPROVED!=='P2.3-reviewed-additive')throw Error('Explicit P2.3 plan authorization required.');
  await historicSources();
  if(action==='backup'){
    stage='backup-preflight';await absent('backup-verified');const base=await verifyBusinessSchema(db);if(base.totalTables!==38||base.migrations.length!==2)throw Error('Unexpected P2.2 schema.');
    const [exists]=await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[restore]);if(exists.length)throw Error('Restore schema already exists.');
    const before=await snapshots(db),accounts=await wildcard(db),bytes=backupClient('mysqldump'),sql=bytes.toString('utf8');
    if(/^(?:USE |DROP |TRUNCATE |CREATE DATABASE)/mi.test(sql)||!Object.keys(before).every(name=>sql.includes(`CREATE TABLE \`${name}\``)))throw Error('Unsafe/incomplete backup.');
    await writeFile(`${directory}/upms-before-p23.sql`,bytes,{flag:'wx'});if(sha(await readFile(`${directory}/upms-before-p23.sql`))!==sha(bytes))throw Error('Backup readback failed.');
    await save('pre-migration',{target:{host:process.env.DB_HOST,port:process.env.DB_PORT,database:'upms'},before,accounts,backupSha256:sha(bytes)});
    stage='restore-drill';await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[restore]);backupClient('mysql',bytes);
    const restored=await db.transaction(async trx=>{await trx.raw('USE ??',[restore]);try{return await snapshots(trx);}finally{await trx.raw('USE upms');}});
    if(JSON.stringify(restored)!==JSON.stringify(before))throw Error('Restore fingerprint mismatch.');
    await save('backup-verified',{file:'upms-before-p23.sql',sha256:sha(bytes),restore,tables:38,restoredFingerprintsMatch:true,verifiedUtc:new Date().toISOString()});console.info(JSON.stringify({action,backupVerified:true,tables:38,restore,mainMutation:'none'}));
  }else if(action==='verifyrestore'){
    stage='forward-restore-preflight';await absent('backup-verified');
    const target='upms_restore_p23_20261022_02',baseline=JSON.parse(await readFile(`${directory}/pre-migration.json`,'utf8')),bytes=await readFile(`${directory}/upms-before-p23.sql`);
    if(sha(bytes)!==baseline.backupSha256||JSON.stringify(await snapshots(db))!==JSON.stringify(baseline.before))throw Error('Backup or source checkpoint changed.');
    const sql=bytes.toString('utf8');if(/^(?:USE |DROP |TRUNCATE |CREATE DATABASE)/mi.test(sql)||!Object.keys(baseline.before).every(name=>sql.includes(`CREATE TABLE \`${name}\``)))throw Error('Unsafe/incomplete saved backup.');
    const [existing]=await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[target]);if(existing.length)throw Error('Forward restore already exists.');
    stage='forward-restore-import';await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[target]);
    const child=spawnSync('C:/xampp/mysql/bin/mysql.exe',['--protocol=TCP',`--host=${process.env.DB_HOST}`,`--port=${process.env.DB_PORT}`,`--user=${process.env.DB_USER}`,'--default-character-set=utf8mb4',target],{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},input:bytes,maxBuffer:64*1024*1024,windowsHide:true});
    await writeFile(`${directory}/forward-restore-client.json`,JSON.stringify({status:child.status,signal:child.signal,errorCode:child.error?.code,stderr:child.stderr?.toString('utf8')},null,2),{flag:'wx'});
    if(child.status!==0||child.error)throw Error('Forward restore client failed.');
    stage='forward-restore-verification';await verifySavedRestore(baseline,target);
    await save('backup-verified',{file:'upms-before-p23.sql',sha256:sha(bytes),restore:target,tables:38,restoredFingerprintsMatch:true,freshConnectionChecks:2,verifiedUtc:new Date().toISOString()});console.info(JSON.stringify({action,backupVerified:true,tables:38,restore:target,mainMutation:'none'}));
  }else if(action==='provision'){
    stage='fresh-test-provision';const schema=process.env.UPMS_P23_SCHEMA,user=process.env.UPMS_P23_USER,scope=process.env.UPMS_P23_SCOPE,run=process.env.UPMS_P23_RUN;
    const expected=scope==='Regression'?`upms_test_p23_regression_20261022_${run}`:`upms_test_p23_20261022_${run}`,account=scope==='Regression'?`upms_runtime_test_p23r${run}`:`upms_runtime_test_p23_${run}`;
    if(schema!==expected||user!==account||!(/^(0[1-6])$/.test(run))||scope==='Regression'&&!(['01','02'].includes(run)||run==='03'&&recovered&&process.env.UPMS_P23_SUPPLEMENTAL==='reviewed-fresh-regression-03')||!process.env.UPMS_P23_PASSWORD||process.env.UPMS_P23_PASSWORD.length<32)throw Error('Unreviewed test target.');
    await absent(`${scope.toLowerCase()}-${run}-provisioned`);const [schemas]=await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]),[users]=await db.raw('SELECT User FROM mysql.user WHERE User=?',[user]);if(schemas.length||users.length)throw Error('Existing schema/account will not be reused.');
    await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',process.env.UPMS_P23_PASSWORD]);
    const test=createDatabase({...process.env,DB_NAME:schema,IDENTITY_DB_PURPOSE:'operator'});let shape;try{await migrate(test,{...process.env,DB_NAME:schema,DB_CONFIRM_NAME:schema});shape=await inventorySchema(test);}finally{await test.destroy();}
    await grant(db,schema,user,runtimePrivileges);await save(`${scope.toLowerCase()}-${run}-provisioned`,{database:schema,user,shape});console.info(JSON.stringify({action,database:schema,account:`${user}@localhost`,shape}));
  }else if(action==='migrate'){
    stage='migration-preflight';await absent('migration-applied');const [who]=await db.raw('SELECT CURRENT_USER() AS account,@@port AS port');if(who[0].account!=='upms_migrator@localhost'||Number(who[0].port)!==Number(process.env.DB_PORT))throw Error('Dedicated migrator endpoint required.');
    const baseline=JSON.parse(await readFile(`${directory}/pre-migration.json`,'utf8')),backup=JSON.parse(await readFile(`${directory}/backup-verified.json`,'utf8'));if(sha(await readFile(`${directory}/${backup.file}`))!==backup.sha256)throw Error('Backup changed.');
    const shape=await verifyBusinessSchema(db);if(shape.totalTables!==38||shape.migrations.length!==2)throw Error('Unexpected owner schema.');const before=await snapshots(db);
    for(const [name,table]of Object.entries(baseline.before))if(name!=='upms_identity_migrations_lock'&&!table.rows.every(hash=>before[name].rows.includes(hash)))throw Error('Existing data changed since backup; review first.');
    stage='additive-migration';await migrate(db,{...process.env,UPMS_PREFLIGHT_VALIDATED:'true'});const after=await snapshots(db);
    for(const [name,table]of Object.entries(before))if(name!=='upms_identity_migrations_lock'&&!table.rows.every(hash=>after[name].rows.includes(hash)))throw Error('Preservation check failed.');
    const result={shape:await inventorySchema(db),allExistingRowsPreserved:true,historicalMigrationsUnchanged:true};await save('migration-applied',result);console.info(JSON.stringify({action,...result}));
  }else if(action==='grantruntime'){
    stage='runtime-grants';await absent('runtime-granted');await readFile(`${directory}/migration-applied.json`);await inventorySchema(db);const baseline=JSON.parse(await readFile(`${directory}/pre-migration.json`,'utf8'));if(JSON.stringify(await wildcard(db))!==JSON.stringify(baseline.accounts))throw Error('Wildcard accounts changed.');
    await grant(db,'upms','upms_runtime',inventoryRuntimePrivileges);await save('runtime-granted',{inventoryTables:6,wildcardAccountsUnchanged:true});console.info(JSON.stringify({action,inventoryTables:6,wildcardAccountsUnchanged:true}));
  }else if(action==='inspect'){
    const shape=await inventorySchema(db,{runtime:true}),[who]=await db.raw('SELECT CURRENT_USER() AS account'),[grants]=await db.raw('SHOW GRANTS FOR CURRENT_USER');const proof=verifyRuntimeGrants(grants,'upms',who[0].account),counts={};for(const name of Object.keys(inventoryRuntimePrivileges))counts[name]=Number((await db(name).count('* as n'))[0].n);
    const result={shape,proof,counts};await save(`inspection-${Date.now()}`,result);console.info(JSON.stringify(result));
  }else throw Error('Unknown operator action.');
}catch(error){console.error(`P2.3 operator stopped at ${stage}: ${/^[A-Z0-9_]+$/.test(error.code||'')?error.code:'VALIDATION_STOP'}. Existing state preserved; private diagnostics withheld.`);process.exitCode=1;}finally{await db?.destroy();}}
export async function verifySavedRestore(baseline,target){
  if(target!=='upms_restore_p23_20261022_02')throw Error('Unreviewed restore verification target.');
  for(let attempt=0;attempt<2;attempt++){const check=createDatabase({...process.env,IDENTITY_DB_PURPOSE:'operator'});try{const restored=await check.transaction(async trx=>{await trx.raw('USE ??',[target]);try{return await snapshots(trx);}finally{await trx.raw('USE upms');}});if(JSON.stringify(restored)!==JSON.stringify(baseline.before))throw Error('Forward restored fingerprint mismatch.');}finally{await check.destroy();}}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/inventory-operations.mjs'))await main();
