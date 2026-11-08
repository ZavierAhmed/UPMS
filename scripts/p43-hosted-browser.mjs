import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import puppeteer from 'puppeteer-core';

const ssh=spawnSync('C:/Windows/System32/OpenSSH/ssh.exe',['-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15',
 'tsn6az96j3v7@unique-plastic.com','/opt/alt/php83/usr/bin/php'],{encoding:'utf8',timeout:25000,input:
 '<?php $d="/home/tsn6az96j3v7/upms-private/p43/stage43";echo json_encode(["ingress"=>json_decode(file_get_contents($d."/browser-ingress.json"),true),"passwords"=>json_decode(file_get_contents($d."/synthetic-enrollment.json"),true)]);'});
if(ssh.status!==0)throw Error('PRIVATE_BROWSER_FIXTURE_UNAVAILABLE');
const fixture=JSON.parse(ssh.stdout);
const directory=resolve('tmp/phase-4.3/browser');await mkdir(directory,{recursive:true});
const report={passed:false,hostedHttps:true,realChrome:true,schema:'upms_stage_43',
 mechanism:'Isolated Chrome context; unchanged candidate assets and API requests routed through authenticated real GoDaddy HTTPS staging ingress',
 financialPostingActivated:false,nonemptyFinancialAcceptance:false,views:[],exports:[],pdfs:[],httpFailures:[],requestFailures:[],pageErrors:[],providerTelemetryBlocked:0};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{
 const context=await browser.createBrowserContext();const page=await context.newPage();
 const downloadHostedExcel=async(name,button)=>{
  const downloadPath=resolve(directory,'downloads');await mkdir(downloadPath,{recursive:true});
  const cdp=await page.createCDPSession();assert.equal(typeof context.id,'string');
  await cdp.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,eventsEnabled:true,browserContextId:context.id});
  const completed=new Promise((done,fail)=>{let guid;const timer=setTimeout(()=>fail(Error('HOSTED_EXCEL_DOWNLOAD_TIMEOUT')),30000);
   cdp.on('Browser.downloadWillBegin',event=>{guid=event.guid;});
   cdp.on('Browser.downloadProgress',event=>{if(event.guid===guid&&event.state==='completed'){clearTimeout(timer);done(guid);}if(event.guid===guid&&event.state==='canceled'){clearTimeout(timer);fail(Error('HOSTED_EXCEL_DOWNLOAD_CANCELED'));}});
  });
  try{await button('Export Excel');const guid=await completed;await writeFile(resolve(directory,name+'.xlsx'),await readFile(resolve(downloadPath,guid)));}
  finally{await cdp.detach();}
 };
 page.setDefaultTimeout(45000);await page.setViewport({width:1440,height:1000});await page.setRequestInterception(true);
 page.on('request',request=>{
  const u=new URL(request.url());if(u.protocol==='data:'||u.protocol==='blob:'){void request.continue();return;}
  if(u.origin!=='https://app.unique-plastic.com'){
   if(u.hostname==='img1.wsimg.com'){report.providerTelemetryBlocked++;}
   else report.requestFailures.push({path:u.pathname,error:'UNEXPECTED_EXTERNAL_REQUEST'});
   void request.abort();return;
  }
  const headers={...request.headers(),'x-upms-acceptance':fixture.ingress.token};
  if(u.pathname.startsWith('/api/v1/management/'))headers['x-upms-stage-route']=u.pathname+u.search;
  else if(u.pathname.startsWith('/management/assets/'))headers['x-upms-stage-asset']=u.pathname.slice(1);
  else if(u.pathname==='/management'||u.pathname.startsWith('/management/'))headers['x-upms-stage-asset']='management/index.html';
  else {report.requestFailures.push({path:u.pathname,error:'UNEXPECTED_MANAGEMENT_REQUEST'});void request.abort();return;}
  void request.continue({url:'https://app.unique-plastic.com/'+fixture.ingress.name+u.search,headers}).catch(()=>{});
 });
 page.on('response',response=>{
  if(response.status()>=400){const request=response.request();const path=new URL(request.url()).pathname;
   report.httpFailures.push({path,method:request.method(),status:response.status(),expected:response.status()===401&&path.endsWith('/session/current')});}
 });
 page.on('requestfailed',request=>{
  const u=new URL(request.url());if(u.hostname==='img1.wsimg.com')return;
  report.requestFailures.push({path:u.pathname,error:request.failure()?.errorText});
 });
 page.on('pageerror',error=>report.pageErrors.push({name:error.name,message:error.message.slice(0,250)}));
 await page.goto('https://app.unique-plastic.com/management',{waitUntil:'networkidle0'});
 assert.equal(new URL(page.url()).pathname,'/management','Browser must retain the actual management route');
 await page.waitForSelector('input[name=username]');
 await page.type('input[name=username]','admin');await page.type('input[name=password]',fixture.passwords.admin);
 const button=async text=>{
  await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text&&!b.disabled),{},text);
  const handle=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled),text);await handle.click();
 };
 await button('Sign in');await page.waitForFunction(()=>!document.querySelector('input[name=username]'));
 const go=async(path,label)=>{
  await page.goto('https://app.unique-plastic.com/management'+path,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>!document.querySelector('input[name=username]')&&document.querySelector('main'));
  const alerts=await page.$$eval('[role=alert]',nodes=>nodes.map(n=>n.textContent.trim()).filter(Boolean));
  assert.equal(alerts.length,0,'Application alert in '+label);
  report.views.push({path,label,passed:true});
 };
 const onlyExports=process.argv.includes('--exports-only');
 if(onlyExports){const previous=JSON.parse(await readFile(resolve(directory,'download-failed-results.json'),'utf8'));report.views=previous.views;report.priorViewEvidence='download-failed-results.json';}
 for(const [path,label] of onlyExports?[]:[['','Dashboard'],['/items','Inventory items'],['/stock-in','Inventory and production'],['/challans','Challans'],['/ledgers','Ledgers'],['/money-accounts','Money Accounts'],['/employee-hafta','Hafta'],['/cheques','Cheques'],['/reports','Reports'],['/expense-reports','Expense reports']]){
  await go(path,label);await page.screenshot({path:resolve(directory,(path.slice(1)||'dashboard')+'.png'),fullPage:true});
 }
 for(const [path,name] of [['/cheques','cheque-register'],['/employee-hafta','employee-hafta'],['/expense-reports','expense-report']]){
  await go(path,name);await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Export Excel'&&!b.disabled));
  await page.emulateMediaType('print');await page.pdf({path:resolve(directory,name+'.pdf'),printBackground:true,preferCSSPageSize:true});await page.emulateMediaType('screen');
  const pdf=await readFile(resolve(directory,name+'.pdf'));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');report.pdfs.push({name,bytes:pdf.length,emptyData:true});
  await downloadHostedExcel(name,button);
  const excel=await readFile(resolve(directory,name+'.xlsx'));assert.equal(excel.subarray(0,2).toString(),'PK');report.exports.push({name,bytes:excel.length,emptyData:true});
 }
 report.passed=report.pageErrors.length===0&&report.httpFailures.every(x=>x.expected)&&report.requestFailures.every(x=>x.error==='net::ERR_ABORTED');
 assert.ok(report.passed,'Recorded HTTP, browser or security failure');
}catch(error){report.error=error.message.slice(0,300);}
finally{
 await browser.close();await writeFile(resolve(directory,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,views:report.views.length,pdfs:report.pdfs.length,exports:report.exports.length,
  error:report.error,httpFailures:report.httpFailures,requestFailures:report.requestFailures,pageErrors:report.pageErrors}));
}
if(!report.passed)process.exitCode=1;
