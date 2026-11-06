import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';import {resolve} from 'node:path';import {createServer} from 'node:http';import assert from 'node:assert/strict';import puppeteer from 'puppeteer-core';import {employeePreview} from './uath1-preview.mjs';
const moneyOnly=process.argv.includes('--money'),filtersOnly=process.argv.includes('--filters'),before=process.argv.includes('--before'),mode=moneyOnly?'money-retry':filtersOnly?'filters':before?'before':'after',f=JSON.parse(await readFile('tmp/php-runtime/p4-uat2a-extras.json','utf8')),s=JSON.parse(await readFile('tmp/php-runtime/p4-uat2a-extras-session.json','utf8'));
const frozen=resolve('tmp/php-runtime/uat3-browser-assets-'+Date.now());await cp(resolve('tmp/php-runtime/'+(before?'uat2a-assets':'p41-assets')),frozen,{recursive:true});
const app=await employeePreview(f.bindingPath,{port:5215,cookieName:'upms_uat3_test',assetRoot:frozen}),server=createServer((req,res)=>app.handler(req,res).catch(()=>{res.writeHead(503);res.end();}));await new Promise(r=>server.listen(5215,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[], failures=[], unsafeRequests=[], filters=[]; let context={};
try{const page=await browser.newPage(); page.on('request', request=>{const url=new URL(request.url());if(url.pathname.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(request.method()))unsafeRequests.push({method:request.method(),route:url.pathname});}); page.on('response', async response=>{const url=new URL(response.url()); if(response.status()<400||!url.pathname.startsWith('/api/'))return;const entry={...context,route:url.pathname,method:response.request().method(),status:response.status(),requestRef:response.headers()['x-request-id']??null}; failures.push(entry);try{const value=await response.json();const code=value.error?.code??value.code;if(typeof code==='string'&&/^[A-Z0-9_]{1,80}$/i.test(code))entry.code=code;}catch{}});page.setDefaultTimeout(45000);await page.setCookie({name:'upms_uat3_test',value:s.cookies['__Host-upms-php'],url:'http://127.0.0.1:5215',httpOnly:true});
for(const width of moneyOnly?[1920]:filtersOnly?[768]:[390,768,1024,1440,1920]){await page.setViewport({width,height:1000});for(const path of moneyOnly?['/money-accounts']:filtersOnly?['/challans','/vendors','/cheques']:['','/items','/stock-in/new','/challans','/clients','/vendors','/money-accounts','/employee-hafta','/expenses','/reports','/cheques','/cheques?new=1'].filter(path=>!process.argv.includes('--cheque-only')||path.startsWith('/cheques'))){context={width,path};await page.goto('http://127.0.0.1:5215/management'+path);await page.waitForSelector('.sidebar');await page.waitForNetworkIdle({idleTime:400,timeout:90000});await page.waitForFunction(()=>![...document.querySelectorAll('[role=status]')].some(e=>/Loading records/.test(e.textContent)));await new Promise(r=>setTimeout(r,500));const audit=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,heading:document.querySelector('main h1')?.textContent||'',alerts:[...document.querySelectorAll('main>[role=alert]')].map(e=>e.textContent)}));if(!before)assert.equal(audit.overflow,false,`${width} ${path} overflow`);if(filtersOnly){
  assert.ok(audit.heading);
  assert.deepEqual(audit.alerts,[]);
  const label={ '/challans':'Search reference','/vendors':'Search','/cheques':'Cheque number' }[path];
  const key=path==='/cheques'?'number':'q';
  const field=await page.evaluateHandle(label=>[...document.querySelectorAll('main label')].find(el=>el.textContent.trim()===label)?.querySelector('input'),label);
  assert.ok(field.asElement(), 'Filter input is missing for '+path);
  const count=()=>page.evaluate(()=>[...document.querySelectorAll('main table tbody tr')].filter(row=>row.cells.length>1).length);
  const initial=await count();
  await field.focus();
  await page.keyboard.sendCharacter('987654321098765');
  await page.waitForFunction(key=>new URLSearchParams(location.search).get(key)==='987654321098765',{},key);
  await page.waitForNetworkIdle({idleTime:500});
  assert.equal(await count(),0);
  await field.focus();
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.waitForFunction(key=>!new URLSearchParams(location.search).get(key),{},key);
  await page.waitForFunction(initial=>[...document.querySelectorAll('main table tbody tr')].filter(row=>row.cells.length>1).length===initial,{},initial);
  await page.waitForNetworkIdle({idleTime:500});
  assert.equal(await count(),initial);
  filters.push({path,width,initialRows:initial,emptyFilterMatched:true,clearedFilterRestored:true});
}
const key=path?path.slice(1).replaceAll('/','-').replaceAll('?','-').replaceAll('=','-'):'dashboard';await page.screenshot({path:`docs/phase-4.1/evidence/browser/${mode}-management-${key}-${width}.png`,fullPage:true});results.push({width,path,...audit});}
}
if(!before&&!moneyOnly){await page.setViewport({width:390,height:844});await page.goto('http://127.0.0.1:5215/management/cheques');await page.waitForSelector('.sidebar');await page.click('.mobile-toggle');await page.waitForSelector('.sidebar.is-open');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar')).transform==='matrix(1, 0, 0, 1, 0, 0)');await page.type('.workspace-nav-search input','items');await page.click('.sidebar nav button');await page.waitForFunction(()=>location.pathname==='/management/items');await page.goBack();await page.waitForFunction(()=>location.pathname==='/management/cheques');await page.goForward();await page.waitForFunction(()=>location.pathname==='/management/items');results.push({navigation:'mobile searchable menu, Back and Forward',passed:true});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await page.$eval('.sidebar',e=>getComputedStyle(e).transitionDuration),'0s');results.push({reducedMotion:true,passed:true});}
await writeFile(`docs/phase-4.1/evidence/management-${mode}.json`,JSON.stringify({passed:!failures.length&&!unsafeRequests.length&&!results.some(result=>result.alerts?.length),readOnly:!unsafeRequests.length,results,failures,filters,unsafeRequests},null,2));console.log('Management '+mode+' acceptance captured');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
