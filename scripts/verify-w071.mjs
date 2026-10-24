// Public-only W07.1 visual/interaction acceptance. Start the loopback preview first.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.W071_PUBLIC_URL||'http://127.0.0.1:3116';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Loopback preview required');
const shots='docs/screenshots/w071';await mkdir(shots,{recursive:true});await mkdir('tmp/w071',{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-extensions']});
const page=await browser.newPage(),checks=[],errors=[],failed=[],resources=[];
page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ABORTED'))failed.push(r.url());});
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const settle=()=>page.evaluate(()=>new Promise(r=>setTimeout(r,380)));
try{
 for(const width of [1920,1440,768,390]){
  await page.setViewport({width,height:1000,isMobile:width===390,hasTouch:width===390});
  await page.goto(base+'/products',{waitUntil:'networkidle0'});
  await page.$eval('.product-grid',e=>e.scrollIntoView({block:'center'}));await settle();
  check(`${width}: exactly four approved cards`,await page.$$eval('.product-card h3',els=>JSON.stringify(els.map(e=>e.textContent))===JSON.stringify(['Plastic Buckets','Lubricant Cans','Plastic Cans','Custom Packaging'])));
  check(`${width}: no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(`${width}: column count`,await page.$eval('.product-grid',(e,w)=>getComputedStyle(e).gridTemplateColumns.split(' ').length===(w===390?1:2),width));
  check(`${width}: secondary photos absent before intent`,await page.$$('.product-secondary').then(a=>a.length===0));
  resources.push({width,initialCatalog:await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('catalog-w07')).map(r=>({url:r.name,bytes:r.encodedBodySize})))});
  await (await page.$('.product-grid')).screenshot({path:`${shots}/products-${width}.png`});
  if(width>=1440){
   for(const id of ['buckets','cans','containers']){
    const sel=`.product-card[href="/products/${id}"]`;
    await page.$eval(sel,e=>e.scrollIntoView({block:'center'}));await settle();
    const before=await page.$eval(sel,e=>({width:e.offsetWidth,height:e.offsetHeight}));
    await page.hover(sel);await page.waitForSelector(sel+'.hover-ready');await settle();
    check(`${width} ${id}: hover crossfade`,await page.$eval(sel,e=>getComputedStyle(e.querySelector('.product-secondary')).opacity==='1'&&getComputedStyle(e.querySelector('.product-primary img')).opacity==='0'));
    check(`${width} ${id}: stable dimensions`,await page.$eval(sel,(e,b)=>e.offsetWidth===b.width&&e.offsetHeight===b.height,before));
    check(`${width} ${id}: decoded secondary`,await page.$eval(sel+' .product-secondary',e=>e.complete&&e.naturalWidth>0));
    await (await page.$(sel)).screenshot({path:`${shots}/${id}-hover-${width}.png`});
    await page.mouse.move(0,0);await settle();check(`${width} ${id}: leave restores primary`,await page.$eval(sel+' .product-primary img',e=>getComputedStyle(e).opacity==='1'));
   }
  }
  await page.$eval('.product-card[href="/products/custom"]',e=>e.scrollIntoView({block:'center'}));await settle();
  await page.screenshot({path:`${shots}/custom-${width}.png`});
  await page.goto(base+'/',{waitUntil:'networkidle0'});await settle();await page.screenshot({path:`${shots}/home-${width}.png`,fullPage:true});
  await page.goto(base+'/products/containers',{waitUntil:'networkidle0'});await settle();await page.screenshot({path:`${shots}/detail-${width}.png`,fullPage:true});
  check(`${width}: renamed detail title`,await page.$eval('h1',e=>e.textContent==='Plastic Cans'));
  check(`${width}: 20L primary`,await page.$eval('.gallery-stage img',e=>e.src.includes('jerrycan-20l')));
 }
 await page.setViewport({width:1440,height:1000});await page.goto(base+'/products',{waitUntil:'networkidle0'});
 await page.focus('.product-card');await settle();
 check('keyboard focus visible',await page.$eval('.product-card',e=>getComputedStyle(e).outlineStyle==='solid'));
 await page.keyboard.press('Enter');await page.waitForFunction(()=>location.pathname==='/products/buckets');
 await page.goBack({waitUntil:'networkidle0'});check('Back restores listing',new URL(page.url()).pathname==='/products');
 await page.goForward({waitUntil:'networkidle0'});check('Forward restores detail',new URL(page.url()).pathname==='/products/buckets');
 await page.goto(base+'/products/jars',{waitUntil:'networkidle0'}).then(r=>check('retired jars is HTTP 404',r.status()===404));
 check('retired route noindex',await page.$eval('meta[name="robots"]',e=>e.content.includes('noindex')));
 const sitemap=await (await fetch(base+'/sitemap.xml')).text();check('sitemap excludes jars',!sitemap.includes('/products/jars'));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.goto(base+'/products',{waitUntil:'networkidle0'});await page.hover('.product-card');await settle();
 check('reduced motion disables movement',await page.$eval('.product-card',e=>{const s=getComputedStyle(e);return s.animationName==='none'&&s.transitionDuration==='0s'&&s.transform==='none';}));
 await page.emulateMediaFeatures([]);
 await page.evaluate(()=>{window.IntersectionObserver=undefined;});
 await page.click('a[href="/about"]');await page.waitForFunction(()=>location.pathname==='/about');
 check('content visible without IntersectionObserver',await page.$$eval('.reveal',els=>els.every(e=>getComputedStyle(e).opacity!=='0')));
 await page.setJavaScriptEnabled(false);await page.goto(base+'/products',{waitUntil:'networkidle0'});
 check('all four cards present without JavaScript',await page.$$('.product-card').then(a=>a.length===4));
 check('SSR content remains visible',await page.$eval('.product-card',e=>getComputedStyle(e).opacity==='1'));
 check('no JavaScript errors',errors.length===0);check('no failed network requests',failed.length===0);
 await writeFile('tmp/w071/polish-results.json',JSON.stringify({count:checks.length,checks,errors,failed,resources},null,2));console.log(`${checks.length} W07.1 checks passed`);
}finally{await browser.close();}
