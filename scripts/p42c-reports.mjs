import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import puppeteer from 'puppeteer-core';
import {downloadExcel} from './uath1c-artifacts.mjs';

let input='';
for await(const part of process.stdin)input+=part;
const fixture=JSON.parse(input);
const directory=resolve('tmp/phase-4.2c/reports');
await mkdir(directory,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
 headless:true,args:['--no-proxy-server','--host-resolver-rules=MAP app.unique-plastic.com:443 127.0.0.1:5292, MAP * ~NOTFOUND',
 '--ignore-certificate-errors-spki-list='+fixture.spki]});
try{
 const page=await browser.newPage();
 page.setDefaultTimeout(90000);
 await page.setViewport({width:1440,height:1000});
 await page.setCookie({name:'__Host-upms-php',value:fixture.cookie.split('=')[1],url:'https://app.unique-plastic.com',
  secure:true,httpOnly:true,sameSite:'Strict',path:'/'});
 const go=async(path,selector)=>{
  await page.goto('https://app.unique-plastic.com/management'+path,{waitUntil:'networkidle0'});
  await page.waitForSelector(selector);
  assert.equal(await page.$('input[name=username]'),null);
 };
 const button=async text=>{
  await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text&&!b.disabled),{},text);
  const handle=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled),text);
  await handle.click();
 };
 const print=async name=>{
  await page.emulateMediaType('print');
  await page.pdf({path:resolve(directory,name+'.pdf'),printBackground:true,preferCSSPageSize:true});
  await page.emulateMediaType('screen');
 };
 await go('/cheques','.cheque-totals');
 const data=await page.evaluate(()=>fetch('/api/v1/management/simple-v1/cheques?report=1').then(r=>r.json()));
 assert.equal(data.records.length,1);
 assert.equal(data.records[0].status,'CLEARED');
 assert.equal(data.records[0].amount,'60.00');
 assert.equal(data.attachmentsEnabled,false);
 await print('cheque-register');
 await downloadExcel(page,button,directory+'/downloads',directory+'/Cheque-Register.xlsx');
 await go('/documents/'+fixture.challan,'.document-detail');
 assert.ok((await page.$eval('.document-detail',e=>e.textContent)).includes('P42C-001'));
 await print('delivery-challan');
 await go('/employee-hafta?'+new URLSearchParams({employeeId:fixture.employee,from:fixture.date,to:fixture.date}),'.labor-balances');
 assert.match(await page.$eval('.labor-balances',e=>e.textContent),/1,?900\.00/);
 await print('employee-hafta');
 await downloadExcel(page,button,directory+'/downloads',directory+'/Employee-Hafta.xlsx');
 await page.screenshot({path:directory+'/management.png',fullPage:true});
 await writeFile(directory+'/results.json',JSON.stringify({passed:true,actualChromePdfs:3,excelDownloads:2,
  productionConfigured:true,clearance:'60.00',haftaClosing:'1900.00',attachmentsEnabled:false},null,2)+'\n');
 console.log(JSON.stringify({passed:true,actualChromePdfs:3,excelDownloads:2}));
}finally{await browser.close();}
