// Checks an extracted static release served by an isolated Apache with its .htaccess enabled.
import {readFile,readdir,lstat,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const root=resolve(process.argv[2]||'tmp/w072/public-precommit'),base=process.env.STATIC_TEST_ORIGIN||'http://127.0.0.1:3118';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Loopback test origin required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=await readFile('artifacts/upms-public-website.zip');
assert.equal(hash(archive),(await readFile('artifacts/upms-public-website.zip.sha256','utf8')).split(' ')[0]);
const manifest=JSON.parse(await readFile(root+'/release-manifest.json','utf8'));
const actual=[];
async function scan(dir=''){for(const name of await readdir(resolve(root,dir))){const path=dir?dir+'/'+name:name,stat=await lstat(resolve(root,path));assert.ok(!stat.isSymbolicLink());if(stat.isDirectory())await scan(path);else actual.push(path);}}
await scan();assert.deepEqual(actual.sort(),[...Object.keys(manifest.files),'release-manifest.json'].sort());
for(const [path,digest] of Object.entries(manifest.files)){assert.equal(hash(await readFile(resolve(root,path))),digest);assert.ok(!/management|server\/|node_modules|\.env|recovery|fixture|\.sql$/i.test(path));}
assert.equal(manifest.kind,'public-static-only');assert.equal(manifest.routes.length,10);assert.equal(manifest.onlineInquiry,false);
// Prove the same integrity predicate detects changed public bytes without mutating the extracted tree.
assert.notEqual(hash(Buffer.concat([await readFile(root+'/index.html'),Buffer.from('synthetic-corruption')])),manifest.files['index.html']);
const routes=[];for(const path of manifest.routes){const r=await fetch(base+path);assert.equal(r.status,200,path);const body=await r.text();assert.ok(body.includes('public-static-release'));assert.ok(body.includes(`https://unique-plastic.com${path}`));routes.push({path,status:r.status});}
for(const path of ['/products/jars','/missing','/management','/api/v1/management','/server/src/index.js','/.env','/_site/about.html'])assert.equal((await fetch(base+path)).status,404,path);
assert.equal((await fetch(base+'/release-manifest.json')).status,403);
assert.equal((await fetch(base+'/about',{method:'POST'})).status,405);
assert.ok(!(await (await fetch(base+'/sitemap.xml')).text()).includes('/products/jars'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-extensions']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await mkdir('docs/screenshots/w072',{recursive:true});
 for(const width of [1440,768,390]){
  await page.setViewport({width,height:1000});await page.goto(base+'/about',{waitUntil:'networkidle0'});
  const picture=await page.$('.editorial-image img');assert.ok(await picture.evaluate(e=>e.complete&&e.naturalWidth>0&&e.currentSrc.includes('capabilities')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await (await page.$('.products-section .split-content')).screenshot({path:`docs/screenshots/w072/capabilities-${width}.png`});
 }
 await page.goto(base+'/products/cans',{waitUntil:'networkidle0'});await page.click('[aria-label="Next product image"]');assert.equal(await page.$eval('.gallery-controls [aria-live]',e=>e.textContent),'2 of 13');
 await page.goto(base+'/contact',{waitUntil:'networkidle0'});assert.ok(await page.$eval('fieldset',e=>e.disabled));assert.ok((await page.$eval('[role="note"]',e=>e.textContent)).includes('not enabled'));
 assert.deepEqual(errors,[]);
 await writeFile('tmp/w072/static-verification.json',JSON.stringify({manifestFiles:actual.length,checksumFiles:Object.keys(manifest.files).length,routes,privateProbes:8,retired404:true,post405:true,gallery:true,staticInquiryDisabled:true,browserErrors:errors,passed:true},null,2));
 console.log(`Static artifact passed: ${actual.length} files, 10 routes, private/retired probes, real Apache routing, gallery and disabled inquiry`);
}finally{await browser.close();}
