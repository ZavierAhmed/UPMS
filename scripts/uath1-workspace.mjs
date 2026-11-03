// Empty isolated workspace provisioning, checkpointed and never an owner-db migration.
import {mkdir,readFile,writeFile,rename,access} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import knex from 'knex';
import {createIdentityService} from '../server/src/identity/service.js';
import {verifyPassword} from '../server/src/identity/passwords.js';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {protectPrivateDirectory} from './php-7-5-private-directory.mjs';
import {privateRoot,privatePath} from './uath1-preview.mjs';
export async function exists(p){try{await access(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export async function atomicJson(path,value){const tmp=path+'.next';await writeFile(tmp,JSON.stringify(value,null,2));await rename(tmp,path);}
export async function provisionWorkspace({directory,password,onStage=()=>{},afterStage=()=>{}}){
 if(typeof password!=='string'||password.length<14||password.length>128)throw Error('PASSWORD_LENGTH');
 await verifyUatEngine();directory=resolve(directory);if(!directory.startsWith(privateRoot+sep))throw Error('PRIVATE_SETUP_REQUIRED');
 await mkdir(directory,{recursive:true});await privatePath(directory);await protectPrivateDirectory(directory);
 const progress=resolve(directory,'progress.json');let journal;
 if(await exists(progress))journal=JSON.parse(await readFile(progress,'utf8'));else{const id=Date.now().toString();journal={schema:'upms_test_php_money_'+id,runtime:'money_rt_'+id,directory,completed:[],inFlight:null};await atomicJson(progress,journal);}
 if(journal.directory!==directory||!/^upms_test_php_money_[0-9]+$/.test(journal.schema)||!/^money_rt_[0-9]+$/.test(journal.runtime))throw Error('SETUP_JOURNAL_REJECTED');
 const original=JSON.parse(await readFile(resolve(privateRoot,'owner-uat-binding.json'),'utf8'));if(original.schema===journal.schema)throw Error('ORIGINAL_OWNER_TARGET_REJECTED');
 // A crash during a nontransactional DDL step requires review; never rerun/reinitialize it blindly.
 if(journal.inFlight)throw Error('PARTIAL_STAGE_REVIEW_REQUIRED');
 const e=JSON.parse(await readFile(resolve(privateRoot,'php2-engine.json'),'utf8'));
 const connection={host:'127.0.0.1',port:3330,user:'php2_test_admin',password:e.password,dateStrings:true};const admin=knex({client:'mysql2',connection,pool:{min:0,max:1}});let db;
 const helper=(file,action)=>new Promise((done,fail)=>{const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),[file],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',codes=[];p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>{codes.push(...(b.toString().match(/\b[A-Z][A-Z_]{7,}\b/g)||[]));});p.on('error',()=>fail(Error('HELPER_START_FAILED')));p.on('close',code=>{if(code){const error=Error('HELPER_FAILED');error.diagnosticCodes=[...new Set(codes)].slice(0,12);return fail(error);}try{done(JSON.parse(out));}catch{fail(Error('HELPER_RESPONSE_FAILED'));}});p.stdin.on('error',()=>{});p.stdin.end(JSON.stringify({action,port:3330,schema:journal.schema,runtime:journal.runtime,user:connection.user,password:e.password}));});
 const step=async(name,work)=>{onStage(name);if(journal.completed.includes(name))return; journal.inFlight=name;await atomicJson(progress,journal);try{await work();journal.completed.push(name);journal.inFlight=null;await atomicJson(progress,journal);}catch(error){throw error;}await afterStage(name);};
 try{
  await step('database',async()=>{if((await admin.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[journal.schema]))[0].length)throw Error('EXISTING_UNBOUND_SCHEMA_REVIEW');await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[journal.schema]);});
  db=knex({client:'mysql2',connection:{...connection,database:journal.schema},pool:{min:0,max:1}});
  await step('base',()=>helper('upms.php/tests/Support/money-local.php','base'));
  if(journal.completed.includes('administrator')){onStage('existing-administrator-password');const user=await db('users').where({login_key:'php-admin'}).first();if(!user||!await verifyPassword(user.password_hash,password))throw Error('USE_ORIGINAL_SETUP_PASSWORD');}
  await step('administrator',async()=>{if((await db('users')).length)throw Error('EXISTING_ADMIN_REVIEW');const id=await createIdentityService(db).bootstrap({username:'php-admin',displayName:'Employee Hafta UAT Administrator',password});await db('v1_control').where({id:1}).update({entry_version:2,operator_id:id,state:'READY',cutover_evidence:'ISOLATED-UATH1-STARTUP-ONLY'});});
  const credentialPath=resolve(directory,'runtime-private.json');let runtime;
  if(await exists(credentialPath))runtime=JSON.parse(await readFile(credentialPath,'utf8'));else{runtime={password:randomBytes(32).toString('hex'),appKey:randomBytes(32).toString('base64')};await atomicJson(credentialPath,runtime);}
  await step('runtime',async()=>{await admin.raw('CREATE USER ??@? IDENTIFIED BY ?',[journal.runtime,'localhost',runtime.password]);await admin.raw('GRANT SELECT,INSERT,UPDATE,DELETE ON ??.* TO ??@?',[journal.schema.replaceAll('_','\\_'),journal.runtime,'localhost']);});
  await step('base-guards',()=>helper('upms.php/tests/Support/money-local.php','guards'));
  await step('money',async()=>{const g=await helper('upms.php/tests/Support/money-local.php','extension');delete g.schemaHashes;await atomicJson(resolve(directory,'money-proof.json'),g);});
  await step('expenses',async()=>{const money=JSON.parse(await readFile(resolve(directory,'money-proof.json'),'utf8'));const g={...money,...await helper('upms.php/tests/Support/money-local.php','expenseExtension')};delete g.schemaHashes;await atomicJson(resolve(directory,'guard-evidence.json'),g);});
  await step('labor',async()=>{const g=await helper('upms.php/tests/Support/labor-local.php','install');delete g.schemaHashes;await atomicJson(resolve(directory,'labor-guards.json'),g);});
  await step('environment',async()=>{
   const envPath=resolve(directory,'test.env'),slash=p=>p.replaceAll('\\','/');
   const env=`APP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${runtime.appKey}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=https://app.unique-plastic.test\nUPMS_DB_HOST=127.0.0.1\nUPMS_DB_PORT=3330\nUPMS_DB_DATABASE=${journal.schema}\nUPMS_DB_USERNAME=${journal.runtime}\nUPMS_DB_PASSWORD=${runtime.password}\nUPMS_MONEY_ACCOUNTS_ENABLED=true\nUPMS_MONEY_GUARD_EVIDENCE="${slash(resolve(directory,'guard-evidence.json'))}"\nUPMS_EXPENSE_MASTERS_ENABLED=true\nUPMS_EXPENSE_GUARD_EVIDENCE="${slash(resolve(directory,'guard-evidence.json'))}"\nUPMS_FINANCIAL_REFUNDS_ENABLED=true\nUPMS_EMPLOYEE_HAFTA_ENABLED=true\nUPMS_EMPLOYEE_HAFTA_GUARD_EVIDENCE="${slash(resolve(directory,'labor-guards.json'))}"\n`;
   await writeFile(envPath,env);await atomicJson(resolve(directory,'browser.json'),{envPath});
  });
  onStage('native-verification');const proof=await helper('upms.php/tests/Support/labor-local.php','verify');if(proof.guards.totalGuards!==88)throw Error('GUARD_COUNT_REJECTED');
  return {schema:journal.schema,runtime:journal.runtime,directory};
 }finally{password='';await db?.destroy();await admin.destroy();}
}
