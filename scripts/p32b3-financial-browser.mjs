// Local browser acceptance uses actual isolated PHP GET fixtures. All financial writes blocked.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from '../upms.client/node_modules/vite/dist/node/index.js';
import puppeteer from 'puppeteer-core';
const setup=JSON.parse(await readFile('tmp/php-runtime/p32b3-latest.json','utf8')),f={};
for(const name of ['review','incorrectReview','purchaseReview','directory','original','detail','expenseDetail','draftDetail','statement','money','expenseReport','clientLedger','vendorLedger','register','hafta','state','docs'])f[name]=JSON.parse(await readFile(setup.directory+'/refund-'+name+'.json','utf8'));
const evidence='docs/phase-3.2b3/evidence';await mkdir(evidence,{recursive:true});
const server=await createServer({configFile:resolve('upms.client/vite.management.config.js'),root:resolve('upms.client/management'),server:{host:'127.0.0.1',port:5182,strictPort:true,proxy:{}}});await server.listen();
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--no-default-browser-check']});let financialRequests=0,confirmations=0;const errors=[],screenshots=[];
try{
 const p=await browser.newPage();await p.setViewport({width:1660,height:1100});p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>{if(d.type()==='beforeunload')return d.accept();confirmations++;return d.dismiss();});await p.setRequestInterception(true);
 p.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5182/')&&!r.url().startsWith('data:'))return r.abort();if(!r.url().includes('/api/'))return r.continue();if(r.method()!=='GET'){financialRequests++;return r.abort();}const url=new URL(r.url()),path=url.pathname;let body={};
  if(path.endsWith('/session/current'))body={user:{id:'1',displayName:'Synthetic administrator',roles:['administrator'],permissions:['portal.access']},csrfToken:'synthetic'};
  else if(path.includes('/financial-refunds/review/'))body=path.endsWith('/'+f.purchaseReview.originalId)?f.purchaseReview:url.searchParams.get('scenario')&&url.searchParams.get('scenario')!=='ACTUAL_FULL_REFUND'?f.incorrectReview:f.review;
  else if(path.endsWith('/expense-directory'))body=f.directory;else if(path.endsWith('/state'))body=f.state;else if(path.endsWith('/money'))body=f.money;else if(path.includes('/money/accounts/'))body=f.statement;else if(path.endsWith('/expense-reports'))body=f.expenseReport;else if(path.endsWith('/register'))body=f.register;else if(path.endsWith('/documents'))body=f.docs;
  else if(path.includes('/documents/'))body=path.endsWith('/'+f.draftDetail.id)?f.draftDetail:path.endsWith('/'+f.expenseDetail.id)?f.expenseDetail:path.endsWith('/'+f.detail.id)?f.detail:f.original;
  else if(path.endsWith('/items')||path.endsWith('/movements')||path.endsWith('/parties'))body={records:[]};
  return r.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const goto=async route=>{await p.goto('http://127.0.0.1:5182/management/'+route,{waitUntil:'networkidle0'});await p.waitForSelector('main h1');await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>{const el=document.createElement('p');el.textContent='SYNTHETIC LOCAL ACCEPTANCE - NOT PRODUCTION RECORDS';el.style.cssText='padding:10px;border:2px solid #d77721;background:#fff4e4;font-weight:700;font-size:12px';document.querySelector('main').prepend(el);});};
 const capture=async name=>{screenshots.push(name);await p.screenshot({path:evidence+'/'+name,fullPage:true});};
 await goto('financial-refunds/'+f.review.originalId);await p.waitForSelector('.refund-facts');assert.ok((await p.$eval('main',e=>e.innerText)).includes(f.review.expectedBalance));assert.equal(await p.$$eval('input:not([readonly]):not([type=checkbox])',e=>e.length),0);await capture('refund-review-desktop.png');
 await p.select('.financial-refunds select','INCORRECT_ENTRY');await p.waitForFunction(()=>document.querySelector('main').innerText.includes('Separate policy required'));assert.equal(await p.$$eval('form button',e=>e.length),0);await capture('incorrect-entry-blocked.png');
 await goto('financial-refunds/'+f.purchaseReview.originalId);await p.waitForFunction(()=>document.querySelector('main').innerText.includes('Purchase corrections are blocked'));assert.equal(await p.$$eval('form button',e=>e.length),0);await capture('purchase-return-blocked.png');
 await goto('documents/'+f.draftDetail.id);await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(e=>e.textContent==='Finalize full refund'&&!e.disabled));await p.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent==='Finalize full refund').click());assert.equal(confirmations,1);await capture('refund-final-confirmation-draft.png');
 await goto('documents/'+f.detail.id);await p.waitForFunction(()=>document.querySelector('main').innerText.includes('Full refund posted once'));await capture('vendor-refund-posted.png');
 await goto('documents/'+f.expenseDetail.id);await p.waitForFunction(()=>document.querySelector('main').innerText.includes('Historic category'));await capture('expense-refund-posted.png');
 await p.setViewport({width:390,height:844});await p.waitForFunction(()=>document.getElementById('v1-sidebar').getBoundingClientRect().right<=1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await capture('expense-refund-mobile.png');
 await p.setViewport({width:1660,height:1100});await goto('money-accounts?view=statement&account='+f.statement.account.id);await p.waitForFunction(()=>document.querySelector('main').innerText.includes('View original refunded transaction'));await capture('money-statement-refund-links.png');
 await goto('expense-reports?group=employee');await p.waitForSelector('.expense-report-group');assert.ok((await p.$eval('main',e=>e.innerText)).includes('-0.30'));await capture('signed-expense-report.png');
 await p.setViewport({width:390,height:844});await p.waitForFunction(()=>document.getElementById('v1-sidebar').getBoundingClientRect().right<=1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await capture('signed-expense-report-mobile.png');
 assert.equal(financialRequests,0);assert.deepEqual(errors,[]);
 await writeFile(evidence+'/browser.json',JSON.stringify({passed:true,source:'Actual isolated PHP GET fixtures; final financial confirmation dismissed. API posting tested separately by MariaDB integration.',screenshots,financialRequests,confirmationsDismissed:confirmations,javascriptErrors:errors,mobileOuterOverflow:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log('Refund review, blocked policy, final confirmation, linked documents, signed reports and mobile acceptance passed.');
}finally{await browser.close();await server.close();}
