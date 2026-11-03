import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';
import {startEmployeeLauncher} from './uath1-launcher.mjs';

export async function downloadExcel(page,button,directory,destination) {
 await mkdir(directory,{recursive:true});
 const cdp=await page.createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:resolve(directory),eventsEnabled:true});
 const completed=new Promise((done,fail)=>{let guid;const timer=setTimeout(()=>fail(Error('H1C_EXCEL_DOWNLOAD_TIMEOUT')),20000);cdp.on('Browser.downloadWillBegin',event=>{guid=event.guid;});cdp.on('Browser.downloadProgress',event=>{if(event.guid===guid&&event.state==='completed'){clearTimeout(timer);done(guid);}if(event.guid===guid&&event.state==='canceled'){clearTimeout(timer);fail(Error('H1C_EXCEL_DOWNLOAD_CANCELED'));}});});
 await button('Export Excel');const guid=await completed;await writeFile(destination,await readFile(resolve(directory,guid)));await cdp.detach();
}

export async function renderAcceptanceArtifacts() {
 const binding=JSON.parse(await readFile('tmp/php-runtime/uath1c-latest.json','utf8')),scenario=JSON.parse(await readFile(binding.directory+'/scenario.json','utf8')),fixture=JSON.parse(await readFile(binding.directory+'/browser-h1c.json','utf8'));
 assert.match(binding.directory,/uath1c-\d+$/);
 const app=await startEmployeeLauncher({port:5191,bindingPath:binding.bindingPath,directory:binding.directory}),browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page=await browser.newPage();page.on('dialog',d=>d.accept());await page.setViewport({width:1440,height:1100});await page.setCookie({name:'upms_employee_uat',value:scenario.cookies['__Host-upms-php'],domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'});
  const go=async(path,selector)=>{await page.goto('http://127.0.0.1:5191/management'+path,{waitUntil:'networkidle0'});await page.waitForSelector(selector);assert.equal(await page.$('input[name=username]'),null);await page.evaluate(()=>document.fonts.ready);};
  const button=async text=>{await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text&&!b.disabled),{},text);const h=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled),text);await h.click();};
  const print=path=>page.pdf({path,format:'A4',printBackground:true,preferCSSPageSize:true});
  await go('/documents/'+fixture.production.id,'[data-document-status=POSTED]');await print('output/pdf/uath1c-production.pdf');
  const filters=new URLSearchParams({employeeId:fixture.employee.id,from:fixture.date,to:fixture.date});
  await go('/employee-hafta?'+filters,'.labor-balances');assert.match(await page.$eval('.labor-balances',e=>e.textContent),/800.00/);await page.screenshot({path:'docs/uat-h1c/evidence/hafta-desktop.png',fullPage:true});await print('output/pdf/uath1c-hafta.pdf');await downloadExcel(page,button,binding.directory+'/artifact-downloads','docs/uat-h1c/evidence/UPMS-Employee-Hafta.xlsx');
  await go('/expense-reports?'+filters,'.expense-overall-total');assert.match(await page.$eval('.expense-overall-total',e=>e.textContent),/0.00/);await page.screenshot({path:'docs/uat-h1c/evidence/expense-classification.png',fullPage:true});await print('output/pdf/uath1c-expense-classification.pdf');await downloadExcel(page,button,binding.directory+'/artifact-downloads','docs/uat-h1c/evidence/UPMS-Expense-Classification.xlsx');
  console.log(JSON.stringify({passed:true,actualChromePdfs:3,completedExcelDownloads:2}));
 }finally{await browser.close();app.server.closeAllConnections();await new Promise(r=>app.server.close(r));}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await renderAcceptanceArtifacts();
