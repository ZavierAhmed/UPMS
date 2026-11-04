import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionClassifiedWorkspace,extensionHelper} from './uath1c-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';

const fixture=await provisionClassifiedWorkspace({publishLatest:false}),{binding,envPath}=fixture;
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});
const evidence='docs/uat-h1f/evidence';await mkdir(evidence,{recursive:true});const checks=[];
let cookies={},csrf='';
async function call(method,path,body,options={}) {
 const r=await phpBridge(options.envPath||envPath,{method,path:'/api/v1/management'+path,cookies:options.anonymous?{}:cookies,headers:{...(method!=='GET'?{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':options.key||randomUUID()}:{}),...options.headers},raw:method==='GET'?null:JSON.stringify(body??{})});
 r.body=r.raw?JSON.parse(r.raw):null;if(!options.anonymous){Object.assign(cookies,r.cookies);if(r.body?.csrfToken)csrf=r.body.csrfToken;}return r;
}
const request=(method,path,body,options)=>call(method,'/simple-v1'+path,body,options);
const ok=async(method,path,body,options)=>{const r=await request(method,path,body,options);assert.ok([200,201].includes(r.status),path+' '+JSON.stringify(r.body));return r.body;};
const deny=async(method,path,body,status=409,options)=>{const r=await request(method,path,body,options);assert.equal(r.status,status,path+' '+JSON.stringify(r.body));return r;};
const draft=body=>ok('POST','/documents',body);
const document=async body=>{const d=await draft(body),detail=await ok('GET','/documents/'+d.id);return ok('POST','/documents/'+d.id+'/post',{version:detail.version});};
const fingerprint=async(tables)=>{const data={};for(const t of tables)data[t]=(await db(t)).map(r=>JSON.stringify(r)).sort();return createHash('sha256').update(JSON.stringify(data)).digest('hex');};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
try {
 await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:fixture.password})).status,200);fixture.password='';
 const overview=await ok('GET','/money'),account=overview.accounts.find(a=>a.code==='HARIS_CASH');
 await ok('POST','/money/openings',{date:'2026-11-01',approved:true,reason:'Verified synthetic opening funds',accountId:account.id,amount:'10000.00',reference:'H1F-CASH'});
 const category=await ok('POST','/expense-masters/categories',{name:'H1F synthetic source payment',employeeBased:true});
 const scenarios=[];
 for(const [label,date,amount,expected,state] of [['Full zero','2026-11-01','0.00','800.00','FULL'],['Partial thousand','2026-11-03','1000.00','1800.00','PARTIAL'],['Full thousand','2026-11-01','1000.00','1800.00','FULL'],['No opening',null,null,null,'UNVERIFIED']]) {
  const employee=await ok('POST','/expense-masters/employees',{name:'H1F '+label}),item=await ok('POST','/items',{description:'H1F '+label+' bottle',sellingPrice:'7.00'});
  let opening=null;
  const input={employeeId:employee.id,date,amount,reference:'H1F-'+label,reason:'Reviewed independent synthetic opening evidence',approved:true};
  if(date){const key=randomUUID();const receipts=await Promise.all([ok('POST','/employee-hafta/openings',input,{key}),ok('POST','/employee-hafta/openings',input,{key})]);assert.deepEqual(receipts[0],receipts[1]);opening=receipts[0];
   const before=await fingerprint(['labor_openings','labor_audit','v1_commands']);
   const conflict=await deny('POST','/employee-hafta/openings',{...input,date:'2026-11-01',amount:'999.00'});assert.equal(conflict.body.error.code,'LABOR_OPENING_ALREADY_VERIFIED');assert.equal(conflict.body.error.message,'Employee labor opening already verified.');assert.equal(conflict.body.error.details.opening.id,opening.id);assert.ok(conflict.body.error.reference);assert.equal(await fingerprint(['labor_openings','labor_audit','v1_commands']),before);
   assert.equal((await deny('POST','/employee-hafta/openings',{...input,reason:'Different evidence' },409,{key})).body.error.code,'IDEMPOTENCY_CONFLICT');
   scenarios.push({label,duplicate:{status:conflict.status,code:conflict.body.error.code,reference:conflict.body.error.reference}});
  }else scenarios.push({label});
  const production=await draft({kind:'PRODUCTION',date:'2026-11-03',reference:'H1F-'+label,productionEmployeeId:employee.id,lines:[{itemId:item.id,quantity:'200',rate:'0',laborRate:'10.00'}]});
  const detail=await ok('GET','/documents/'+production.id);await ok('POST','/documents/'+production.id+'/post',{version:detail.version,initialStockOpenings:[{itemId:item.id,date:'2026-11-03',confirmed:true}]});
  let expense=null,allocation=null;
  if(date){expense=await document({kind:'EXPENSE',date:'2026-11-03',amount:'1200.00',paymentStatus:'PAID',method:'CASH',moneyAccountId:account.id,categoryId:category.id,employeeId:employee.id,businessExpenseConfirmed:true,expensePurpose:'BUSINESS_EXPENSE',description:'Existing synthetic employee cash payment',reference:'H1F-1200-'+label,payee:''});
   const immutable=await fingerprint(['v1_documents','money_batches','money_movements','money_audit']);const input={expenseId:expense.id,employeeId:employee.id,date:'2026-11-03',reason:'Reviewed full source against verified earned payable',approved:true};
   const key=randomUUID();allocation=await ok('POST','/employee-hafta/expense-allocations',input,{key});assert.deepEqual(await ok('POST','/employee-hafta/expense-allocations',input,{key}),allocation);await deny('POST','/employee-hafta/expense-allocations',input);assert.equal(await fingerprint(['v1_documents','money_batches','money_movements','money_audit']),immutable);
  }
  const report=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId:employee.id,from:'2026-11-02',to:'2026-11-08'})),b=report.blocks[0];assert.equal(b.coverageState,state);assert.equal(b.earned,'2000.00');assert.equal(b.closing,expected);assert.equal(b.opening,state==='FULL'?amount:null);assert.equal(report.coverageState,state);
  if(date){const carry=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId:employee.id,from:'2026-11-09',to:'2026-11-15'}));assert.equal(carry.blocks[0].coverageState,'FULL');assert.equal(carry.blocks[0].opening,expected);assert.equal(carry.blocks[0].closing,expected);}
  scenarios.at(-1).fixture={employeeId:employee.id,itemId:item.id,productionId:production.id,expenseId:expense?.id,allocationId:allocation?.id};scenarios.at(-1).report=report;
 }
 const multiEmployee=await ok('POST','/expense-masters/employees',{name:'H1F Multiple activity'}),multiItem=await ok('POST','/items',{description:'H1F multiple production bottle',sellingPrice:'7.00'});
 await ok('POST','/employee-hafta/openings',{employeeId:multiEmployee.id,date:'2026-11-01',amount:'1000.00',reference:'H1F-MULTI-OPEN',reason:'Independent synthetic opening evidence',approved:true});
 const ids=[];for(let i=0;i<2;i++){
  const production=await draft({kind:'PRODUCTION',date:'2026-11-03',reference:'H1F-MULTI-'+i,productionEmployeeId:multiEmployee.id,lines:[{itemId:multiItem.id,quantity:'100',rate:'0',laborRate:'10.00'}]});const detail=await ok('GET','/documents/'+production.id);await ok('POST','/documents/'+production.id+'/post',{version:detail.version,...(i===0?{initialStockOpenings:[{itemId:multiItem.id,date:'2026-11-03',confirmed:true}]}:{})});
  const expense=await document({kind:'EXPENSE',date:'2026-11-03',amount:'600.00',paymentStatus:'PAID',method:'CASH',moneyAccountId:account.id,categoryId:category.id,employeeId:multiEmployee.id,businessExpenseConfirmed:true,expensePurpose:'BUSINESS_EXPENSE',description:'Multiple prior cash payments',reference:'H1F-MULTI-EXPENSE-'+i,payee:''});
  const cash=await fingerprint(['money_batches','money_movements']);const allocation=await ok('POST','/employee-hafta/expense-allocations',{employeeId:multiEmployee.id,expenseId:expense.id,date:'2026-11-03',reason:'Reviewed original expense for earned wages',approved:true});assert.equal(await fingerprint(['money_batches','money_movements']),cash);ids.push({productionId:production.id,expenseId:expense.id,allocationId:allocation.id});
 }
 const multiReport=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId:multiEmployee.id,from:'2026-11-02',to:'2026-11-08'}));assert.equal(multiReport.blocks[0].closing,'1800.00');assert.equal(multiReport.blocks[0].earned,'2000.00');assert.equal(multiReport.blocks[0].allocatedPaid,'1200.00');assert.equal(multiReport.blocks[0].records.length,4);scenarios.push({label:'Multiple activity',fixture:{employeeId:multiEmployee.id,itemId:multiItem.id,...ids[0]},report:multiReport,originalIds:ids});
 const partial=scenarios.find(s=>s.label==='Partial thousand');for(const [from,to,state,opening,closing] of [['2026-11-03','2026-11-08','FULL','1000.00','1800.00'],['2026-11-09','2026-11-15','FULL','1800.00','1800.00'],['2026-10-26','2026-11-02','UNVERIFIED',null,null]]){const r=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId:partial.fixture.employeeId,from,to}));assert.equal(r.blocks[0].coverageState,state);assert.equal(r.blocks[0].opening,opening);assert.equal(r.blocks[0].closing,closing);}
 const all=await ok('GET','/employee-hafta?from=2026-11-02&to=2026-11-08');assert.equal(all.coverageState,'UNVERIFIED');assert.equal(all.totals.closing,null);
 const rec=await ok('GET','/reconciliation');assert.equal(rec.matched,true);assert.equal((await extensionHelper(binding,'verify')).guards.totalGuards,103);
 const serverLog=await readFile('upms.php/storage/logs/laravel.log','utf8');for(const scenario of scenarios.filter(s=>s.duplicate))assert.ok(serverLog.includes(scenario.duplicate.reference));
 await writeFile(binding.directory+'/h1f-scenario.json',JSON.stringify({cookies,scenarios:scenarios.map(s=>({label:s.label,...s.fixture}))}));
 await writeFile('tmp/php-runtime/uath1f-latest.json',JSON.stringify({...binding,envPath,bindingPath:fixture.bindingPath}));
 await writeFile(evidence+'/integration.json',JSON.stringify({passed:true,syntheticOnly:true,tables:38,guards:103,scenarios,aggregate:all.totals,reconciled:rec.matched,concurrentIdempotency:true,duplicateOpeningNoMutation:true,safeDiagnosticReferencesCorrelated:true,duplicateAllocationRejected:true,noSecondCashDebit:true,ownerDataWritten:false},null,2));
 console.log(JSON.stringify({passed:true,scenarios:scenarios.length,tables:38,guards:103,duplicateOpeningStatus:409,diagnosticsCorrelated:true}));
}finally{fixture.password='';await db.destroy();}
