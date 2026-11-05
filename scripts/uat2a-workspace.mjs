import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {provisionChequeWorkspace} from './uat2-workspace.mjs';
import {atomicJson} from './uath1-workspace.mjs';

export async function extrasHelper(fixture,action) {
 const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
 return new Promise((done,fail)=>{
  const child=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/uat2a-local.php'],{windowsHide:true,env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('UPMS_'))),stdio:['pipe','pipe','pipe']});
  let out='',errors='';
  child.stdout.on('data',chunk=>out+=chunk);child.stderr.on('data',chunk=>errors+=chunk);
  child.on('error',()=>fail(Error('UAT2A_HELPER_START_FAILED')));
  child.on('close',code=>{if(code)return fail(Error('UAT2A_HELPER_FAILED '+JSON.stringify([...new Set(errors.match(/\b(?:CHEQUE|UAT2A|SQLSTATE|UPMS)_[A-Z_]+\b/g)||[])])));try{done(JSON.parse(out));}catch{fail(Error('UAT2A_HELPER_RESPONSE_FAILED'));}});
  child.stdin.end(JSON.stringify({action,binding:fixture.binding,envPath:fixture.envPath,password:engine.password}));
 });
}
export async function provisionExtrasWorkspace() {
 const fixture=await provisionChequeWorkspace();
 const result=await extrasHelper(fixture,'install');
 await writeFile('upms.php/resources/cheque-extra-schema-hashes.json',JSON.stringify(result.schemaHashes,null,2)+'\n');
 const proof=await extrasHelper(fixture,'verify');
 await atomicJson(resolve(fixture.binding.directory,'cheque-guards.json'),proof);
 await appendFile(fixture.envPath,'UPMS_CHEQUE_EXTRAS_ENABLED=true\nUPMS_CHEQUE_ATTACHMENT_PDFINFO="C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdfinfo.exe"\n');
 return fixture;
}
