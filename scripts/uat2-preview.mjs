// A distinct, checkpointed synthetic launcher. Never upgrades 5173/5180 or copies passwords.
import {readFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import knex from 'knex';
import {verifyPassword} from '../server/src/identity/passwords.js';
import {startEmployeeLauncher} from './uath1-launcher.mjs';
import {provisionWorkspace,atomicJson,exists} from './uath1-workspace.mjs';
import {extensionHelper} from './uath1c-workspace.mjs';
import {chequeHelper} from './uat2-workspace.mjs';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {employeePreview,privatePath} from './uath1-preview.mjs';

async function assertBinding(binding,directory) {
 for(const p of ['owner-uat-binding.json','uath1-owner-binding.json']) {const b=JSON.parse(await readFile(resolve('tmp/php-runtime',p),'utf8'));if(b.schema===binding.schema)throw Error('CHEQUE_OWNER_TARGET_REJECTED');}
 if(!/^upms_test_php_money_[0-9]+$/.test(binding.schema)||!/^money_rt_[0-9]+$/.test(binding.runtime)||binding.schema.slice('upms_test_php_money_'.length)!==binding.runtime.slice('money_rt_'.length)||resolve(binding.directory)!==resolve(directory))throw Error('CHEQUE_BINDING_REJECTED');
 await privatePath(directory);
}
async function chequePreview(bindingPath,options) {
 const binding=JSON.parse(await readFile(await privatePath(bindingPath),'utf8'));await assertBinding(binding,binding.directory);
 const fixture=JSON.parse(await readFile(resolve(binding.directory,'browser.json'),'utf8'));if(resolve(fixture.envPath)!==resolve(binding.directory,'test.env'))throw Error('CHEQUE_ENV_BINDING_REJECTED');
 const lines=(await readFile(await privatePath(fixture.envPath),'utf8')).split(/\r?\n/);
 for(const [key,value] of Object.entries({UPMS_DB_HOST:'127.0.0.1',UPMS_DB_PORT:'3330',UPMS_DB_DATABASE:binding.schema,UPMS_DB_USERNAME:binding.runtime,UPMS_EMPLOYEE_HAFTA_ENABLED:'true',UPMS_LABOR_CLASSIFICATION_ENABLED:'true',UPMS_MONEY_ACCOUNTS_ENABLED:'true',UPMS_CHEQUE_MANAGEMENT_ENABLED:'true'})) {
  const matches=lines.filter(line=>line.startsWith(key+'='));if(matches.length!==1||matches[0]!==key+'='+value)throw Error('CHEQUE_ENV_BINDING_REJECTED');
 }
 if(lines.some(line=>/^UPMS_PRODUCTION_PROFILE=.+/.test(line)))throw Error('CHEQUE_PRODUCTION_PROFILE_REJECTED');
 return employeePreview(bindingPath,options);
}

export async function provisionChequeOwner({directory,password,onStage=()=>{},afterStage=()=>{}}) {
 await verifyUatEngine();await mkdir(directory,{recursive:true});const checkpoint=resolve(directory,'cheque-base-binding.json');let binding;
 if(await exists(checkpoint)) {
  binding=JSON.parse(await readFile(checkpoint,'utf8'));await assertBinding(binding,directory);const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
  const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});
  try {const user=await db('users').where({login_key:'php-admin'}).first();if(!user||!await verifyPassword(user.password_hash,password))throw Error('USE_ORIGINAL_SETUP_PASSWORD');}finally{await db.destroy();}
 }else{binding=await provisionWorkspace({directory,password,onStage,afterStage});await atomicJson(checkpoint,binding);}
 password='';
 await assertBinding(binding,directory);
 const envPath=resolve(directory,'test.env'),slash=p=>p.replaceAll('\\','/');
 for(const [stage,proof,work,envLines] of [
  ['classified-baseline','extension-guards.json',()=>extensionHelper(binding,'install'),p=>'UPMS_LABOR_CLASSIFICATION_ENABLED=true\nUPMS_LABOR_EXTENSION_GUARD_EVIDENCE="'+slash(p)+'"\n'],
  ['cheque-extension','cheque-guards.json',()=>chequeHelper(binding,'install'),p=>'UPMS_CHEQUE_MANAGEMENT_ENABLED=true\nUPMS_CHEQUE_GUARD_EVIDENCE="'+slash(p)+'"\n']
 ]) {
  onStage(stage);const path=resolve(directory,proof),inFlight=resolve(directory,stage+'-in-flight.json');
  if(!await exists(path)) {
   if(await exists(inFlight))throw Error('PARTIAL_STAGE_REVIEW_REQUIRED');
   await atomicJson(inFlight,{stage,startedUtc:new Date().toISOString()});
   const g=await work();delete g.schemaHashes;await atomicJson(path,g);
  }
  const lines=envLines(path),current=await readFile(envPath,'utf8');if(!current.includes(lines))await appendFile(envPath,lines);
  await afterStage(stage);
 }
 await chequeHelper(binding,'verify');return binding;
}
export async function startChequeLauncher(options={}) {
 if(Object.keys(options).some(k=>!['port','bindingPath','directory','afterStage'].includes(k))||options.port!==undefined&&(!Number.isInteger(options.port)||options.port<1||options.port>65535||[5173,5180,3330].includes(options.port)))throw Error('CHEQUE_OWNER_SERVER_REJECTED');
 const directory=options.directory??resolve('tmp/php-runtime/uat2-owner-setup'),bindingPath=options.bindingPath??resolve('tmp/php-runtime/uat2-owner-binding.json');
 if(await exists(bindingPath))await assertBinding(JSON.parse(await readFile(await privatePath(bindingPath),'utf8')),directory);
 return startEmployeeLauncher({port:5196,...options,directory,bindingPath,workspaceTitle:'UPMS incoming cheque UAT',workspaceDescription:'Incoming customer cheques in a new isolated workspace. Ports 5173 and 5180 and all existing records are preserved. Operational policy approval is pending.',cookieName:'upms_cheque_uat',provision:provisionChequeOwner,previewFactory:chequePreview});
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const app=await startChequeLauncher();console.log(JSON.stringify({url:'http://127.0.0.1:5196/management',...app.status(),productionContacted:false}));
}
