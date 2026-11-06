import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const env={...process.env,PHP_TEST_ADMIN_PORT:'3330',PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:engine.password};
await mkdir('docs/phase-4.1b/evidence/php',{recursive:true});
const results=[];
for(const [name,exe,args,cwd] of [
 ['fresh-contract-fixtures',process.execPath,['scripts/php-migration-fixtures.mjs'],process.cwd()],
 ['reconciliation-contracts',process.execPath,['scripts/php-reconciliation-contracts.mjs'],process.cwd()],
 ['php-full-suite',resolve('tmp/php-runtime/bin/php.exe'),['vendor/phpunit/phpunit/phpunit','--log-junit',resolve('docs/phase-4.1b/evidence/php/junit.xml')],resolve('upms.php')],
]){
 const result=await new Promise((done,fail)=>{const p=spawn(exe,args,{cwd,env,windowsHide:true});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',fail);p.on('close',code=>done({name,code,output}));});
 await writeFile('docs/phase-4.1b/evidence/php/'+name+'.log',result.output);results.push({name,exitCode:result.code});
 await writeFile('docs/phase-4.1b/evidence/php/results.json',JSON.stringify(results,null,2)+'\n');
 if(result.code)throw Error(name+' failed; inspect the local synthetic log');console.log(name+' passed');
}
