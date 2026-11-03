// Refresh old synthetic contracts before running the complete PHP/security suite.
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();const e=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const env={...process.env,PHP_TEST_ADMIN_PORT:'3330',PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:e.password};
async function run(name,exe,args,cwd=process.cwd()){const r=await new Promise((done,fail)=>{const p=spawn(exe,args,{cwd,env,windowsHide:true});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>out+=b);p.on('error',fail);p.on('close',code=>done({code,out}));});await writeFile('docs/uat-h1/evidence/'+name+'.log',r.out);if(r.code)throw Error(name+' failed; inspect synthetic evidence');console.log(name+' passed');}
await run('php-fixtures',process.execPath,['scripts/php-migration-fixtures.mjs']);
await run('php-reconciliation-contracts',process.execPath,['scripts/php-reconciliation-contracts.mjs']);
await run('php-full-suite',resolve('tmp/php-runtime/bin/php.exe'),['vendor/phpunit/phpunit/phpunit'],resolve('upms.php'));
