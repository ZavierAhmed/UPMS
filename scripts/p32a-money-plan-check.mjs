// Offline integrity/reproducibility check. Does not execute generated SQL.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const out=resolve('tmp/php-runtime/money-plan-check-'+randomUUID());
await new Promise((done,fail)=>{const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['deployment/money-accounts/plan.php','--output='+out],{windowsHide:true,stdio:['ignore','pipe','pipe']});let error='';p.stderr.on('data',b=>error+=b);p.on('error',fail);p.on('close',c=>c===0?done():fail(Error('Offline plan failed: '+error)));});
const base='deployment/money-accounts/review-plan',manifest=JSON.parse(await readFile(base+'/manifest.json','utf8')),fresh=JSON.parse(await readFile(out+'/manifest.json','utf8'));assert.deepEqual(fresh,manifest);assert.equal(manifest.status,'NOT_APPROVED_NOT_APPLIED');
for(const [file,hash] of Object.entries(manifest.files)){for(const dir of [base,out]){const bytes=await readFile(dir+'/'+file);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);assert.equal(/\r\n/.test(bytes.toString()),false);assert.equal(/^\s*(?:GRANT|DROP|ALTER|DELETE|UPDATE|CREATE USER)\b/im.test(bytes.toString()),false);}}
const schema=await readFile(base+'/01-schema.sql','utf8'),masters=await readFile(base+'/02-master-config.sql','utf8'),guards=await readFile(base+'/03-additional-guards.sql','utf8');assert.equal((schema.match(/CREATE TABLE/g)||[]).length,5);assert.equal((masters.match(/INSERT INTO money_accounts/g)||[]).length,4);assert.equal((guards.match(/CREATE DEFINER/g)||[]).length,15);assert.equal(/^\s*INSERT INTO money_(?:batches|movements|audit)/im.test(schema+masters+guards),false);
const result={passed:true,reproducible:true,status:manifest.status,files:4,tablesAdded:5,masters:4,guardsAdded:15,moneyPlanHash:manifest.moneyPlanHash,baseGuardHash:manifest.baseGuardHash,additionalGuardHash:manifest.additionalGuardHash,sqlExecuted:false,grantsEmitted:false,financialOpeningsEmitted:false};await mkdir('docs/phase-3.2a/evidence',{recursive:true});await writeFile('docs/phase-3.2a/evidence/migration-plan.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
