// Public-only acceptance against the separately started loopback preview; no database access.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.W07_PUBLIC_URL||'http://127.0.0.1:3115';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Loopback preview required');
await mkdir('docs/screenshots/w07',{recursive:true});
await mkdir('tmp/w07',{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-extensions']});
const page=await browser.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const count=()=>page.$eval('.gallery-controls [aria-live]',e=>e.textContent);
try{
 for(const width of [1440,768,390]){
  await page.setViewport({width,height:900,isMobile:width===390,hasTouch:width===390});
  for(const [name,path] of [['home','/'],['products','/products'],['cans','/products/cans'],['buckets','/products/buckets'],['containers','/products/containers'],['jars','/products/jars'],['custom','/products/custom'],['about','/about']]){
   await page.goto(base+path,{waitUntil:'networkidle0'});
   check(`${name} ${width}: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(`${name} ${width}: visible images decode`,await page.evaluate(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).every(i=>i.complete&&i.naturalWidth>0)));
   if(['home','products','cans','buckets','containers'].includes(name)||width===390)await page.screenshot({path:`docs/screenshots/w07/${name}-${width}.png`,fullPage:true});
  }
 }
 await page.setViewport({width:1440,height:1000});
 await page.goto(base+'/products/cans',{waitUntil:'networkidle0'});
 check('initial count',await count()==='1 of 13');
 await page.click('[aria-label="Next product image"]');check('next',await count()==='2 of 13');
 await page.click('[aria-label="Previous product image"]');check('previous',await count()==='1 of 13');
 await page.click('[aria-label="Previous product image"]');check('wrap',await count()==='13 of 13');
 await page.click('.gallery-thumbnails button:nth-child(3)');check('thumbnail',await count()==='3 of 13');
 check('active thumbnail',await page.$eval('.gallery-thumbnails button:nth-child(3)',e=>e.getAttribute('aria-pressed')==='true'));
 await page.focus('.product-gallery');await page.keyboard.press('ArrowRight');check('keyboard',await count()==='4 of 13');
 await page.setViewport({width:768,height:900});check('resize retains selection',await count()==='4 of 13');
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('catalog-w07')).map(r=>({url:r.name,bytes:r.encodedBodySize})));
 await writeFile('tmp/w07/browser-resources.json',JSON.stringify(resources,null,2));
 await page.setViewport({width:390,height:900,isMobile:true,hasTouch:true});
 await page.goto(base+'/products/cans',{waitUntil:'networkidle0'});
 await page.$eval('.gallery-stage',e=>e.scrollIntoView({block:'center'}));
 const box=await page.$eval('.gallery-stage',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
 const cdp=await page.createCDPSession(),y=box.y+box.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.2,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check('real mobile touch swipe',await count()==='2 of 13');
 await page.goto(base+'/products/jars',{waitUntil:'networkidle0'});check('single image disables navigation',await page.$$eval('.gallery-controls button',els=>els.every(e=>e.disabled)));
 await page.goto(base+'/products/custom',{waitUntil:'networkidle0'});check('custom illustration has no fabricated photo gallery',await page.$('.product-gallery')===null);
 await page.setRequestInterception(true);page.on('request',r=>r.url().includes('catalog-w07-blow')?r.respond({status:404,body:'Missing test image'}):r.continue());
 await page.setCacheEnabled(false);await page.goto(base+'/products/cans',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>{const e=document.querySelector('.gallery-stage img');return e?.src.endsWith('catalog-w07-image-unavailable.svg')&&e.complete&&e.naturalWidth>0;});
 check('broken image displays fallback',true);
 check('no browser JavaScript errors',errors.length===0);
 await writeFile('tmp/w07/gallery-results.json',JSON.stringify({checks:checks.length,passed:checks,errors},null,2));
 console.log(`${checks.length} W07 gallery/browser checks passed`);
}finally{await browser.close();}
