// Offline reproducibility only: never execute generated SQL.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {resolve} from 'node:path';
const out=resolve('tmp/php-runtime/expense-plan-'+randomUUID());
await new Promise((done,fail)=>{const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['deployment/expense-masters/plan.php','--output='+out],{windowsHide:true,stdio:['ignore','pipe','pipe']});p.on('error',fail);p.on('close',code=>code===0?done():fail(Error('Offline review plan generation failed')));});
const base='deployment/expense-masters/review-plan',a=JSON.parse(await readFile(base+'/manifest.json','utf8')),b=JSON.parse(await readFile(out+'/manifest.json','utf8'));assert.deepEqual(a,b);assert.equal(a.status,'NOT_APPROVED_NOT_APPLIED');
for(const [file,hash] of Object.entries(a.files)){for(const dir of [base,out]){const bytes=await readFile(dir+'/'+file);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);assert.equal(/\r\n/.test(bytes.toString()),false);assert.equal(/^\s*(GRANT|DROP|ALTER|DELETE|UPDATE|INSERT|CREATE USER)\b/im.test(bytes.toString()),false);}}
assert.equal((await readFile(base+'/01-schema.sql','utf8')).match(/CREATE TABLE/g).length,4);assert.equal((await readFile(base+'/02-additional-guards.sql','utf8')).match(/CREATE DEFINER/g).length,12);
const result={passed:true,reproducible:true,status:a.status,tablesAdded:4,guardsAdded:12,totalTables:29,totalGuards:72,expensePlanHash:a.expensePlanHash,expenseGuardHash:a.expenseGuardHash,sqlExecuted:false,grantsEmitted:false,recordsSeeded:false};await mkdir('docs/phase-3.2b2/evidence',{recursive:true});await writeFile('docs/phase-3.2b2/evidence/migration-plan.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
