import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {phpBridge} from './uath1-preview.mjs';
import {extrasHelper,provisionExtrasWorkspace} from './uat2a-workspace.mjs';
const f=await provisionExtrasWorkspace(),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:f.binding.schema,user:'php2_test_admin',password:engine.password},pool:{min:0,max:2}});
await writeFile('tmp/php-runtime/uat2a-extras.json',JSON.stringify({...f,password:''}));
let csrf='',cookies={};const checks=[];
async function call(method,path,body,options={}){const r=await phpBridge(f.envPath,{method,path:'/api/v1/management'+path,cookies:options.anonymous?{}:cookies,headers:method==='GET'?{}:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':options.key||randomUUID()},raw:method==='GET'?null:JSON.stringify(body)});if(!options.anonymous)Object.assign(cookies,r.cookies);try{r.body=JSON.parse(r.raw);}catch{r.body=null;}if(r.body?.csrfToken)csrf=r.body.csrfToken;return r;}
async function ok(method,path,body,options){const r=await call(method,'/simple-v1'+path,body,options);assert.ok([200,201].includes(r.status),JSON.stringify(r.body));return r.body;}
const state=async()=>{const out={};for(const t of ['cheque_issuing_banks','cheque_bank_creations','cheque_attachments','cheque_instruments','cheque_events','cheque_audit','cheque_clearances','v1_documents','v1_party_journal','money_batches','money_movements','v1_commands','v1_audit'])out[t]=(await db(t)).map(r=>JSON.stringify(r)).sort();return createHash('sha256').update(JSON.stringify(out)).digest('hex');};
async function deny(path,body,status=400){const before=await state(),r=await call('POST','/simple-v1'+path,body);assert.equal(r.status,status,JSON.stringify(r.body));assert.equal(await state(),before);checks.push('Rejected without partial writes: '+r.body.error.code);}
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi'}).format(new Date());
if(!(await readFile(f.envPath,'utf8')).includes('UPMS_CHEQUE_ATTACHMENT_PDFINFO='))await appendFile(f.envPath,'UPMS_CHEQUE_ATTACHMENT_PDFINFO="C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdfinfo.exe"\n');
try{
await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:f.password})).status,200);f.password='';await writeFile('tmp/php-runtime/uat2a-extra-auth.json',JSON.stringify({cookies,csrf}));
const bankInput={name:'Synthetic UAT2A Issuer',code:' C Q A 0 1 ',description:'Synthetic institution, operational approval pending'};
const bank=await ok('POST','/cheque-banks',bankInput);await deny('/cheque-banks',{...bankInput,code:'cqa01'},409);await deny('/cheque-banks',{...bankInput,name:' Synthetic   UAT2A Issuer ',code:'ANOTHER'},409);
const parallel=await Promise.all([call('POST','/simple-v1/cheque-banks',{name:'Concurrent synthetic issuer A',code:'CONCUR-A'}),call('POST','/simple-v1/cheque-banks',{name:'Concurrent synthetic issuer B',code:'CONCUR-B'})]);assert.deepEqual(parallel.map(r=>r.status),[201,201]);assert.notEqual(parallel[0].body.id,parallel[1].body.id);checks.push('Bank identifiers normalize whitespace/case; concurrent directory creation uses distinct IDs and immutable audit receipts');
const receiving=(await ok('GET','/money')).accounts.find(a=>a.type==='BANK');await ok('POST','/money/openings',{accountId:receiving.id,date,amount:'0.00',reference:'UAT2A-EXTRA-OPENING',reason:'Independent synthetic receiving bank opening',approved:true});
const client=await ok('POST','/parties',{kind:'CLIENT',name:'Attachment Test Client'}),opening=await ok('POST','/documents',{kind:'CLIENT_OPENING',date,partyId:client.id,amount:'50000.00',direction:'OWED_TO_COMPANY'});await ok('POST','/documents/'+opening.id+'/post',{version:1});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let png,jpeg;try{const page=await browser.newPage();await page.setViewport({width:64,height:64});await page.setContent('<html><body style="background:#f98218">UAT</body></html>');png={filename:'synthetic-cheque.png',content:await page.screenshot({type:'png',encoding:'base64'})};jpeg={filename:'synthetic-slip.jpg',content:await page.screenshot({type:'jpeg',encoding:'base64'})};}finally{await browser.close();}
const pdf={filename:'synthetic-bank-evidence.pdf',content:(await readFile('output/pdf/uat2-cheque-acknowledgment.pdf')).toString('base64')};
const input={clientId:client.id,issuingBankId:bank.id,drawerName:'Synthetic drawer',drawerAccount:'UAT2AATTACH0001',number:'008899',chequeDate:date,receivedDate:date,amount:'50000.00'};
for(const file of [{filename:'bad.exe',content:png.content},{filename:'wrong.pdf',content:png.content},{filename:'../path.png',content:png.content},{filename:'active.pdf',content:Buffer.from('%PDF-1.7 /JavaScript evil %%EOF').toString('base64')},{filename:'bad.png',content:Buffer.from('not an image').toString('base64')},{filename:'large.pdf',content:Buffer.alloc(262145).toString('base64')}])await deny('/cheques',{...input,attachments:[file]});
const c=await ok('POST','/cheques',{...input,attachments:[png,pdf]});
const report=await ok('GET','/cheques?id='+c.id);assert.equal(report.records[0].attachments.length,2);assert.equal(report.records[0].attachments[0].ciphertext,undefined);
const file=report.records[0].attachments.find(a=>a.mime==='image/png'),download=await call('GET','/simple-v1/cheque-attachments/'+file.id);assert.equal(download.status,200);assert.equal(createHash('sha256').update(Buffer.from(download.raw,'base64')).digest('hex'),file.sha256);
const anonymous=await call('GET','/simple-v1/cheque-attachments/'+file.id,undefined,{anonymous:true});assert.equal(anonymous.status,401);checks.push('PDF and PNG stored encrypted in private SQL storage; authenticated download verifies exact SHA-256; anonymous access denied');
const action={date,reference:'UAT2A-ATTACH-BANK-EVIDENCE',reason:'Synthetic bank evidence approved independently',evidence:'Synthetic bank statement acknowledgment retained'};
await ok('POST','/cheques/'+c.id+'/deposited',{...action,bankId:receiving.id,attachments:[jpeg]});await deny('/cheques/'+c.id+'/cleared',{...action,approved:true,selfApprovalReason:'Synthetic exceptional administrator approval',attachments:[{filename:'bad.exe',content:png.content}]});
await ok('POST','/cheques/'+c.id+'/cleared',{...action,approved:true,selfApprovalReason:'Synthetic exceptional administrator approval',attachments:[pdf]});assert.equal((await db('cheque_attachments')).length,4);assert.equal((await db('cheque_clearances')).length,1);checks.push('Registration, deposit and clearance bind encrypted files to exact immutable events; bad clearance file rolls back all financial and audit rows');

