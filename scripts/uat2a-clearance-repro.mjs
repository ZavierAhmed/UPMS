import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionChequeWorkspace} from './uat2-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';
const f=await provisionChequeWorkspace();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:f.binding.schema,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});
let cookies={},csrf='';
async function call(method,path,body){const r=await phpBridge(f.envPath,{method,path:'/api/v1/management'+path,cookies,headers:method==='GET'?{}:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':randomUUID()},raw:method==='GET'?null:JSON.stringify(body)});r.body=JSON.parse(r.raw);Object.assign(cookies,r.cookies);if(r.body.csrfToken)csrf=r.body.csrfToken;return r;}
async function ok(method,path,body){const r=await call(method,path,body);assert.ok([200,201].includes(r.status),JSON.stringify(r.body));return r.body;}
const fingerprint=async()=>{const state={};for(const t of ['cheque_instruments','cheque_events','cheque_audit','cheque_clearances','v1_documents','v1_party_journal','money_batches','money_movements','money_audit','v1_commands','v1_audit'])state[t]=(await db(t)).map(row=>JSON.stringify(row)).sort();return createHash('sha256').update(JSON.stringify(state)).digest('hex');};
try{
await call('GET','/session/csrf');await ok('POST','/session/login',{username:'php-admin',password:f.password});f.password='';
const base='/simple-v1',date='2026-11-05',bank=(await ok('GET',base+'/money')).accounts.find(a=>a.type==='BANK');
await ok('POST',base+'/money/openings',{accountId:bank.id,date,amount:'0.00',reference:'UAT2A-BANK-OPEN',reason:'Synthetic independent bank opening evidence',approved:true});
const client=await ok('POST',base+'/parties',{kind:'CLIENT',name:'UAT2A synthetic client'});
const draft=await ok('POST',base+'/documents',{kind:'CLIENT_OPENING',date,partyId:client.id,amount:'50000.00',direction:'OWED_TO_COMPANY'});await ok('POST',base+'/documents/'+draft.id+'/post',{version:1});
const c=await ok('POST',base+'/cheques',{reference:'UAT2A-OWNER-REPRO',clientId:client.id,issuingBankId:'1',drawerName:'Synthetic drawer',drawerAccount:'UAT2AREPRO0001',number:'21222312312222',chequeDate:'2026-11-06',receivedDate:date,amount:'50000.00'});
const action={date,reference:'UAT2A-SYNTHETIC-EVIDENCE',reason:'Synthetic isolated bank clearance reproduction',evidence:'Synthetic bank statement acknowledgment evidence'};
await ok('POST',base+'/cheques/'+c.id+'/deposited',{...action,bankId:bank.id});
const before=await fingerprint(),r=await call('POST',base+'/cheques/'+c.id+'/cleared',{...action,approved:true,selfApprovalReason:'Synthetic administrator exceptional approval'});
assert.equal(await fingerprint(),before);assert.equal(r.status,409);
await mkdir('docs/uat-2a/evidence',{recursive:true});await writeFile('docs/uat-2a/evidence/clearance-reproduction.json',JSON.stringify({status:r.status,error:r.body.error,financialAndCommandRowsUnchanged:true,productionContacted:false,ownerDataMutated:false,verifiedUtc:new Date().toISOString()},null,2));
await writeFile('tmp/php-runtime/uat2a-repro.json',JSON.stringify({binding:f.binding,envPath:f.envPath,cookies,csrf,chequeId:c.id,bankId:bank.id,clientId:client.id}));
console.log(JSON.stringify({status:r.status,error:r.body.error,rowsUnchanged:true}));
}finally{f.password='';await db.destroy();}
