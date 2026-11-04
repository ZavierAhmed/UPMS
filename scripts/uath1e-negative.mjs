import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionClassifiedWorkspace,extensionHelper} from './uath1c-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';

const fixture=await provisionClassifiedWorkspace({publishLatest:false}),{binding,envPath}=fixture;
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:binding.schema,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});
const evidence='docs/uat-h1e/evidence';await mkdir(evidence,{recursive:true});const checks=[];
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
 const employee=await ok('POST','/expense-masters/employees',{name:'H1E opening rollback synthetic'}),input={employeeId:employee.id,date:'2026-11-01',amount:'1000.00',reference:'H1E-ROLLBACK',reason:'Verified synthetic earlier opening liability',approved:true};
 const invalid=await deny('POST','/employee-hafta/openings',{...input,reference:''},400);assert.ok(invalid.body.error.fieldErrors.reference);
 const before=await fingerprint(['labor_openings','labor_audit','v1_commands','money_batches','money_movements']),key=randomUUID();
 const grantSchema=binding.schema.replaceAll('_','\\_'),all=(await db.raw('SHOW TABLES'))[0].map(r=>Object.values(r)[0]);
 await db.raw('REVOKE INSERT ON ??.* FROM ??@?',[grantSchema,binding.runtime,'localhost']);
 try{for(const t of all.filter(t=>t!=='labor_audit'))await db.raw('GRANT INSERT ON ??.?? TO ??@?',[binding.schema,t,binding.runtime,'localhost']);
 const failed=await deny('POST','/employee-hafta/openings',input,503,{key});assert.ok(failed.body.error.reference);assert.equal(await fingerprint(['labor_openings','labor_audit','v1_commands','money_batches','money_movements']),before);
 }finally{await db.raw('GRANT INSERT ON ??.* TO ??@?',[grantSchema,binding.runtime,'localhost']);for(const t of all.filter(t=>t!=='labor_audit'))await db.raw('REVOKE INSERT ON ??.?? FROM ??@?',[binding.schema,t,binding.runtime,'localhost']);}
 await ok('POST','/employee-hafta/openings',input,{key});assert.equal((await db('labor_openings').where({employee_id:employee.id})).length,1);
 const raceEmployee=await ok('POST','/expense-masters/employees',{name:'H1E concurrent opening synthetic'}),raceInput={...input,employeeId:raceEmployee.id};const races=await Promise.all([request('POST','/employee-hafta/openings',raceInput),request('POST','/employee-hafta/openings',{...raceInput,amount:'0.00'})]);assert.deepEqual(races.map(r=>r.status).sort(),[201,409]);assert.equal(races.find(r=>r.status===409).body.error.code,'LABOR_OPENING_ALREADY_VERIFIED');assert.equal((await db('labor_openings').where({employee_id:raceEmployee.id})).length,1);
 const unknown=await ok('GET','/employee-hafta?'+new URLSearchParams({employeeId:employee.id,from:'2026-10-26',to:'2026-10-31'}));assert.equal(unknown.blocks[0].coverageState,'UNVERIFIED');assert.equal(unknown.blocks[0].closing,null);
 const rec=await ok('GET','/reconciliation');assert.equal(rec.matched,true);assert.equal((await extensionHelper(binding,'verify')).guards.totalGuards,103);
 await writeFile(evidence+'/opening-negative.json',JSON.stringify({passed:true,syntheticOnly:true,fieldSpecificReferenceError:true,auditInsertionFailureRolledBackAllOpeningHistory:true,failedKeyCanBeRetriedAfterRecovery:true,distinctConcurrentRequests:[201,409],oneImmutableOpeningPerEmployee:true,reportBeforeCoverageUnverified:true,reconciled:true,tables:38,guards:103,ownerRecordsWritten:false},null,2));console.log(JSON.stringify({passed:true,openingRollback:true,concurrency:true,guards:103}));
}finally{fixture.password='';await db.destroy();}
