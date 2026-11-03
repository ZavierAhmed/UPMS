import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionClassifiedWorkspace} from './uath1c-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';
const fixture=await provisionClassifiedWorkspace({publishLatest:false}),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:fixture.binding.schema,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});
let cookies={},csrf='';
async function call(method,path,body) {const r=await phpBridge(fixture.envPath,{method,path:'/api/v1/management'+path,cookies,headers:method==='GET'?{}:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':randomUUID()},raw:method==='GET'?null:JSON.stringify(body||{})});Object.assign(cookies,r.cookies);const data=r.raw?JSON.parse(r.raw):null;if(data?.csrfToken)csrf=data.csrfToken;return {status:r.status,data};}
const request=(m,p,b)=>call(m,'/simple-v1'+p,b),ok=async(m,p,b)=>{const r=await request(m,p,b);assert.ok([200,201].includes(r.status),p+' '+JSON.stringify(r.data));return r.data;};
const fingerprint=async()=>{const result={};for(const t of (await db.raw('SHOW TABLES'))[0].map(r=>Object.values(r)[0]).filter(t=>!['sessions','login_attempts'].includes(t)).sort())result[t]=(await db(t)).map(r=>JSON.stringify(r)).sort();return createHash('sha256').update(JSON.stringify(result)).digest('hex');};
try {
 await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:fixture.password})).status,200);fixture.password='';
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const employee=await ok('POST','/expense-masters/employees',{name:'H1D source integrity worker'}),item=await ok('POST','/items',{description:'H1D source integrity bottle',sellingPrice:'1.00'});
 await ok('POST','/employee-hafta/openings',{employeeId:employee.id,date,amount:'0.00',reference:'H1D-VERIFIED-OPEN',reason:'Reviewed no earlier synthetic wages',approved:true});
 const prod=await ok('POST','/documents',{kind:'PRODUCTION',date,productionEmployeeId:employee.id,lines:[{itemId:item.id,quantity:'50',rate:'0',laborRate:'10.00'}]});await ok('POST','/documents/'+prod.id+'/post',{version:1,initialStockOpenings:[{itemId:item.id,date,confirmed:true}]});
 const account=(await ok('GET','/money')).accounts.find(a=>a.code==='HARIS_CASH');await ok('POST','/money/openings',{date,accountId:account.id,amount:'5000.00',reference:'H1D-CASH-OPEN',reason:'Verified synthetic funds',approved:true});
 const category=await ok('POST','/expense-masters/categories',{name:'H1D original employee expense',employeeBased:true});
 const expense=await ok('POST','/documents',{kind:'EXPENSE',date,amount:'1000.00',categoryId:category.id,employeeId:employee.id,businessExpenseConfirmed:true,expensePurpose:'BUSINESS_EXPENSE',description:'Synthetic full source exceeds earned payable',reference:'H1D-SOURCE-1000',method:'CASH',moneyAccountId:account.id,paymentStatus:'PAID',payee:''});await ok('POST','/documents/'+expense.id+'/post',{version:1});
 const body={expenseId:expense.id,employeeId:employee.id,date,reason:'Synthetic reviewed full source labor settlement',approved:true};
 const review=await ok('GET','/employee-hafta/expense-allocations?expenseId='+expense.id);assert.equal(review.records[0].code,'H1C_ALLOCATION_EXCEEDS_PAYABLE');
 let before=await fingerprint(),r=await request('POST','/employee-hafta/expense-allocations',body);assert.equal(r.status,409);assert.equal(r.data.error.code,'H1C_ALLOCATION_EXCEEDS_PAYABLE');assert.equal(await fingerprint(),before);
 const batch=await db('money_batches').where({source_ref:'UPMS-DOC:'+expense.id}).first();
 await db('money_batches').where({id:batch.id}).update({amount:'1000.01'});
 try {
  before=await fingerprint();const source=await ok('GET','/employee-hafta/expense-allocations?expenseId='+expense.id);assert.equal(source.records[0].code,'H1C_SOURCE_MONEY_MISMATCH');
  r=await request('POST','/employee-hafta/expense-allocations',body);assert.equal(r.status,409);assert.equal(r.data.error.code,'H1C_FINANCIAL_RECONCILIATION_REQUIRED');assert.equal(await fingerprint(),before);
 }finally{await db('money_batches').where({id:batch.id}).update({amount:batch.amount});}
 const reconciled=await ok('GET','/reconciliation');assert.equal(reconciled.matched,true);assert.equal((await db('labor_expense_allocations')).length,0);
 await writeFile('docs/uat-h1d/evidence/money-source-negative.json',JSON.stringify({passed:true,syntheticOnly:true,verifiedEarnedPayable:'500.00',fullSourceAmount:'1000.00',insufficientEarnedPayableRejected:true,inconsistentSourceMoneyRejected:true,failedApprovalsHaveNoMutations:true,injectedSourceRestoredAndReconciled:true,ownerDatabaseModified:false},null,2));console.log(JSON.stringify({passed:true,insufficientPayableRejected:true,inconsistentMoneyRejected:true,ownerDatabaseModified:false}));
}finally{fixture.password='';await db.destroy();}
