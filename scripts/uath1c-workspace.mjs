// Fresh isolated synthetic environments only. Never copies administrator credentials.
import {readFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {provisionWorkspace,atomicJson} from './uath1-workspace.mjs';
export async function extensionHelper(binding,action) {
 const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
 return new Promise((done,fail)=>{
  const child=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/labor-extension-local.php'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',()=>fail(Error('H1C_HELPER_START_FAILED')));
  child.on('close',code=>{if(code)return fail(Error('H1C_HELPER_FAILED '+JSON.stringify([...new Set((out+err).match(/\b(?:H1C|LABOR|MONEY|UPMS)_[A-Z_]+\b/g)||[])])));try{done(JSON.parse(out));}catch{fail(Error('H1C_HELPER_RESPONSE_FAILED'));}});
  child.stdin.end(JSON.stringify({action,port:3330,schema:binding.schema,runtime:binding.runtime,user:'php2_test_admin',password:engine.password}));
 });
}
export async function provisionClassifiedWorkspace({publishLatest=true}={}) {
 const password=randomBytes(24).toString('hex'),directory=resolve('tmp/php-runtime/uath1c-'+Date.now());
 const binding=await provisionWorkspace({directory,password});
 const g=await extensionHelper(binding,'install');
 if(g.totalGuards!==103||g.extensionGuards!==15)throw Error('H1C_GUARD_COUNT_REJECTED');
 const proofPath=resolve(directory,'extension-guards.json');await atomicJson(proofPath,g);
 const envPath=resolve(directory,'test.env');
 await appendFile(envPath,'UPMS_LABOR_CLASSIFICATION_ENABLED=true\nUPMS_LABOR_EXTENSION_GUARD_EVIDENCE="'+proofPath.replaceAll('\\','/')+'"\n');
 const bindingPath=resolve(directory,'binding.json');await atomicJson(bindingPath,binding);
 if(publishLatest)await atomicJson('tmp/php-runtime/uath1c-latest.json',{...binding,bindingPath});
 return {binding,bindingPath,envPath,password};
}
