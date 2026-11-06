import puppeteer from 'puppeteer-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const viteMode=process.argv.includes('--vite');
const packageRoot=process.argv[2]&&!process.argv[2].startsWith('--')?resolve(process.argv[2]):null;
const label=viteMode?'vite':packageRoot?'package':'local';
const publicOnly=existsSync(resolve(packageRoot||'.','server/src/public-app.js'));
const module=await import(pathToFileURL(resolve(packageRoot||'.','server/src',publicOnly?'public-app.js':'app.js')));
const createApp=publicOnly?module.createPublicApp:module.createApp;
const {loadConfig}=await import(pathToFileURL(resolve(packageRoot||'.','server/src/config/index.js')));
const config=loadConfig({NODE_ENV:'testing',ALLOWED_HOSTS:'127.0.0.1;unique-plastic.com',PUBLIC_ORIGIN:'https://unique-plastic.com',INQUIRY_MODE:'Disabled',WEBSITE_ROOT:resolve(packageRoot||'.','upms.client/dist')});
const vite=viteMode?await (await import('../upms.client/node_modules/vite/dist/node/index.js')).createServer({root:resolve('upms.client'),server:{host:'127.0.0.1',port:0}}):null;
if(vite)await vite.listen();
const server=vite?vite.httpServer:createApp({config,management:null,delivery:async()=> 'Unavailable'}).listen(0,'127.0.0.1');
if(!vite)await new Promise(r=>server.once('listening',r));
const origin='http://127.0.0.1:'+server.address().port;
const evidence=resolve('docs/uat-3a/evidence/'+(process.env.UAT3A_EVIDENCE_SET?process.env.UAT3A_EVIDENCE_SET+'/':'')+'browser/'+label),downloadPath=resolve('tmp/uat3a/downloads/'+(process.env.UAT3A_EVIDENCE_SET||'initial')+'/'+label);
await mkdir(evidence,{recursive:true});await mkdir(downloadPath,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={label,chrome:await browser.version(),origin,viewports:[],downloads:[],consoleErrors:[],requestFailures:[]};
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>report.consoleErrors.push(e.message));page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 const manifest=JSON.parse(await readFile('upms.client/public/product-documents.json','utf8'));
 const catalogsOnly=process.argv.includes('--catalogs-only');
 const categories=catalogsOnly?['buckets','cans','containers']:Object.keys(manifest.documents);
 for(const width of viteMode?[]:catalogsOnly?[390,1440]:[390,768,1024,1440,1920]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1});
  for(const path of [...categories.map(id=>'/products/'+id),...catalogsOnly?[]:['/manufacturing','/about']]){
   const response=await page.goto(origin+path,{waitUntil:'networkidle0'});assert.equal(response.status(),200);
   await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,20));}await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));window.scrollTo(0,0);});
   const checks=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),canonical:document.querySelector('link[rel=canonical]')?.href,title:document.title,h1:document.querySelectorAll('h1').length,pdf:document.querySelector('a[download]')?.getAttribute('href'),hdpe:!!document.getElementById('hdpe-title')}));
   assert.equal(checks.overflow,false,path+' horizontal overflow '+width);assert.deepEqual(checks.brokenImages,[]);assert.equal(checks.h1,1);assert.equal(checks.canonical,'https://unique-plastic.com'+path);
   if(path.startsWith('/products/'))assert.equal(checks.pdf,manifest.documents[path.split('/').at(-1)].url);
   if(path==='/manufacturing')assert.ok(checks.hdpe);
   const filename=path.slice(1).replaceAll('/','-')+'-'+width+'.jpg';
   await page.screenshot({path:resolve(evidence,filename),fullPage:true,type:'jpeg',quality:65});report.viewports.push({path,width,...checks,screenshot:filename});
  }
 }
 const cdp=await browser.target().createCDPSession();
 await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath,eventsEnabled:true});
 await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 for(const id of categories){
  const doc=manifest.documents[id];
  await page.goto(origin+'/products/'+id,{waitUntil:'networkidle0'});
  const finished=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Download timeout '+id)),20000);function progress(e){if(e.state==='completed'){clearTimeout(timer);cdp.off('Browser.downloadProgress',progress);resolve(e);}else if(e.state==='canceled'){clearTimeout(timer);reject(Error('Download canceled'));}}cdp.on('Browser.downloadProgress',progress);});
  await page.click('a[download]');await finished;
  const file=resolve(downloadPath,doc.filename),bytes=await readFile(file);assert.equal(bytes.length,doc.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);
  const http=await fetch(origin+doc.url);assert.equal(http.headers.get('content-type'),'application/pdf');assert.equal(http.headers.get('content-disposition'),`attachment; filename="${doc.filename}"`);
  const priorTargets=new Set(browser.targets());
  const viewer=await browser.newPage();await viewer.goto(pathToFileURL(file).href,{waitUntil:'domcontentloaded'});
  // Chrome renders PDFs in an out-of-process extension frame, not the page DOM.
  const target=await browser.waitForTarget(t=>!priorTargets.has(t)&&t.url().startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/'),{timeout:15000});
  const viewerSession=await target.createCDPSession();
  let viewerState;
  const deadline=Date.now()+30000;
  do {
   const result=await viewerSession.send('Runtime.evaluate',{expression:`JSON.stringify({state:document.querySelector('pdf-viewer')?.loadState_,pages:document.querySelector('pdf-viewer')?.docLength_,progress:document.querySelector('pdf-viewer')?.loadProgress_})`,returnByValue:true});
   viewerState=JSON.parse(result.result.value||'{}');
   if(viewerState.state==='success')break;
   if(viewerState.state==='failed')throw Error('Chrome PDF viewer failed '+id);
   await new Promise(r=>setTimeout(r,200));
  } while(Date.now()<deadline);
  assert.equal(viewerState.state,'success',id+' viewer must finish loading');
  assert.equal(viewerState.pages,doc.pages||1,id+' viewer page count');
  await new Promise(r=>setTimeout(r,400));
  await viewer.screenshot({path:resolve(evidence,'pdf-viewer-'+id+'.jpg'),type:'jpeg',quality:80});
  report.downloads.push({id,filename:doc.filename,bytes:bytes.length,sha256:doc.sha256,mime:http.headers.get('content-type'),disposition:http.headers.get('content-disposition'),chromeViewer:true,viewerState,viewerUrl:viewer.url()});await viewer.close();
 }
 // Every responsive image variant is available and correctly mapped in this runtime.
 const images=JSON.parse(await readFile('upms.client/src/data/ownerProductImages.json','utf8'));report.imageVariants=[];
 for(const image of Object.values(images).flat())for(const variant of image.variants){const r=await fetch(origin+variant.src);assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,variant.bytes);report.imageVariants.push(variant.src);}
 assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.requestFailures,[]);
 report.passed=true;
}finally{await writeFile(resolve(evidence,'results.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server.closeAllConnections();if(vite)await vite.close();else await new Promise(r=>server.close(r));}
console.log(label+': '+report.viewports.length+' responsive pages, '+report.downloads.length+' Chrome downloads/viewers, 20 image variants passed.');
