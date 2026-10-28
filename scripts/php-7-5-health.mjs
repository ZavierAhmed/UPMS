import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
const engine=await verifyUatEngine();
const setup=JSON.parse(await readFile(process.env.PHP_UAT_SETUP||'tmp/php-runtime/php7-uat-latest.json','utf8'));
assert.match(setup.database,/^upms_test_php_6_browser_\d+$/);
const credentials=JSON.parse(await readFile(setup.directory+'/credentials.json','utf8'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,acceptInsecureCerts:true});
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
 const publicResponse=await page.goto((process.env.PHP_PUBLIC_ORIGIN||'https://127.0.0.1:9443')+'/',{waitUntil:'networkidle0'});assert.equal(publicResponse.status(),200);assert.ok((await page.$eval('body',e=>e.innerText)).includes('Unique Plastic'));
 const managementResponse=await page.goto((process.env.PHP_UAT_ORIGIN||'https://127.0.0.1:9444')+'/management/',{waitUntil:'networkidle0'});assert.equal(managementResponse.status(),200);await page.type('[name=username]',credentials.username);await page.type('[name=password]',credentials.password);for(const b of await page.$$('button'))if(await b.evaluate(e=>e.textContent.trim()==='Sign in')){await b.click();break;}await page.waitForFunction(()=>document.querySelector('h1')?.textContent==='Dashboard');
 const state=await page.evaluate(async()=>{const r=await fetch('/api/v1/management/simple-v1/state');return r.json();});assert.equal(state.state,'READY');assert.equal(state.interfaceVersion,'simple-v1.2');
 if(!process.argv.includes('--basic')){const worksheet=JSON.parse(await readFile(setup.directory+'/worksheet-results.json','utf8'));const actual=await page.evaluate(async ids=>{async function get(path){return(await fetch('/api/v1/management/simple-v1/'+path)).json();}return{stock:(await get('items')).records.find(i=>i.id===ids.item).quantity,A:(await get('ledgers/'+ids.A)).closing,B:(await get('ledgers/'+ids.B)).closing,V:(await get('ledgers/'+ids.V)).closing,expenses:(await get('register')).totals.expensesPaid,documents:(await get('documents')).records.length,reconciliation:await get('reconciliation')};},worksheet.ids);assert.equal(actual.stock,'123');assert.equal(actual.A,'200.00');assert.equal(actual.B,'80.00');assert.equal(actual.V,'-185.00');assert.equal(actual.expenses,'18.00');assert.equal(actual.documents,worksheet.documents);assert.equal(actual.reconciliation.matched,true);assert.equal(actual.reconciliation.reviewRequired,false);assert.equal(actual.reconciliation.authenticityVerified,false);}
 const result={passed:true,checkedAt:new Date().toISOString(),browserVersion:await browser.version(),engine,publicStatus:publicResponse.status(),managementStatus:managementResponse.status(),actualBrowserLogin:true,database:setup.database,worksheetVerified:!process.argv.includes('--basic'),ownerSignoff:'PENDING OWNER'};await writeFile(setup.directory+'/health-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
