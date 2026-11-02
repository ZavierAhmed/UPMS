// Synthetic UI/print acceptance; intercepted API responses, no production traffic.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from '../upms.client/node_modules/vite/dist/node/index.js';
import puppeteer from 'puppeteer-core';
const evidence='docs/phase-3.1/evidence',integration=JSON.parse(await readFile(evidence+'/local-integration.json','utf8'));
const run=integration.database.replace('upms_test_php_p31_',''),original=JSON.parse(await readFile('tmp/php-runtime/p31-'+run+'/report.json','utf8'));
const base=original.blocks[0],names=['Alpha · Synthetic Packaging','Beta · Synthetic Traders','Gamma · Synthetic Bottles','Delta · Synthetic Client','Epsilon · Synthetic Client','Zeta · Synthetic Client','Eta · Empty client','Theta · Unverified opening'];
let report={...original,sourceLimitations:['SYNTHETIC TEST DATA — NOT A COMPANY STATEMENT',...original.sourceLimitations],blocks:names.map((name,i)=>({...structuredClone(base),partyId:String(i+1),partyName:name,rows:i===6?[]:base.rows.map((r,n)=>({...r,description:n===0?'Historical 500 ml bottle · '+('very long printed snapshot description '.repeat(4)):r.description})),...(i===6?{grossSales:'0.00',discounts:'0.00',returns:'0.00',total:'0.00',receipts:'0.00',receiptReversals:'0.00',movement:'0.00',balance:'100.00'}:{}),...(i===7?{opening:null,balance:null,openingVerified:false,warnings:['Opening balance is unverified. BALANCE is unavailable.']}:{})}))};
const clients=report.blocks.map(b=>({id:b.partyId,name:b.partyName,kind:'CLIENT'}));
await mkdir(evidence,{recursive:true});await mkdir('output/pdf',{recursive:true});
const server=await createServer({configFile:resolve('upms.client/vite.management.config.js'),root:resolve('upms.client/management'),server:{host:'127.0.0.1',port:5178,strictPort:true,proxy:{}}});await server.listen();console.log('Local Vite started');
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--no-default-browser-check']});
console.log('Chrome launched');let writes=0;const errors=[];
try{
 const p=await browser.newPage();await p.setViewport({width:1920,height:1200});p.on('pageerror',e=>errors.push(e.message));await p.setRequestInterception(true);
 p.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5178/')){if(!r.url().startsWith('data:')){r.abort();return;}}if(!r.url().includes('/api/'))return r.continue();if(r.method()!=='GET')writes++;const path=new URL(r.url()).pathname;let body={};if(path.endsWith('/session/current'))body={user:{id:'1',displayName:'Synthetic administrator',roles:['administrator'],permissions:['portal.access']},csrfToken:'synthetic'};else if(path.endsWith('/state'))body={interfaceVersion:'simple-v1.2',state:'READY'};else if(path.endsWith('/items')||path.endsWith('/documents')||path.endsWith('/movements'))body={records:[]};else if(path.endsWith('/parties'))body={records:new URL(r.url()).searchParams.get('kind')==='CLIENT'?clients:[]};else if(path.endsWith('/hafta'))body=report;return r.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await p.goto('http://127.0.0.1:5178/management/reports?report=hafta&from=2026-10-26&to=2026-11-01',{waitUntil:'networkidle0'});await p.waitForSelector('.hafta-block');console.log('Synthetic report rendered');await p.evaluate(()=>document.fonts.ready);
 const columns=await p.$eval('.hafta-grid',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,4);
 assert.equal(await p.$$eval('.hafta-block',e=>e.length),8);await p.screenshot({path:evidence+'/hafta-wide.png',fullPage:true});
 const overflow=()=>p.$$eval('.hafta-block td',cells=>cells.filter(e=>e.scrollWidth>e.clientWidth+2).length);assert.equal(await overflow(),0);
 for(const paper of ['A4','A3']){
  await p.select('select', 'hafta'); // The Reports selector remains stable.
  await p.evaluate(paper=>{const label=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Print paper'));const s=label.querySelector('select');s.value=paper;s.dispatchEvent(new Event('change',{bubbles:true}));},paper);
  await p.waitForSelector('.paper-'+paper);await p.emulateMediaType('print');
  const count=await p.$eval('.hafta-grid',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(count,paper==='A4'?2:4);assert.equal(await overflow(),0);
  await p.pdf({path:'output/pdf/UPMS-Hafta-synthetic-'+paper+'.pdf',preferCSSPageSize:true,printBackground:true});await p.emulateMediaType('screen');
 }
 // Actual XLSX download (inspect independently with Python/openpyxl).
 const cdp=await p.createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve(evidence)});
 await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Export Excel').click());
 await p.waitForFunction(()=>true);await new Promise(r=>setTimeout(r,500));
 await p.setViewport({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await p.screenshot({path:evidence+'/hafta-mobile.png',fullPage:true});
 await mkdir('tmp/pdfs',{recursive:true});
 report={...report,blocks:[{...base,grossSales:'21.60',discounts:'0.00',returns:'0.00',total:'21.60',receipts:'0.00',receiptReversals:'0.00',movement:'21.60',balance:'121.60',rows:Array.from({length:36},(_,i)=>({...base.rows[0],reference:'SYNTHETIC-LINE-'+String(i+1).padStart(3,'0'),description:'Synthetic tall-party pagination test '+('long historic description '.repeat(4))}))}]};
 await p.setViewport({width:1400,height:1000});await p.goto('http://127.0.0.1:5178/management/reports?report=hafta&from=2026-10-26&to=2026-11-01',{waitUntil:'networkidle0'});await p.waitForSelector('.hafta-block');await p.pdf({path:'tmp/pdfs/hafta-stress.pdf',preferCSSPageSize:true,printBackground:true});
 assert.equal(writes,0);assert.deepEqual(errors,[]);await writeFile(evidence+'/browser-print.json',JSON.stringify({passed:true,syntheticOnly:true,productionContacted:false,screenColumns:columns,partyBlocks:8,a4PrintColumns:2,a3PrintColumns:4,cellOverflow:0,mobileHorizontalOverflow:false,tallPartyRows:36,tallPartyPdf:'tmp/pdfs/hafta-stress.pdf',financialWrites:writes,javascriptErrors:errors,pdfFiles:['output/pdf/UPMS-Hafta-synthetic-A4.pdf','output/pdf/UPMS-Hafta-synthetic-A3.pdf'],verifiedUtc:new Date().toISOString()},null,2));console.log('Synthetic screen, mobile, A4/A3 PDF and Excel download checks passed.');
}finally{await browser.close();await server.close();}
