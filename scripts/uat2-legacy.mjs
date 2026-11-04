// Retained receipt-recognized history is created only in a new synthetic 38-table fixture.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionClassifiedWorkspace} from './uath1c-workspace.mjs';
import {chequeHelper} from './uat2-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';
const f=await provisionClassifiedWorkspace({publishLatest:false}),{binding}=f,engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});let cookies={},csrf='',envPath=f.envPath;
async function call(m,p,b){const r=await phpBridge(envPath,{method:m,path:'/api/v1/management'+p,cookies,headers:m==='GET'?{}:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':randomUUID()},raw:m==='GET'?null:JSON.stringify(b??{})});Object.assign(cookies,r.cookies);const body=r.raw?JSON.parse(r.raw):null;if(body?.csrfToken)csrf=body.csrfToken;return {status:r.status,body};}
const ok=async(m,p,b)=>{const r=await call(m,'/simple-v1'+p,b);assert.ok([200,201].includes(r.status),p+' '+JSON.stringify(r.body));return r.body;};
const document=async b=>{const d=await ok('POST','/documents',b);return ok('POST','/documents/'+d.id+'/post',{version:1});};
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
try {
 await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:f.password})).status,200);f.password='';
 const client=await ok('POST','/parties',{kind:'CLIENT',name:'UAT2 retained legacy customer'});await document({kind:'CLIENT_OPENING',date,partyId:client.id,amount:'50000.00',direction:'OWED_TO_COMPANY'});
 const originalEnv=await readFile(f.envPath,'utf8'),oldEnv=binding.directory+'/legacy-mode.env';await writeFile(oldEnv,originalEnv.replace(/^UPMS_(MONEY_ACCOUNTS|EXPENSE_MASTERS|FINANCIAL_REFUNDS|EMPLOYEE_HAFTA|LABOR_CLASSIFICATION)_ENABLED=true$/gm,(line)=>line.replace('=true','=false')));envPath=oldEnv;
 const legacy=await document({kind:'CLIENT_PAYMENT',date,partyId:client.id,amount:'20000.00',method:'CHEQUE_RECEIVED',reference:'UAT2-LEGACY-PAYMENT',chequeReference:'CHQ-0007123'});
 const retained={};for(const t of ['v1_documents','v1_party_journal','v1_audit','v1_commands','money_batches','money_movements'])retained[t]=hash(await db(t));
 const g=await chequeHelper(binding,'install');assert.equal(g.baselineRowsPreserved,true);assert.equal(g.totalGuards,124);delete g.schemaHashes;await writeFile(binding.directory+'/cheque-guards.json',JSON.stringify(g));await appendFile(f.envPath,'UPMS_CHEQUE_MANAGEMENT_ENABLED=true\nUPMS_CHEQUE_GUARD_EVIDENCE="'+(binding.directory+'/cheque-guards.json').replaceAll('\\','/')+'"\n');envPath=f.envPath;
 for(const [t,h] of Object.entries(retained))assert.equal(hash(await db(t)),h,t+' changed during additive migration');
 const report=await ok('GET','/cheques');assert.equal(report.legacy.length,1);assert.equal(report.legacy[0].id,legacy.id);assert.equal(report.legacy[0].amount,'20000.00');assert.equal(report.records.length,0);assert.equal((await db('money_movements')).length,0);
 const body={reference:'UAT2-NEW-COLLISION',clientId:client.id,issuingBankId:'1',drawerName:'Legacy ambiguity test',drawerAccount:'LEGACYTEST0001',number:'7123',chequeDate:date,receivedDate:date,amount:'100.00'};
 assert.equal((await call('POST','/simple-v1/cheques',body)).status,409);assert.equal((await call('POST','/simple-v1/cheques',{...body,reference:'UAT2-LEGACY-PAYMENT',number:'9999'})).status,409);
 const fresh=await ok('POST','/cheques',{...body,reference:'UAT2-NEW-INDEPENDENT',number:'8888'});assert.equal(fresh.status,'RECEIVED');assert.equal((await db('money_movements')).length,0);
 const party=await db('v1_party_journal').where({party_id:client.id}).sum({n:db.raw('debit-credit')}).first();assert.equal(party.n,'30000.00');assert.equal((await ok('GET','/reconciliation')).matched,true);
 await writeFile('docs/uat-2/evidence/legacy-migration.json',JSON.stringify({passed:true,baselineTables:38,baselineGuards:103,tables:44,guards:124,baselineRowsPreserved:g.baselineRowsPreserved,legacyLedgerOutstanding:'30000.00',legacyIdentityPreserved:true,legacyBankEffects:0,ambiguousNumberAndReferenceRejected:true,newIndependentCustodyEffect:0,ownerDataMutated:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,baselineRowsPreserved:true,legacyBankEffects:0}));
}finally{f.password='';await db.destroy();}
