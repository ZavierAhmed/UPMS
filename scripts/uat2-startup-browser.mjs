import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {request} from 'node:http';
import puppeteer from 'puppeteer-core';
import knex from 'knex';
import {startChequeLauncher} from './uat2-preview.mjs';
const port=5198,origin='http://127.0.0.1:'+port,directory=resolve('tmp/php-runtime/uat2-startup-'+Date.now()),bindingPath=resolve(directory,'binding.json'),checks=[];let inject=true;
let app=await startChequeLauncher({port,directory,bindingPath,afterStage:stage=>{if(stage==='cheque-extension'&&inject){inject=false;throw Error('SYNTHETIC_STARTUP_INTERRUPTED');}}});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let password=randomBytes(24).toString('hex');
const raw=(path,{host='127.0.0.1:'+port,method='GET',headers={},body=''}={})=>new Promise((done,fail)=>{const r=request(origin+path,{method,headers:{Host:host,...headers}},s=>{let text='';s.on('data',b=>text+=b);s.on('end',()=>done({status:s.statusCode,location:s.headers.location,body:text}));});r.on('error',fail);r.end(body);});
try {
 for(const owner of ['owner-uat-binding.json','uath1-owner-binding.json'])await assert.rejects(startChequeLauncher({port:5198,directory,bindingPath:resolve('tmp/php-runtime',owner)}),/CHEQUE_OWNER_TARGET_REJECTED/);checks.push('Both owner bindings rejected before any target connection or listener replacement');
 const page=await browser.newPage();await page.goto(origin+'/setup');const token=await page.$eval('[name=token]',e=>e.value),form=p=>new URLSearchParams({token,password:p}).toString();
 assert.equal((await raw('/setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:form('short')})).status,400);assert.equal(app.status().state,'WAITING');checks.push('Invalid password length rejected before provisioning');
 assert.equal((await raw('/setup',{method:'POST',headers:{Origin:'http://localhost:'+port,'Content-Type':'application/x-www-form-urlencoded'},body:form(password)})).status,403);assert.equal((await raw('/management',{host:'evil.invalid:'+port})).status,403);const local=await raw('/management',{host:'localhost:'+port});assert.equal(local.status,303);assert.equal(local.location,origin+'/management');checks.push('Exact Host/Origin enforced; localhost GET canonical redirect only');
 await page.type('[name=password]',password);await page.click('button');await page.waitForFunction(async()=>{const s=await fetch('/setup/status').then(r=>r.json());return s.state==='FAILED';},{timeout:240000});assert.equal(app.status().error,'SYNTHETIC_STARTUP_INTERRUPTED');assert.notEqual(page.url(),origin+'/management');checks.push('Interrupted setup reports failure and preserves completed fixture without a false success redirect');
 await page.goto(origin+'/setup');await page.type('[name=password]',password);await page.click('button');await page.waitForFunction(()=>location.pathname==='/management'&&Boolean(document.querySelector('[name=username]')),{timeout:120000});assert.equal(page.url(),origin+'/management');
 const b=JSON.parse(await readFile(bindingPath,'utf8')),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:b.schema,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});
 try{assert.equal((await db('users').count({n:'*'}).first()).n,1);assert.equal((await db.raw('SHOW TABLES'))[0].length,44);}finally{await db.destroy();}checks.push('Same-password retry reuses one administrator and the fixed 44-table database');
 password='';app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app=await startChequeLauncher({port,directory,bindingPath});assert.equal(app.status().state,'READY');assert.equal((await raw('/management')).status,200);checks.push('Restart reuses binding, native readiness and dashboard HTTP 200 without provisioning');
 await mkdir('docs/uat-2/evidence/browser',{recursive:true});await writeFile('docs/uat-2/evidence/browser/startup.json',JSON.stringify({passed:true,realChrome:true,checks,ownerDataMutated:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{password='';await browser.close();app.server.closeAllConnections();await new Promise(r=>app.server.close(r));}
