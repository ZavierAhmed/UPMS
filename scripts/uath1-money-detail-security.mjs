// Separate money-detail permission check on the isolated synthetic fixture.
import {readFile,writeFile} from 'node:fs/promises';import {spawn} from 'node:child_process';import {resolve} from 'node:path';import assert from 'node:assert/strict';import knex from 'knex';import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();const before=false,mode='after',setup=JSON.parse(await readFile('tmp/php-runtime/uath1-latest.json','utf8')),session=JSON.parse(await readFile(setup.directory+'/browser.json','utf8')),f=JSON.parse(await readFile(setup.directory+'/labor-browser.json','utf8'));const env=await readFile(session.envPath,'utf8');for(const [key,v] of Object.entries({UPMS_DB_HOST:'127.0.0.1',UPMS_DB_PORT:'3330',UPMS_DB_DATABASE:setup.schema}))if(!env.includes(key+'='+v+'\n'))throw Error('ISOLATED_BROWSER_REQUIRED');
const evidence='docs/uat-h1/evidence';let cookies=session.cookies,requests=0;
function php(method,path,raw,headers={}){requests++;return new Promise((done,fail)=>{const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/http-bridge.php'],{windowsHide:true,env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('UPMS_'))),UPMS_PRODUCTION_PROFILE:'',UPMS_PHP2_ENV:session.envPath},stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',()=>{});p.on('error',fail);p.on('close',code=>{if(code)return fail(Error('PHP_BROWSER_FAILED'));try{const r=JSON.parse(out);Object.assign(cookies,r.cookies);done(r);}catch{fail(Error('PHP_RESPONSE_FAILED'));}});p.stdin.end(JSON.stringify({method,path,cookies,headers:{...headers,origin:'https://app.unique-plastic.test'},raw}));});}
const api=async path=>{const r=await php('GET','/api/v1/management/simple-v1'+path,null);assert.equal(r.status,200,path);return JSON.parse(r.raw);};

const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,database:setup.schema}});
try {
 const payment=await api('/employee-hafta/payments/'+f.paymentId);assert.ok(payment.payment.money_account_id);
 await db('role_permissions').where({role_code:'administrator',permission_code:'money.accounts.view'}).delete();
 try {
  const limited=await api('/employee-hafta/payments/'+f.paymentId);
  assert.equal(limited.payment.money_account_id,undefined);assert.equal(limited.payment.money_batch_id,undefined);assert.equal(limited.payment.amount,'30.00');
  const denied=await php('GET','/api/v1/management/simple-v1/money',null);assert.equal(denied.status,403);
  const report=await api('/employee-hafta?'+new URLSearchParams({from:f.from,to:f.to,employeeId:f.employeeA}));assert.equal(report.blocks[0].closing,'12.35');assert.equal(report.businessExpenses[0].moneyAccountId,undefined);
 }finally{await db('role_permissions').insert({role_code:'administrator',permission_code:'money.accounts.view'});}
 await writeFile(evidence+'/money-detail-authorization.json',JSON.stringify({passed:true,paymentAccountAndBatchRedacted:true,moneyApiDenied:true,laborBalanceStillVisible:true,productionContacted:false},null,2));
 console.log('Money detail separation passed');
}finally{await db.destroy();}
