import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {provisionClassifiedWorkspace} from './uath1c-workspace.mjs';
import {atomicJson} from './uath1-workspace.mjs';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';

export async function chequeHelper(binding,action) {
 const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
 return new Promise((done,fail)=>{
  const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/cheque-local.php'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',()=>fail(Error('CHEQUE_HELPER_START_FAILED')));
  p.on('close',code=>{if(code)return fail(Error('CHEQUE_HELPER_FAILED '+JSON.stringify([...new Set((out+err).match(/\b(?:CHEQUE|SQLSTATE|ISOLATED|UPMS)_[A-Z_]+\b/g)||[])])));try{done(JSON.parse(out));}catch{fail(Error('CHEQUE_HELPER_RESPONSE_FAILED'));}});
  p.stdin.end(JSON.stringify({action,port:3330,schema:binding.schema,runtime:binding.runtime,user:'php2_test_admin',password:engine.password}));
 });
}
export async function provisionChequeWorkspace({writeSchemaHashes=false}={}) {
 await verifyUatEngine();
 const f=await provisionClassifiedWorkspace({publishLatest:false});
 for(const path of ['tmp/php-runtime/owner-uat-binding.json','tmp/php-runtime/uath1-owner-binding.json']) { const b=JSON.parse(await readFile(path,'utf8'));if(b.schema===f.binding.schema)throw Error('CHEQUE_OWNER_BINDING_COLLISION'); }
 const g=await chequeHelper(f.binding,'install');
 if(writeSchemaHashes)await writeFile('upms.php/resources/cheque-schema-hashes.json',JSON.stringify(g.schemaHashes,null,2)+'\n');
 delete g.schemaHashes;
 const proofPath=resolve(f.binding.directory,'cheque-guards.json');await atomicJson(proofPath,g);
 await appendFile(f.envPath,'UPMS_CHEQUE_MANAGEMENT_ENABLED=true\nUPMS_CHEQUE_GUARD_EVIDENCE="'+proofPath.replaceAll('\\','/')+'"\n');
 await chequeHelper(f.binding,'verify');
 return f;
}
