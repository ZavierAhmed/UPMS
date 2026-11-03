// Real Chrome -> actual loopback listener -> PHP kernel -> fresh isolated MariaDB.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {request} from 'node:http';
import knex from 'knex';
import {startEmployeeLauncher} from './uath1-launcher.mjs';
import {protectPrivateDirectory} from './php-7-5-private-directory.mjs';
const evidence='docs/uat-h1-startup/evidence',root=resolve('tmp/php-runtime/startup-test-'+Date.now()),origin='http://127.0.0.1:5180';await mkdir(root);await protectPrivateDirectory(root);await mkdir(evidence,{recursive:true});
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),admin=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,dateStrings:true},pool:{min:0,max:1}});
const checks=[],http=[],errors=[];let app;const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const close=async()=>{if(app){app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app=null;}};
const raw=(path,{method='GET',host='127.0.0.1:5180',requestOrigin,body=''}={})=>new Promise((done,fail)=>{const r=request(origin+path,{method,headers:{host,...(requestOrigin?{origin:requestOrigin}:{}),'content-type':'application/x-www-form-urlencoded'}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>done({status:res.statusCode,text,location:res.headers.location}));});r.on('error',fail);r.end(body);});
const fingerprint=async schema=>{const out={};for(const table of ['users','user_roles','v1_documents','v1_stock','v1_commands','labor_earnings','labor_payments','employees'])out[table]=createHash('sha256').update(JSON.stringify((await admin.withSchema(schema).from(table)).map(r=>JSON.stringify(r)).sort())).digest('hex');return out;};
try{
 for(const scenario of ['first-time','failure-retry']){
  const directory=resolve(root,scenario),bindingPath=resolve(root,scenario+'-binding.json');let injected=false;
  app=await startEmployeeLauncher({directory,bindingPath,afterStage:name=>{if(scenario==='failure-retry'&&name==='administrator'&&!injected){injected=true;throw Error('SIMULATED_AFTER_ADMIN_FAILURE');}}});
  const page=await browser.newPage();page.on('dialog',d=>d.accept());await page.setViewport({width:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const q=r.request();http.push({scenario,method:q.method(),path:new URL(q.url()).pathname,status:r.status(),...(q.method()==='POST'&&new URL(q.url()).pathname==='/setup'?{origin:q.headers().origin||null}:{})});});
  await page.goto(origin+'/management',{waitUntil:'networkidle0'});assert.ok((await page.title()).includes('UPMS latest workspace'));
  assert.equal((await raw('/setup',{host:'localhost:5180'})).location,origin+'/setup');
  assert.equal((await raw('/management',{host:'attacker.test:5180'})).status,403);
  for(const value of [undefined,'null','https://attacker.test','http://localhost:5180'])assert.equal((await raw('/setup',{method:'POST',requestOrigin:value})).status,403);
  const csrf=await page.$eval('input[name=token]',e=>e.value);
  assert.equal((await raw('/setup',{method:'POST',requestOrigin:origin,body:new URLSearchParams({password:'too-short',token:csrf}).toString()})).status,400);
  assert.equal(app.status().state,'WAITING');await assert.rejects(readFile(resolve(directory,'progress.json')));
  assert.equal((await raw('/setup',{method:'POST',requestOrigin:origin,body:new URLSearchParams({password:randomBytes(20).toString('hex'),token:'invalid'}).toString()})).status,403);
  checks.push(scenario+': invalid length, setup CSRF, forged Host, null/missing/cross-origin and localhost alias boundaries');
  const password=randomBytes(24).toString('hex');
  async function submit(){await page.goto(origin+'/setup');await page.type('input[type=password]',password);await Promise.all([page.waitForNavigation(),page.click('button')]);}
  await submit();
  if(scenario==='failure-retry'){
   await page.waitForFunction(()=>document.getElementById('retry')?.hidden===false,{timeout:120000});assert.equal(app.status().error,'SIMULATED_AFTER_ADMIN_FAILURE');
   const journal=JSON.parse(await readFile(resolve(directory,'progress.json'),'utf8'));assert.equal((await admin.withSchema(journal.schema).from('users')).length,1);
   assert.ok((await readFile(resolve(directory,'startup-events.jsonl'),'utf8')).includes('SIMULATED_AFTER_ADMIN_FAILURE'));
   const adminFingerprint=async()=>createHash('sha256').update(JSON.stringify(await admin.withSchema(journal.schema).from('users'))).digest('hex');const unchanged=await adminFingerprint();
   await page.goto(origin+'/setup');await page.type('input[type=password]',randomBytes(24).toString('hex'));await Promise.all([page.waitForNavigation(),page.click('button')]);await page.waitForFunction(()=>document.getElementById('retry')?.hidden===false,{timeout:120000});assert.equal(app.status().error,'USE_ORIGINAL_SETUP_PASSWORD');assert.equal(await adminFingerprint(),unchanged);
   await submit();await page.waitForFunction(()=>(location.pathname==='/management'&&!document.querySelector('input[name=token]'))||document.getElementById('retry')?.hidden===false,{timeout:120000});
   assert.equal((await admin.withSchema(journal.schema).from('users')).length,1);
   checks.push('failed after administrator creation -> retry reuses same schema/admin/password without resetting or duplicate initialization');
  }else await page.waitForFunction(()=>(location.pathname==='/management'&&!document.querySelector('input[name=token]'))||document.getElementById('retry')?.hidden===false,{timeout:120000});
  assert.equal(page.url(),origin+'/management');assert.equal(app.status().state,'READY');
  const ready=await fetch(origin+'/management');assert.equal(ready.status,200);assert.equal(ready.headers.get('X-UPMS-Workspace'),'employee-hafta');
  assert.equal((await raw('/setup',{method:'POST',requestOrigin:origin,body:new URLSearchParams({password,token:csrf}).toString()})).status,409);
  assert.equal((await fetch(origin+'/api/v1/management/session/current')).status,401);
  await page.waitForSelector('input[name=username]');await page.type('input[name=username]','php-admin');await page.type('input[name=password]',password);
  const loginResponse=page.waitForResponse(r=>r.url().endsWith('/session/login')&&r.request().method()==='POST');await page.click('button[type=submit]');assert.equal((await loginResponse).status(),200);
  await page.waitForSelector('main h1');const cookies=await page.cookies();const cookie=cookies.find(c=>c.name==='upms_employee_uat');assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Strict');
  await page.goto(origin+'/management/stock-in/new?kind=PRODUCTION',{waitUntil:'networkidle0'});await page.waitForSelector('.production-labor');assert.ok((await page.$eval('main',e=>e.innerText)).includes('Production Employee & Labor'));
  // Create one synthetic item and employee through authorized APIs for the editor, never a business document.
  const masters=await page.evaluate(async()=>{const session=await(await fetch('/api/v1/management/session/csrf')).json();const post=async(path,body)=>{const r=await fetch('/api/v1/management/simple-v1'+path,{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':session.csrfToken,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};return {employee:await post('/expense-masters/employees',{name:'Startup Browser Employee'}),item:await post('/items',{description:'Startup Synthetic Item',sellingPrice:'1.00'})};});assert.equal(masters.employee.status,201);assert.equal(masters.item.status,201);
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.production-labor');
  const choose=async(label,name)=>{await page.evaluate(label=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim().replace(/\s*\*$/,'')===label);document.getElementById(l.htmlFor).focus();},label);await page.waitForSelector('[role=option]');await page.evaluate(name=>[...document.querySelectorAll('[role=option]')].find(e=>e.textContent.startsWith(name)).click(),name);};
  await choose('Item','ITM-0001');await choose('Production employee','Startup Browser Employee');await page.type('input[name="lines.0.quantity"]','10');await page.type('input[name="lines.0.laborRate"]','1.25');assert.equal(await page.$eval('input[name="lines.0.laborRate"]',e=>e.disabled),false);await page.screenshot({path:evidence+'/'+scenario+'-production.png',fullPage:true});
  const haftaButton=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hafta'));await haftaButton.asElement().click();await page.waitForSelector('.employee-hafta-block');assert.ok(page.url().includes('/employee-hafta'));assert.ok((await page.$eval('main',e=>e.innerText)).includes('UNVERIFIED'));await page.screenshot({path:evidence+'/'+scenario+'-hafta.png',fullPage:true});
  const csrfDenied=await page.evaluate(async()=>{const r=await fetch('/api/v1/management/simple-v1/items',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':'invalid','idempotency-key':crypto.randomUUID()},body:JSON.stringify({description:'must-not-exist',sellingPrice:'1.00'})});return r.status;});assert.equal(csrfDenied,403);
  checks.push(scenario+': exact dashboard redirect after readiness, actual php-admin login/cookie, production employee/rate fields and Hafta navigation; invalid PHP CSRF rejected');
  const binding=JSON.parse(await readFile(bindingPath,'utf8')),beforeRestart=await fingerprint(binding.schema);await close();app=await startEmployeeLauncher({directory,bindingPath});assert.equal(app.status().state,'READY');assert.deepEqual(await fingerprint(binding.schema),beforeRestart);
  await page.goto(origin+'/management/employee-hafta',{waitUntil:'networkidle0'});await page.waitForSelector('.employee-hafta-block');checks.push(scenario+': successful restart reuses fixed binding, user credentials, existing records and session');
  const logout=await page.evaluate(async()=>{const s=await(await fetch('/api/v1/management/session/csrf')).json();const r=await fetch('/api/v1/management/session/logout',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':s.csrfToken},body:'{}'});return r.status;});assert.equal(logout,204);assert.ok(!(await page.cookies()).some(c=>c.name==='upms_employee_uat'&&c.value));assert.equal((await page.evaluate(async()=>fetch('/api/v1/management/session/current').then(r=>r.status))),401);
  await page.close();await close();
 }
 assert.deepEqual(errors,[]);await writeFile(evidence+'/browser.json',JSON.stringify({passed:true,checks,http,errors,port:5180,realPhp:true,realMariaDB:true,passwordsStored:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,requests:http.length}));
}finally{await close();await browser.close();await admin.destroy();}
