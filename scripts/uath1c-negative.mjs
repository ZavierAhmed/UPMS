import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionClassifiedWorkspace,extensionHelper} from './uath1c-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';

const binding=JSON.parse(await readFile('tmp/php-runtime/uath1c-latest.json','utf8'));
assert.match(binding.directory,/uath1c-\d+$/);const envPath=binding.directory+'/test.env';
const scenario=JSON.parse(await readFile(binding.directory+'/scenario.json','utf8'));
const fixture={password:''};
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});
const evidence='docs/uat-h1c/evidence';await mkdir(evidence,{recursive:true});const checks=[];
let cookies=scenario.cookies,csrf='';
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
 await call('GET','/session/csrf');const date=scenario.date,employeeId=scenario.employeeId;
 const tables=(await db.raw('SHOW TABLES'))[0].map(r=>Object.values(r)[0]).filter(t=>!['sessions','login_attempts'].includes(t));
 const opening={employeeId,date,amount:'0.00',reference:'NEGATIVE-REVIEWED-OPENING',reason:'Reviewed no earlier synthetic wages',approved:true};
 const item=await ok('POST','/items',{description:'H1C concurrent initial item',sellingPrice:'1.00'});
 const prod=()=>draft({kind:'PRODUCTION',date,reference:randomUUID(),lines:[{itemId:item.id,quantity:'2',rate:'0'}]});
 const [a,b]=await Promise.all([prod(),prod()]);
 const body={version:1,initialStockOpenings:[{itemId:item.id,date,confirmed:true}]};
 const races=await Promise.all([request('POST','/documents/'+a.id+'/post',body),request('POST','/documents/'+b.id+'/post',body)]);assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);
 assert.equal((await db('stock_initializations').where({item_id:item.id})).length,1);assert.equal((await db('v1_stock').where({item_id:item.id}).first()).quantity,'2');
 checks.push('Distinct concurrent first productions: one success, one conflict, one zero opening and one stock increment');
 const nonzero=await ok('POST','/items',{description:'H1C existing nonzero opening',sellingPrice:'1.00'});
 await document({kind:'STOCK_OPENING',date,lines:[{itemId:nonzero.id,quantity:'7',rate:'0'}]});
 const old=await draft({kind:'PRODUCTION',date,lines:[{itemId:nonzero.id,quantity:'2',rate:'0'}]});let before=await fingerprint(tables);
 await deny('POST','/documents/'+old.id+'/post',{version:1,initialStockOpenings:[{itemId:nonzero.id,date,confirmed:true}]});assert.equal(await fingerprint(tables),before);
 await ok('POST','/documents/'+old.id+'/post',{version:1});assert.equal((await db('v1_stock').where({item_id:nonzero.id}).first()).quantity,'9');
 checks.push('Existing nonzero opening/history cannot reinitialize; normal production retains opening and adds stock');
 const fresh=await ok('POST','/items',{description:'H1C authorization rollback item',sellingPrice:'1.00'});
 const deniedDraft=await draft({kind:'PRODUCTION',date,productionEmployeeId:employeeId,lines:[{itemId:fresh.id,quantity:'1',rate:'0',laborRate:'1.00'}]});
 const confirmed={version:1,initialStockOpenings:[{itemId:fresh.id,date,confirmed:true}]};
 await db('role_permissions').where({role_code:'administrator',permission_code:'stock.initial_opening.confirm'}).delete();
 try{before=await fingerprint(tables);await deny('POST','/documents/'+deniedDraft.id+'/post',confirmed,403);assert.equal(await fingerprint(tables),before);}finally{await db('role_permissions').insert({role_code:'administrator',permission_code:'stock.initial_opening.confirm'});}
 before=await fingerprint(tables);await deny('POST','/documents/'+deniedDraft.id+'/post',confirmed,403,{headers:{'x-csrf-token':'bad'}});assert.equal(await fingerprint(tables),before);
 await db('v1_stock').where({item_id:fresh.id}).update({quantity:'1'});try{before=await fingerprint(tables);await deny('POST','/documents/'+deniedDraft.id+'/post',confirmed);assert.equal(await fingerprint(tables),before);}finally{await db('v1_stock').where({item_id:fresh.id}).update({quantity:'0'});}
 const grantSchema=binding.schema.replaceAll('_','\\_');
 const denyInsert=async(table,work)=>{const all=(await db.raw('SHOW TABLES'))[0].map(r=>Object.values(r)[0]);await db.raw('REVOKE INSERT ON ??.* FROM ??@?',[grantSchema,binding.runtime,'localhost']);try{for(const t of all.filter(t=>t!==table))await db.raw('GRANT INSERT ON ??.?? TO ??@?',[binding.schema,t,binding.runtime,'localhost']);await work();}finally{await db.raw('GRANT INSERT ON ??.* TO ??@?',[grantSchema,binding.runtime,'localhost']);for(const t of all.filter(t=>t!==table))await db.raw('REVOKE INSERT ON ??.?? FROM ??@?',[binding.schema,t,binding.runtime,'localhost']);}};
 for(const table of ['labor_earnings','stock_initializations','labor_extension_audit','v1_commands']){before=await fingerprint(tables);await denyInsert(table,async()=>{const r=await request('POST','/documents/'+deniedDraft.id+'/post',confirmed);assert.ok(r.status>=400);});assert.equal(await fingerprint(tables),before,table);}
 checks.push('Missing opening permission, CSRF and inconsistent projection rejected; injected earning/link/audit/receipt insert failures roll back opening, production, stock and earnings completely');
 const second=await ok('POST','/expense-masters/employees',{name:'H1C allocation negatives'}),unverified=await ok('POST','/expense-masters/employees',{name:'H1C unverified worker'});
 await ok('POST','/employee-hafta/openings',{...opening,employeeId:second.id});
 await document({kind:'PRODUCTION',date,productionEmployeeId:second.id,lines:[{itemId:nonzero.id,quantity:'100',rate:'0',laborRate:'10.00'}]});
 const account=(await ok('GET','/money')).accounts.find(a=>a.code==='HARIS_CASH');
 const cat=await ok('POST','/expense-masters/categories',{name:'Advance name does not imply wages H1C',employeeBased:true});
 const expense=(amount,emp=second.id)=>document({kind:'EXPENSE',date,amount,paymentStatus:'PAID',method:'CASH',moneyAccountId:account.id,categoryId:cat.id,employeeId:emp,businessExpenseConfirmed:true,expensePurpose:'BUSINESS_EXPENSE',description:'Synthetic retained employee expense',reference:randomUUID(),payee:''});
 const source1=await expense('100.00'),source2=await expense('150.00'),transport=await expense('70.00');
 const allocate=source=>({expenseId:source.id,employeeId:second.id,date,reason:'Reviewed full existing payment against verified earned labor',approved:true});
 before=await fingerprint(tables);await deny('POST','/employee-hafta/expense-allocations',{...allocate(source1),employeeId});assert.equal(await fingerprint(tables),before);
 for(const cap of ['employee_labor.classify','employee_labor.view','money.accounts.view']){await db('role_permissions').where({role_code:'administrator',permission_code:cap}).delete();try{before=await fingerprint(tables);await deny('POST','/employee-hafta/expense-allocations',allocate(source1),403);assert.equal(await fingerprint(tables),before);}finally{await db('role_permissions').insert({role_code:'administrator',permission_code:cap});}}
 for(const table of ['labor_expense_allocations','labor_extension_audit','v1_commands']){before=await fingerprint(tables);await denyInsert(table,async()=>{const r=await request('POST','/employee-hafta/expense-allocations',allocate(source1));assert.ok(r.status>=400);});assert.equal(await fingerprint(tables),before,table);}
 const cashBefore=await fingerprint(['money_batches','money_movements','money_audit','v1_documents']);
 await ok('POST','/employee-hafta/expense-allocations',allocate(source1));
 await ok('PATCH','/expense-masters/employees/'+second.id,{version:1,name:'H1C employee renamed after source'});
 await ok('POST','/employee-hafta/expense-allocations',allocate(source2));
 assert.equal(await fingerprint(['money_batches','money_movements','money_audit','v1_documents']),cashBefore);
 const r=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId:second.id,from:date,to:date}));assert.equal(r.blocks[0].closing,'750.00');assert.equal(r.businessExpenses.length,1);assert.equal(r.businessExpenses[0].amount,'70.00');assert.ok(r.blocks[0].records.filter(r=>r.type==='EXPENSE_ALLOCATION').every(r=>r.employeeName==='H1C allocation negatives'));
 checks.push('Wrong employee, revoked classification/view/money permission rejected; allocation/audit/command faults rollback; multiple sources and rename retain original identities; category named Advance and ordinary transport never imply wages');
 const noOpening=await expense('10.00',unverified.id);assert.equal((await ok('GET','/employee-hafta/expense-allocations?expenseId='+noOpening.id)).records[0].code,'H1C_LABOR_COVERAGE_UNVERIFIED');await deny('POST','/employee-hafta/expense-allocations',{...allocate(noOpening),employeeId:unverified.id});
 const ordinaryCat=await ok('POST','/expense-masters/categories',{name:'H1C nonemployee ordinary',employeeBased:false});const ordinary=await document({kind:'EXPENSE',date,amount:'10.00',paymentStatus:'PAID',method:'CASH',moneyAccountId:account.id,categoryId:ordinaryCat.id,expensePurpose:'BUSINESS_EXPENSE',description:'Nonemployee ordinary expense',reference:randomUUID(),payee:'Synthetic supplier'});await deny('POST','/employee-hafta/expense-allocations',allocate(ordinary));
 const refunded=await expense('10.00');let review=await ok('GET','/financial-refunds/review/'+refunded.id);const refund=await ok('POST','/financial-refunds',{originalId:refunded.id,originalVersion:review.originalVersion,sourceMoneyBatchId:review.sourceMoneyBatchId,date,type:'ACTUAL_FULL_REFUND',actualFundsReturned:true,reason:'Synthetic actual refund',evidence:'Reviewed synthetic full cash returned',reference:randomUUID()});await ok('POST','/financial-refunds/'+refund.id+'/post',{version:1});await deny('POST','/employee-hafta/expense-allocations',allocate(refunded));
 review=await ok('GET','/financial-refunds/review/'+scenario.expenseId);assert.equal(review.eligible,false);assert.match(review.blockedReason,/allocated/);
 const balance=(await ok('GET','/money')).accounts.find(a=>a.id===account.id).balance;
 const direct=await ok('POST','/employee-hafta/payments',{employeeId:second.id,date,amount:'100.00',method:'CASH',moneyAccountId:account.id,reference:randomUUID(),reason:'Actual synthetic earned Hafta payout',approved:true});assert.equal((await db('money_batches').where({source_ref:'UPMS-LABOR:'+direct.id})).length,1);
 await deny('POST','/employee-hafta/payments',{employeeId:second.id,date,amount:'651.00',method:'CASH',moneyAccountId:account.id,reference:randomUUID(),reason:'Unsupported future wage advance',approved:true});
 const future=new Date(date+'T12:00:00Z');future.setUTCDate(future.getUTCDate()+7);const futureDate=future.toISOString().slice(0,10);const carry=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId,from:futureDate,to:futureDate}));assert.equal(carry.blocks[0].opening,'800.00');assert.equal(carry.blocks[0].closing,'800.00');
 checks.push('Unverified coverage, nonemployee source, refunded source, refund-after-allocation and unsupported advances rejected; direct payment has one debit/one event; weekly carry remains exact');
 const env=await readFile(envPath,'utf8'),password=env.match(/^UPMS_DB_PASSWORD=(.+)$/m)[1];const runtime=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:binding.runtime,password,dateStrings:true},pool:{min:0,max:1}});let protectedAttempts=0;
 try{const grants=(await runtime.raw('SHOW GRANTS'))[0].map(r=>Object.values(r)[0]);assert.equal(grants.filter(g=>!g.endsWith(' TO PUBLIC')).length,2);assert.ok(grants.filter(g=>g.endsWith(' TO PUBLIC')).every(g=>/ ON `test(?:\\_%)?`\.\* TO PUBLIC$/.test(g)));assert.equal((await runtime.raw('SELECT CURRENT_USER() account'))[0][0].account,binding.runtime+'@localhost');assert.ok(grants.some(g=>/^GRANT SELECT, INSERT, UPDATE, DELETE ON /.test(g)));for(const table of ['labor_extension_receipts','labor_expense_allocations','stock_initializations','labor_extension_audit']){const row=await runtime(table).first();for(const op of ['update','delete']){await assert.rejects(op==='update'?runtime(table).where({id:row.id}).update({id:row.id}):runtime(table).where({id:row.id}).delete());protectedAttempts++;}}const row=await runtime('labor_expense_allocations').first();delete row.id;await assert.rejects(runtime('labor_expense_allocations').insert(row));protectedAttempts++;await assert.rejects(runtime.raw('CREATE TABLE h1c_unauthorized (id INT)'));protectedAttempts++;}finally{await runtime.destroy();}
 const reconciliation=await ok('GET','/reconciliation');assert.equal(reconciliation.matched,true,JSON.stringify(reconciliation));await extensionHelper(binding,'verify');
 await writeFile(evidence+'/negative-integration.json',JSON.stringify({passed:true,checks,protectedAttempts,targetDatabasePrivileges:['SELECT','INSERT','UPDATE','DELETE'],inheritedEnginePublicTestGrants:'Existing PUBLIC grants on test and test\\_% apply only to unrelated disposable test namespaces; not changed. Target UPMS namespace has no DDL.',ownerDataMutated:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,protectedAttempts}));
}finally{await db.destroy();}
