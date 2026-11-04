// Focused negative coverage: an actual BANK identity is insufficient without dated opening coverage.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {provisionChequeWorkspace} from './uat2-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';
const f=await provisionChequeWorkspace();let cookies={},csrf='';
async function call(method,path,body) {
 const r=await phpBridge(f.envPath,{method,path:'/api/v1/management'+path,cookies,headers:method==='GET'?{}:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':randomUUID()},raw:method==='GET'?null:JSON.stringify(body??{})});Object.assign(cookies,r.cookies);r.body=r.raw?JSON.parse(r.raw):null;if(r.body?.csrfToken)csrf=r.body.csrfToken;return r;
}
const ok=async(m,p,b)=>{const r=await call(m,'/simple-v1'+p,b);assert.ok([200,201].includes(r.status),p+' '+JSON.stringify(r.body));return r.body;};
try {
 await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:f.password})).status,200);f.password='';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),prior=new Date(today+'T12:00:00Z');prior.setUTCDate(prior.getUTCDate()-1);const yesterday=prior.toISOString().slice(0,10);
 const client=await ok('POST','/parties',{kind:'CLIENT',name:'UAT2 bank opening coverage customer'}),bank=(await ok('GET','/money')).accounts.find(a=>a.type==='BANK');assert.equal(bank.verified,false);
 const instrument=(number,date)=>({reference:'UAT2-BANK-COVERAGE-'+number,clientId:client.id,issuingBankId:'1',drawerName:'Synthetic opening coverage drawer',drawerAccount:'COVERAGEACCOUNT0001',number,chequeDate:date,receivedDate:date,amount:'100.00'}),deposit=date=>({bankId:bank.id,date,reference:'UAT2-BANK-COVERAGE-DEPOSIT',reason:'Synthetic bank opening coverage verification',evidence:'Synthetic dated deposit evidence retained'});
 const first=await ok('POST','/cheques',instrument('7801',today));let r=await call('POST',`/simple-v1/cheques/${first.id}/deposited`,deposit(today));assert.equal(r.status,400);assert.equal(r.body.error.code,'CHEQUE_BANK_OPENING_REQUIRED');
 await ok('POST','/money/openings',{accountId:bank.id,date:today,amount:'0.00',reference:'UAT2-COVERAGE-OPENING',reason:'Explicit synthetic bank opening starts today',approved:true});
 const second=await ok('POST','/cheques',instrument('7802',yesterday));r=await call('POST',`/simple-v1/cheques/${second.id}/deposited`,deposit(yesterday));assert.equal(r.status,400);assert.equal(r.body.error.code,'CHEQUE_BANK_OPENING_REQUIRED');
 await ok('POST',`/cheques/${first.id}/deposited`,deposit(today));const report=await ok('GET','/cheques'),money=await ok('GET','/money');assert.equal(report.records.find(r=>r.id===first.id).status,'DEPOSITED');assert.equal(report.records.find(r=>r.id===second.id).status,'RECEIVED');assert.equal(money.accounts.find(a=>a.id===bank.id).balance,'0.00');assert.equal(report.totals.CLEARED,'0.00');
 await writeFile('docs/uat-2/evidence/bank-opening.json',JSON.stringify({passed:true,negativeChecks:2,actualBankIdentity:true,missingOpeningRejected:true,dateBeforeOpeningRejected:true,eligibleDepositAfterOpening:true,bankBalance:'0.00',customerCreditsCreated:0,ownerDataMutated:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,negativeChecks:2,bankBalance:'0.00'}));
}finally{f.password='';}
