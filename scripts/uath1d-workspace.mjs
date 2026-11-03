import assert from 'node:assert/strict';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
export const h1dRoot=resolve('tmp/php-runtime/uath1d-owner-protection');
export async function ownerWorkspace() {
 await verifyUatEngine();
 const bindingPath=resolve('tmp/php-runtime/uath1-owner-binding.json'),binding=JSON.parse(await readFile(bindingPath,'utf8'));
 const original=JSON.parse(await readFile('tmp/php-runtime/owner-uat-binding.json','utf8'));
 assert.notEqual(binding.schema,original.schema);assert.match(binding.schema,/^upms_test_php_money_\d+$/);assert.match(binding.runtime,/^money_rt_\d+$/);
 const directory=await realpath(binding.directory);assert.ok(directory.startsWith(resolve('tmp/php-runtime')+sep));
 const browser=JSON.parse(await readFile(resolve(directory,'browser.json'),'utf8')),envPath=await realpath(browser.envPath);
 assert.ok(envPath.startsWith(directory+sep));const env=await readFile(envPath,'utf8');
 for(const [k,v] of Object.entries({UPMS_DB_HOST:'127.0.0.1',UPMS_DB_PORT:'3330',UPMS_DB_DATABASE:binding.schema,UPMS_DB_USERNAME:binding.runtime,UPMS_EMPLOYEE_HAFTA_ENABLED:'true'}))assert.ok(env.split(/\r?\n/).includes(k+'='+v),'FIXED_OWNER_UAT_PROFILE_REQUIRED');
 assert.ok(!/^UPMS_PRODUCTION_PROFILE=.+$/m.test(env),'PRODUCTION_PROFILE_REJECTED');
 return {bindingPath,binding,directory,envPath};
}
export async function ownerHelper(action,extra={}) {
 const workspace=await ownerWorkspace(),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
 return new Promise((done,fail)=>{
  const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/uath1d-local.php'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',()=>fail(Error('H1D_HELPER_START_FAILED')));
  p.on('close',code=>{if(code)return fail(Error('H1D_HELPER_FAILED '+JSON.stringify([...new Set((out+err).match(/\b(?:H1D|H1C|LABOR|MONEY|UPMS)_[A-Z_]+\b/g)||[])])));try{done(JSON.parse(out));}catch{const safeWarnings=out.match(/(?:Warning|Notice): (?:Undefined array key "[A-Za-z_]+"|Trying to access array offset on value of type [a-z]+)/g)||[];fail(Error('H1D_HELPER_RESPONSE_FAILED '+JSON.stringify(safeWarnings)));}});
  p.stdin.end(JSON.stringify({action,...workspace,password:engine.password,...extra}));
 });
}
