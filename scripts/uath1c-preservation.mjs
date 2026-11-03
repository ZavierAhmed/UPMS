// Read-only final comparison against the checkpoint taken before UAT-H1C work.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();const before=JSON.parse(await readFile('docs/uat-h1c/evidence/owner-before.json','utf8')),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex'),db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});
const after={},differences=[];
try {
 for(const name of ['owner-uat-binding','uath1-owner-binding']) {
  const bytes=await readFile('tmp/php-runtime/'+name+'.json'),binding=JSON.parse(bytes);assert.match(binding.schema,/^upms_test_php_money_\d+$/);
  const proof={schema:binding.schema,bindingHash:hash(bytes),tables:{}};
  const [tables]=await db.raw('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[binding.schema]);
  for(const {TABLE_NAME:table} of tables){if(['sessions','login_attempts'].includes(table))continue;const rows=(await db.withSchema(binding.schema).from(table)).map(r=>JSON.stringify(r)).sort();proof.tables[table]={rows:rows.length,hash:hash(rows.join('\n'))};}
  after[name]=proof;
  if(proof.schema!==before[name].schema||proof.bindingHash!==before[name].bindingHash)differences.push(name+': binding');
  for(const table of new Set([...Object.keys(before[name].tables),...Object.keys(proof.tables)])){if(JSON.stringify(before[name].tables[table])!==JSON.stringify(proof.tables[table]))differences.push(name+': '+table);}
 }
 const preservedFiles={};
 for(const name of ['consolidated.json','labor-integration.json','labor-oracle.json','uath1-base-contracts.json']){const same=hash(await readFile('docs/uat-h1/evidence/'+name))===hash(await readFile('tmp/php-runtime/uath1c-preserved/'+name));preservedFiles[name]=same;if(!same)differences.push('prior evidence: '+name);}
 await writeFile('docs/uat-h1c/evidence/owner-after.json',JSON.stringify(after,null,2));
 await writeFile('docs/uat-h1c/evidence/preservation.json',JSON.stringify({passed:differences.length===0,bindingsUnchanged:!differences.some(s=>s.endsWith(': binding')),allOriginalBusinessIdentityAndPermissionRowsUnchanged:!differences.some(s=>s.includes('binding:')),differences,preservedFiles,sessionsAndLoginAttemptsExcluded:true,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));
 assert.deepEqual(differences,[]);console.log(JSON.stringify({passed:true,bothBindingsUnchanged:true,allOriginalBusinessIdentityAndPermissionRowsUnchanged:true,priorEvidenceFilesPreserved:4}));
}finally{await db.destroy();}
