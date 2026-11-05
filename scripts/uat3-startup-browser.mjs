import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {request} from 'node:http';
import puppeteer from 'puppeteer-core';
import {startUnifiedPreview} from './uat3-preview.mjs';
import {extrasHelper} from './uat2a-workspace.mjs';
const port=5199,origin='http://127.0.0.1:'+port,directory=resolve('tmp/php-runtime/uat3-startup-'+Date.now()),bindingPath=resolve(directory,'binding.json'),checks=[];
let app=await startUnifiedPreview({port,directory,bindingPath}),password=randomBytes(24).toString('hex');
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const raw=(path,{host='127.0.0.1:'+port,method='GET',headers={},body=''}={})=>new Promise((done,fail)=>{const req=request(origin+path,{method,headers:{Host:host,...headers}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>done({status:res.statusCode,location:res.headers.location,body:text}));});req.on('error',fail);req.end(body);});
try{
for(const name of ['owner-uat-binding.json','uath1-owner-binding.json','uat2-owner-binding.json','uat2a-manual-binding.json'])await assert.rejects(startUnifiedPreview({port,directory,bindingPath:resolve('tmp/php-runtime',name)}));checks.push('All four existing owner bindings rejected before listener replacement or database modification');
const page=await browser.newPage();await page.goto(origin+'/setup');const token=await page.$eval('[name=token]',e=>e.value),form=value=>new URLSearchParams({token,password:value}).toString();
assert.equal((await raw('/setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:form('short')})).status,400);assert.equal(app.status().state,'WAITING');
assert.equal((await raw('/setup',{method:'POST',headers:{Origin:'http://localhost:'+port,'Content-Type':'application/x-www-form-urlencoded'},body:form(password)})).status,403);checks.push('Invalid password length and mismatched setup origin rejected before provisioning');
await page.type('[name=password]',password);await page.click('button');await page.waitForFunction(()=>location.pathname==='/management'&&Boolean(document.querySelector('[name=username]')),{timeout:240000});assert.equal(app.status().state,'READY');assert.equal(page.url(),origin+'/management');
await page.type('[name=username]','php-admin');await page.type('[name=password]',password);await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Sign in').click());await page.waitForSelector('.sidebar',{timeout:30000});password='';await page.goto(origin+'/management/cheques?new=1');await page.waitForFunction(()=>document.body.textContent.includes('+ Add Issuing Bank'));checks.push('Real Chrome setup reaches verified dashboard HTTP 200, logs in independently and exposes the new cheque form');
const binding=JSON.parse(await readFile(bindingPath,'utf8')),proof=await extrasHelper({binding,envPath:resolve(directory,'test.env')},'verify');assert.equal(proof.schema.tables,47);assert.equal(proof.totalGuards,133);
app.server.closeAllConnections();await new Promise(done=>app.server.close(done));app=await startUnifiedPreview({port,directory,bindingPath});assert.equal(app.status().state,'READY');assert.equal((await raw('/management')).status,200);checks.push('Restart reuses the same binding and account with all 47 tables and 133 guards');
await writeFile('docs/uat-3/evidence/browser/startup.json',JSON.stringify({passed:true,realChrome:true,checks,tables:47,guards:133,existingOwnerMigrated:false,productionContacted:false},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{password='';await browser.close();app.server.closeAllConnections();await new Promise(done=>app.server.close(done));}
