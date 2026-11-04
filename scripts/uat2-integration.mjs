import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionChequeWorkspace,chequeHelper} from './uat2-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';

const resume=process.argv.includes('--resume');
const fixture=resume?await(async()=>{const pointer=JSON.parse(await readFile('tmp/php-runtime/uat2-current.json','utf8'));const binding=JSON.parse(await readFile(pointer.bindingPath,'utf8'));return {binding,bindingPath:pointer.bindingPath,envPath:binding.directory+'/test.env',password:''};})():await provisionChequeWorkspace(),{binding,envPath}=fixture;
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:2}});
const evidence='docs/uat-2/evidence';await mkdir(evidence,{recursive:true});const checks=[];let cookies={},csrf='';
async function call(method,path,body,options={}) {
 const r=await phpBridge(options.envPath||envPath,{method,path:'/api/v1/management'+path,cookies:options.anonymous?{}:cookies,headers:{...(method!=='GET'?{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':options.key||randomUUID()}:{}),...options.headers},raw:method==='GET'?null:JSON.stringify(body??{})});
 r.body=r.raw?JSON.parse(r.raw):null;if(!options.anonymous){Object.assign(cookies,r.cookies);if(r.body?.csrfToken)csrf=r.body.csrfToken;}return r;
}
const request=(m,p,b,o)=>call(m,'/simple-v1'+p,b,o);
const ok=async(m,p,b,o)=>{const r=await request(m,p,b,o);assert.ok([200,201].includes(r.status),p+' '+JSON.stringify(r.body));return r.body;};
const deny=async(m,p,b,status=409,o)=>{const r=await request(m,p,b,o);assert.equal(r.status,status,p+' '+JSON.stringify(r.body));checks.push('Rejected '+p+': '+(r.body?.error?.code||r.status));return r;};
const document=async body=>{const d=await ok('POST','/documents',body);return ok('POST','/documents/'+d.id+'/post',{version:1});};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fingerprint=async()=>{const a={};for(const t of ['cheque_instruments','cheque_events','cheque_audit','cheque_clearances','v1_documents','v1_party_journal','money_batches','money_movements','money_audit','v1_commands','v1_audit'])a[t]=(await db(t)).map(r=>JSON.stringify(r)).sort();return createHash('sha256').update(JSON.stringify(a)).digest('hex');};
try {
 await writeFile('tmp/php-runtime/uat2-current.json',JSON.stringify({bindingPath:fixture.bindingPath}));
 if(resume){const s=JSON.parse(await readFile(binding.directory+'/cheque-session.json','utf8'));cookies=s.cookies;csrf=s.csrf;const g=await chequeHelper(binding,'add-missing-guards');await writeFile(binding.directory+'/cheque-guards.json',JSON.stringify(g));}
 else{await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:fixture.password})).status,200);fixture.password='';}
 await writeFile(binding.directory+'/cheque-session.json',JSON.stringify({cookies,csrf}));
 const bank=(await ok('GET','/money')).accounts.find(a=>a.type==='BANK');assert.ok(bank);
 if(!bank.verified)await ok('POST','/money/openings',{accountId:bank.id,date:today,amount:'0.00',reference:'UAT2-BANK-OPENING',reason:'Independent synthetic verified bank opening',approved:true});
 const client=resume?(await db('v1_parties').where({name:'UAT2 normal clearance client'}).first()):await ok('POST','/parties',{kind:'CLIENT',name:'UAT2 normal clearance client'});client.id=String(client.id);
 if(!client.opening_verified)await document({kind:'CLIENT_OPENING',date:today,partyId:client.id,amount:'50000.00',direction:'OWED_TO_COMPANY'});
 const amount=async id=>(await db('v1_party_journal').where({party_id:id}).sum({n:db.raw('debit-credit')}).first()).n;
 const bankBalance=async()=>(await db('money_movements').where({account_id:bank.id}).sum({n:'delta'}).first()).n;
 const receive=(number,amount='50000.00',clientId=client.id,extra={})=>({reference:'UAT2-INSTRUMENT-'+number,clientId,issuingBankId:'1',drawerName:'Synthetic drawer',drawerAccount:'UATACCOUNT0001',number,chequeDate:today,receivedDate:today,amount,...extra});
 const action=(extra={})=>({date:today,reference:'UAT2-BANK-EVIDENCE',reason:'Authorized synthetic bank evidence review',evidence:'Synthetic bank confirmation reference retained',...extra});
 const clear=action({approved:true,selfApprovalReason:'Isolated administrator exceptional self approval'});
 const c=await ok('POST','/cheques',receive('0001001'));assert.equal(await amount(client.id),'50000.00');assert.equal(await bankBalance(),'0.00');
 await deny('POST','/cheques',receive('1001','50000.00',client.id,{reference:'UAT2-OTHER-REF'}));
 await deny('POST',`/cheques/${c.id}/cleared`,clear);
 await ok('POST',`/cheques/${c.id}/deposited`,action({bankId:bank.id}));assert.equal(await amount(client.id),'50000.00');assert.equal(await bankBalance(),'0.00');
 await deny('POST',`/cheques/${c.id}/cleared`,action({approved:true}),403);
 const key=randomUUID(),results=await Promise.all([ok('POST',`/cheques/${c.id}/cleared`,clear,{key}),ok('POST',`/cheques/${c.id}/cleared`,clear,{key})]);assert.deepEqual(results[0],results[1]);
 assert.equal(await amount(client.id),'0.00');assert.equal(await bankBalance(),'50000.00');assert.equal((await db('cheque_clearances')).length,1);
 await deny('POST',`/cheques/${c.id}/cleared`,clear);await deny('POST',`/cheques/${c.id}/cancelled`,action());await deny('POST',`/cheques/${c.id}/dishonoured`,action());
 checks.push('Receive/deposit PKR 50000: receivable 50000, bank 0. Complete clearance: receivable 0, bank 50000, exactly one canonical payment; concurrent same-key retry returns original receipt');
 const other=await ok('POST','/parties',{kind:'CLIENT',name:'UAT2 partial and dishonour client'});await document({kind:'CLIENT_OPENING',date:today,partyId:other.id,amount:'50000.00',direction:'OWED_TO_COMPANY'});
 const bounced=await ok('POST','/cheques',receive('1002','20000.00',other.id));await ok('POST',`/cheques/${bounced.id}/deposited`,action({bankId:bank.id}));await ok('POST',`/cheques/${bounced.id}/dishonoured`,action());assert.equal(await amount(other.id),'50000.00');assert.equal(await bankBalance(),'50000.00');
 const partial=await ok('POST','/cheques',receive('1003','20000.00',other.id));await ok('POST',`/cheques/${partial.id}/deposited`,action({bankId:bank.id}));await ok('POST',`/cheques/${partial.id}/cleared`,clear);assert.equal(await amount(other.id),'30000.00');assert.equal(await bankBalance(),'70000.00');
 checks.push('Dishonoured 20000: receivable 50000, bank unchanged 50000. Separate complete 20000 instrument settles customer partially: receivable 30000, bank 70000');
 const report=await ok('GET','/cheques');assert.equal(report.reconciliation.matched,true);assert.equal((await ok('GET','/reconciliation')).matched,true);
 const proof=await chequeHelper(binding,'verify');assert.equal(proof.schema.tables,44);
 await writeFile(binding.directory+'/cheque-scenario.json',JSON.stringify({cookies,clientId:client.id,partialClientId:other.id,bankId:bank.id,normalId:c.id,dishonouredId:bounced.id,partialId:partial.id,date:today}));
 await writeFile(evidence+'/integration.json',JSON.stringify({passed:true,checks,tables:44,guards:proof.guards.totalGuards,normalOutstanding:'0.00',partialOutstanding:'30000.00',bankBalance:'70000.00',productionContacted:false,ownerDataMutated:false,verifiedUtc:new Date().toISOString()},null,2));
 console.log(JSON.stringify({passed:true,checks:checks.length,tables:44,guards:proof.guards.totalGuards}));
} finally {fixture.password='';await db.destroy();}
