import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const php=process.env.PHP8_BINARY||resolve('tmp/php-runtime/bin/php.exe'),extra=JSON.parse(process.env.PHP8_ARGS||'[]'),dir=resolve('tmp/php-runtime/php8-manual-probes-'+Date.now());await mkdir(dir);
function run(file,args=[]){return new Promise((done,reject)=>{const p=spawn(php,[...extra,file,...args],{windowsHide:true});let out='';p.stdout.on('data',b=>out+=b);p.on('error',reject);p.on('close',code=>{try{done({code,data:JSON.parse(out)});}catch{reject(Error('Invalid probe output'));}});});}
let checks=0;const check=(v,x)=>{assert.deepEqual(v,x);checks++;};
let r=await run('deployment/manual/hosting-capabilities.php');check(r.code,0);check(r.data.databaseAccess,false);check(r.data.processProbe,'NOT RUN');check(r.data.filesystemProbe,'NOT RUN');
r=await run('deployment/manual/hosting-capabilities.php',['--process-probe','--filesystem-probe','--scratch-dir='+dir]);check(r.data.processProbe,'PASS');check(r.data.filesystemProbe.exclusiveCreate,true);check(r.data.filesystemProbe.lock,true);check(r.data.filesystemProbe.rename,true);check(r.data.filesystemProbe.persistence,true);check(await readdir(dir),[]);
await writeFile(dir+'/sentinel','preserve');r=await run('deployment/manual/hosting-capabilities.php',['--filesystem-probe','--scratch-dir='+dir]);check(typeof r.data.filesystemProbe,'string');check(await readFile(dir+'/sentinel','utf8'),'preserve');
for(const args of [[],['--host=127.0.0.1','--port=465','--mode=implicit'],['--host=example.invalid','--port=25','--mode=starttls'],['--host=example.invalid','--port=465','--mode=starttls']]){r=await run('deployment/manual/smtp-tls.php',args);check(r.code,1);check(r.data.messagesSent,0);check(r.data.code,'EXPLICIT_APPROVED_SMTP_TARGET_REQUIRED');}
const result={passed:true,checks,php,productionContacted:false,realSmtpContacted:false,tlsSuccessPath:'NOT VERIFIED by this metadata/negative-path test'};await writeFile(dir+'/evidence.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
