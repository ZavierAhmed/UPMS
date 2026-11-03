// Final isolated browser state, genuine encrypted recovery; no production connection.
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const setup=JSON.parse(await readFile('tmp/php-runtime/uath1-latest.json','utf8')),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
assert.match(setup.schema,/^upms_test_php_money_[0-9]+$/);
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password}});
function helper(action,extra={},schema=setup.schema){return new Promise((done,fail)=>{const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/labor-local.php'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',()=>{});p.on('error',fail);p.on('close',code=>{if(code)return fail(Error('ISOLATED_FINAL_RECOVERY_FAILED:'+action));try{done(JSON.parse(out));}catch{fail(Error('ISOLATED_RECOVERY_INVALID_RESPONSE'));}});p.stdin.end(JSON.stringify({action,port:3330,schema,runtime:setup.runtime,user:'php2_test_admin',password:engine.password,...extra}));});}
try{
 const proof=await helper('verify'),snapshot=await helper('snapshot');
 await writeFile(setup.directory+'/labor-final-snapshot.json',JSON.stringify(snapshot));
 const target='upms_test_php_money_'+Date.now()+'998_restore';
 await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[target]);
 const restored=await helper('restore',{cipher:snapshot.cipher,keyPair:snapshot.keyPair},target);
 assert.equal(restored.passed,true);assert.equal(restored.tables,34);assert.equal(restored.guards.totalGuards,88);assert.equal(restored.reconciliation.matched,true);
 await writeFile('docs/uat-h1/evidence/final-recovery.json',JSON.stringify({passed:true,sourceSchema:setup.schema,restoreSchema:target,format:snapshot.format,proof,restored,negativeTests:snapshot.negativeTests,archivePrivate:true,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));
 console.log(JSON.stringify({passed:true,tables:34,guards:88,rows:restored.rows}));
}finally{await db.destroy();}
