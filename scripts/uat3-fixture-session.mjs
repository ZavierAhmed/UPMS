import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const fixture=JSON.parse(await readFile('tmp/php-runtime/uat2a-extras.json','utf8'));
const created=await new Promise((done,fail)=>{
 const child=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/uat3-session.php'],{windowsHide:true,env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('UPMS_'))),stdio:['pipe','pipe','pipe']});let out='';
 child.stdout.on('data',b=>out+=b);child.stderr.on('data',()=>{});child.on('error',()=>fail(Error('Synthetic session factory failed')));child.on('close',code=>{if(code)return fail(Error('Synthetic session factory rejected target'));try{done(JSON.parse(out));}catch{fail(Error('Synthetic session response invalid'));}});child.stdin.end(JSON.stringify({binding:fixture.binding,envPath:fixture.envPath}));
});
const path='tmp/php-runtime/uat2a-extras-session.json',session=JSON.parse(await readFile(path,'utf8'));
await writeFile(path,JSON.stringify({...session,cookies:{'__Host-upms-php':created.token},csrf:created.csrfToken}));
console.log('Renewed isolated UI-test session; owner accounts and all password hashes unchanged');
