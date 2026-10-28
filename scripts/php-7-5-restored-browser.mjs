import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const original=JSON.parse(await readFile('tmp/php-runtime/php7-uat-latest.json','utf8'));
const restore=JSON.parse(await readFile('tmp/php-runtime/php75-restore-latest.json','utf8'));
const result=JSON.parse(await readFile(restore.directory+'/results.json','utf8'));
const worksheet=JSON.parse(await readFile(original.directory+'/worksheet-results.json','utf8'));
const credentials=JSON.parse(await readFile(original.directory+'/credentials.json','utf8'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,acceptInsecureCerts:true});
const page=await browser.newPage();page.on('dialog',d=>d.accept());
async function button(text){await page.waitForFunction(t=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===t&&!b.disabled),{},text);for(const b of await page.$$('button'))if(await b.evaluate((e,t)=>e.textContent.trim()===t,text)){await b.click();return;}}
async function api(path){return page.evaluate(async p=>{const r=await fetch('/api/v1/management/simple-v1/'+p);if(!r.ok)throw Error('Restored read '+r.status);return r.json();},path);}
try{
 const response=await page.goto('https://127.0.0.1:9444/management/',{waitUntil:'networkidle0'});assert.equal(response.status(),200);await page.type('[name=username]',credentials.username);await page.type('[name=password]',credentials.password);await button('Sign in');await page.waitForFunction(()=>document.querySelector('h1')?.textContent==='Dashboard');
 const ids=worksheet.ids,items=(await api('items')).records;assert.equal(items.find(i=>i.id===ids.item).quantity,'123');
 for(const [key,amount]of [['A','200.00'],['B','80.00'],['V','-185.00']])assert.equal((await api('ledgers/'+ids[key])).closing,amount);
 assert.equal((await api('register')).totals.expensesPaid,'18.00');assert.equal((await api('documents')).records.length,worksheet.documents);
 const before=await api('reconciliation');assert.equal(before.matched,true);assert.equal(before.reviewRequired,false);assert.equal(before.authenticityVerified,false);
 await page.goto('https://127.0.0.1:9444/management/stock-in/new?kind=PRODUCTION&item='+ids.item,{waitUntil:'networkidle0'});await page.type('[name="lines.0.quantity"]','1');await button('Save draft');await page.waitForSelector('[data-document-status=DRAFT]');const draft=await page.evaluate(()=>location.pathname.split('/').at(-1));await button('Cancel draft');await page.waitForSelector('[data-document-status=CANCELLED]');assert.equal((await api('documents/'+draft)).status,'CANCELLED');assert.equal((await api('items')).records.find(i=>i.id===ids.item).quantity,'123');assert.equal((await api('reconciliation')).matched,true);
 await page.goto('https://127.0.0.1:9444/management/company-transactions',{waitUntil:'networkidle0'});await page.screenshot({path:restore.directory+'/restored-register.png',fullPage:true});
 const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));assert.match(result.clone,/^upms_test_php_6_restore_\d+$/);assert.match(original.database,/^upms_test_php_6_browser_\d+$/);
 const admin=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,timezone:'Z'},pool:{min:0,max:1}});
 try{assert.equal((await admin(result.clone+'.v1_documents').where({id:draft}).first()).status,'CANCELLED');assert.equal(await admin(original.database+'.v1_documents').where({id:draft}).first(),undefined);const snapshot=JSON.parse(await readFile(restore.directory+'/source-private.json','utf8'));for(const [table,expected]of Object.entries(snapshot)){const rows=(await admin(original.database+'.'+table).select('*')).map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort();assert.deepEqual(rows,expected,'Source unchanged '+table);}}finally{await admin.destroy();}
 result.applicationVerification='PASS';result.applicationChecks={login:true,balances:true,expenses:true,documentCount:true,reconciliation:true,authenticityVerified:false,restrictedAccountDraftAndCancel:true,cloneOnlyCancelledDraft:draft,sqlConfirmedCloneWrite:true,sourceAllTablesStillUnchanged:true};await writeFile(restore.directory+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,clone:result.clone,applicationVerification:'PASS'}));
}finally{await browser.close();}
