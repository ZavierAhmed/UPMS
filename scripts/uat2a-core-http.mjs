import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {phpBridge} from './uath1-preview.mjs';
const f=JSON.parse(await readFile('tmp/php-runtime/uat2a-repro.json','utf8'));
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:f.binding.schema,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});
let csrf=f.csrf,cookies=f.cookies;const checks=[];
async function call(method,path,body,key=randomUUID()){const r=await phpBridge(f.envPath,{method,path:'/api/v1/management'+path,cookies,headers:method==='GET'?{}:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':key},raw:method==='GET'?null:JSON.stringify(body)});r.body=JSON.parse(r.raw);Object.assign(cookies,r.cookies);if(r.body.csrfToken)csrf=r.body.csrfToken;return r;}
async function ok(method,path,body,key){const r=await call(method,'/simple-v1'+path,body,key);assert.ok([200,201].includes(r.status),JSON.stringify(r.body));return r.body;}
const fingerprint=async()=>{const state={};for(const t of ['cheque_instruments','cheque_events','cheque_audit','cheque_clearances','v1_documents','v1_party_journal','money_batches','money_movements','money_audit','v1_commands','v1_audit'])state[t]=(await db(t)).map(row=>JSON.stringify(row)).sort();return createHash('sha256').update(JSON.stringify(state)).digest('hex');};
try{
await call('GET','/session/csrf');
let before=await fingerprint();const readiness=await ok('GET','/cheques?readiness='+f.chequeId+'&date=2026-11-05');assert.equal(readiness.blocker.code,'CHEQUE_CLEARANCE_DATE_INVALID');assert.match(readiness.blocker.message,/November 6, 2026/);assert.equal(readiness.bankOpeningVerified,true);assert.equal(readiness.receivable,'50000.00');assert.equal(await fingerprint(),before);checks.push('Read-only readiness verifies dated bank opening, balance, approval and postdate blocker without financial mutation');
const identity={issuingBankId:'1',drawerAccount:'UAT2AREPRO0001',number:'00021222312312222'};
const duplicate=await ok('POST','/cheque-identity',identity);assert.equal(duplicate.available,false);assert.equal(duplicate.existingId,f.chequeId);assert.equal(await fingerprint(),before);
assert.equal((await ok('POST','/cheque-identity',{...identity,drawerAccount:'OTHERACCOUNT0001'})).available,true);
assert.equal((await ok('POST','/cheque-identity',{...identity,issuingBankId:'2'})).available,true);checks.push('Identity lookup normalizes leading zeros and respects distinct issuing banks and drawer accounts');
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi'}).format(new Date());
const body={clientId:f.clientId,issuingBankId:'1',drawerName:'Synthetic drawer',drawerAccount:'UAT2AUNIQUE0001',number:'0004567',chequeDate:today,receivedDate:today,amount:'50000.00'};
const key=randomUUID(),c=await ok('POST','/cheques',body,key);assert.deepEqual(await ok('POST','/cheques',body,key),c);
const report=await ok('GET','/cheques?id='+c.id),record=report.records[0];assert.match(record.reference,/^4567-UAT2A-SYNTHETIC-CLIENT-50000-00-[A-F0-9]{32}$/);assert.equal(record.client.name,'UAT2A synthetic client');
const second=await ok('POST','/cheques',{...body,drawerAccount:'UAT2AUNIQUE0002'});assert.notEqual((await ok('GET','/cheques?id='+second.id)).records[0].reference,record.reference);checks.push('Server reference includes normalized cheque/client/amount and independent random suffix across accounts; same-key retry preserves original receipt');
before=await fingerprint();const dup=await call('POST','/simple-v1/cheques',body);assert.equal(dup.status,409);assert.equal(await fingerprint(),before);checks.push('Authoritative duplicate registration rolls back every business row');
const action={date:today,reference:'UAT2A-VALID-BANK-REF',reason:'Synthetic complete bank clearance reviewed',evidence:'Synthetic verified bank statement evidence'};
await ok('POST','/cheques/'+c.id+'/deposited',{...action,bankId:f.bankId});
before=await fingerprint();const denied=await call('POST','/simple-v1/cheques/'+c.id+'/cleared',{...action,approved:true});assert.equal(denied.status,403);assert.match(denied.body.error.message,/justification/);assert.ok(denied.body.error.reference);assert.equal(await fingerprint(),before);checks.push('Missing exceptional justification produces safe explicit 403 and request reference with full rollback');
const ready=await ok('GET','/cheques?readiness='+c.id+'&date='+today);assert.equal(ready.blocker,null);
const clearKey=randomUUID(),clear={...action,approved:true,selfApprovalReason:'Synthetic independent exceptional approval'};const cleared=await ok('POST','/cheques/'+c.id+'/cleared',clear,clearKey);assert.deepEqual(await ok('POST','/cheques/'+c.id+'/cleared',clear,clearKey),cleared);
assert.equal((await db('cheque_clearances').where({cheque_id:c.id})).length,1);assert.equal((await db('v1_party_journal').where({party_id:f.clientId}).sum({n:db.raw('debit-credit')}).first()).n,'0.00');assert.equal((await db('money_movements').where({account_id:f.bankId}).sum({n:'delta'}).first()).n,'50000.00');checks.push('Valid clearance creates exactly one canonical customer and bank credit; identical retry returns original receipt');
await writeFile('docs/uat-2a/evidence/core-http.json',JSON.stringify({passed:true,checks,productionContacted:false,ownerDataMutated:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{await db.destroy();}