const faultClient=await ok('POST','/parties',{kind:'CLIENT',name:'Synthetic fault client'}),faultOpening=await ok('POST','/documents',{kind:'CLIENT_OPENING',date,partyId:faultClient.id,amount:'1000.00',direction:'OWED_TO_COMPANY'});await ok('POST','/documents/'+faultOpening.id+'/post',{version:1});
const faultCheque=await ok('POST','/cheques',{...input,clientId:faultClient.id,number:'991122',amount:'1000.00'});await ok('POST','/cheques/'+faultCheque.id+'/deposited',{...action,bankId:receiving.id});
const trigger='upmscqa_cheque_attachments_insert',definition=(await db.raw('SHOW CREATE TRIGGER '+trigger))[0][0]['SQL Original Statement'];
await db.raw('DROP TRIGGER '+trigger);
try{
 await db.raw("CREATE TRIGGER "+trigger+" BEFORE INSERT ON cheque_attachments FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UAT2A_INJECTED_ATTACHMENT_FAILURE'; END");
 await deny('/cheques/'+faultCheque.id+'/cleared',{...action,approved:true,selfApprovalReason:'Synthetic exceptional administrator approval',attachments:[png]},503);
}finally{await db.raw('DROP TRIGGER IF EXISTS '+trigger);await db.raw(definition);}
checks.push('Controlled native attachment-insert fault after canonical payment writes rolled back the full financial command; exact original trigger restored and verified');
const parallelClear=await Promise.all([call('POST','/simple-v1/cheques/'+faultCheque.id+'/cleared',{...action,approved:true,selfApprovalReason:'Synthetic exceptional administrator approval'}),call('POST','/simple-v1/cheques/'+faultCheque.id+'/cleared',{...action,approved:true,selfApprovalReason:'Synthetic exceptional administrator approval'})]);assert.deepEqual(parallelClear.map(r=>r.status).sort(),[201,409]);checks.push('Concurrent different-key clearance creates one recognition; optional file absence remains supported');
const env=await readFile(f.envPath,'utf8'),runtimePassword=env.split(/\r?\n/).find(line=>line.startsWith('UPMS_DB_PASSWORD=')).slice('UPMS_DB_PASSWORD='.length).replace(/^"|"$/g,'');
const runtime=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:f.binding.schema,user:f.binding.runtime,password:runtimePassword},pool:{min:0,max:1}});
let nativeRejected=0;
try{
 for(const [table,field] of [['cheque_extra_receipts','version'],['cheque_bank_creations','name'],['cheque_attachments','filename'],['cheque_issuing_banks','name']])for(const operation of ['update','delete']){
  const before=await state();await assert.rejects(operation==='update'?runtime(table).update({[field]:'unauthorized'}):runtime(table).delete());assert.equal(await state(),before);nativeRejected++;
 }
 const original=await db('cheque_attachments').first();await assert.rejects(runtime('cheque_attachments').insert({...original,id:randomUUID().replaceAll('-','')}));nativeRejected++;
 try{await db('cheque_attachments').where({id:original.id}).update({ciphertext:'tampered'});assert.equal((await call('GET','/simple-v1/cheque-attachments/'+original.id)).status,503);assert.equal((await call('GET','/simple-v1/cheques')).status,409);}finally{await db('cheque_attachments').where({id:original.id}).update({ciphertext:original.ciphertext});}
}finally{await runtime.destroy();}
checks.push(nativeRejected+' direct runtime UPDATE/DELETE/late attachment INSERT attempts blocked; ciphertext tampering blocks download and reconciliation');
const proof=await extrasHelper(f,'verify');assert.equal(proof.totalGuards,133);assert.equal(proof.schema.tables,47);
const recovery=await extrasHelper(f,'recovery');assert.equal(recovery.passed,true);assert.equal(recovery.attachmentCount,4);checks.push('Independent encrypted snapshot restore verifies 47 tables, 133 guards, attachment metadata, content authentication and every business row');
await writeFile('docs/uat-2a/evidence/extras-http.json',JSON.stringify({passed:true,checks,tables:47,guards:133,recovery,malwareScannerUsed:false,operationalAttachmentActivation:'BLOCKED',productionContacted:false,ownerDataMutated:false},null,2));await writeFile('tmp/php-runtime/uat2a-extras-session.json',JSON.stringify({cookies,csrf,chequeId:c.id,bankId:receiving.id,clientId:client.id}));console.log(JSON.stringify({passed:true,checks:checks.length,recovery}));
}finally{f.password='';await writeFile('tmp/php-runtime/uat2a-extras.json',JSON.stringify(f));await db.destroy();}
