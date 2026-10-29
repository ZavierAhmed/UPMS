import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import https from 'node:https';
import {checkFrameDenials} from './php-7-8-frames.mjs';
import knex from 'knex';
import {createHash} from 'node:crypto';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
const setup=JSON.parse(await readFile(process.env.PHP_SECURITY_SETUP||'tmp/php-runtime/php78-uat-latest.json'));
const credentials=JSON.parse(await readFile(setup.directory+'/credentials.json'));
const origin=setup.managementOrigin,publicOrigin=setup.publicOrigin,checks=[],responses=[],violations=[],errors=[];
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,acceptInsecureCerts:true});
const authResponses=[];const page=await browser.newPage();page.on('response',r=>{if(/\/session\/(login|logout)$/.test(r.url()))authResponses.push({label:'authentication '+new URL(r.url()).pathname,status:r.status(),headers:r.headers()});});await page.setViewport({width:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
await page.evaluateOnNewDocument(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.violatedDirective,blocked:e.blockedURI}));});
function headers(label,status,h){assert.match(h['content-security-policy'],/frame-ancestors 'none'/);assert.ok(!h['content-security-policy'].includes('unsafe-inline'));assert.equal(h['x-frame-options'],'DENY');assert.equal(h['x-content-type-options'],'nosniff');assert.match(h['cache-control'],/no-store/);responses.push({label,status,headers:h});}
async function api(path,method='GET',body,extra={}){const r=await page.evaluate(async({path,method,body,extra})=>{const r=await fetch('/api/v1/management/'+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});return{status:r.status,headers:Object.fromEntries(r.headers),body:await r.json().catch(()=>null)};},{path,method,body,extra});headers(method+' '+path,r.status,r.headers);return r;}
async function button(text){for(const b of await page.$$('button'))if(await b.evaluate((e,t)=>e.textContent.trim()===t,text)){await b.click();return;}throw Error('Missing '+text);}
async function go(path=''){const r=await page.goto(origin+'/management/'+path,{waitUntil:'networkidle0'});headers('HTML '+path,r.status(),r.headers());violations.push(...await page.evaluate(()=>window.__csp||[]));return r;}
try{
 await go();assert.equal((await api('simple-v1/items')).status,401);checks.push('Unauthorized read denied with headers');
 const csrf=await api('session/csrf');assert.equal(csrf.status,200);
 assert.equal((await api('session/login','POST',{username:credentials.username,password:'synthetic-invalid'})).status,403);checks.push('Missing CSRF rejected');
 await page.type('[name=username]',credentials.username);await page.type('[name=password]',credentials.password);await button('Sign in');await page.waitForSelector('.operations-dashboard');
 const current=await api('session/current'),token=current.body.csrfToken;
 const cookie=(await browser.cookies()).find(c=>c.name.startsWith('__Host-'));assert.ok(cookie);assert.equal(cookie.secure,true);assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'Strict');assert.equal(cookie.path,'/');checks.push('Actual login and secure host cookie');
 const before=(await api('simple-v1/documents')).body;
 for(const csrf of [undefined,'invalid']){assert.equal((await api('simple-v1/documents','POST',{kind:'PRODUCTION'},csrf?{'X-CSRF-Token':csrf}:{})).status,403);}
 assert.equal((await api('simple-v1/documents','POST','{invalid',{'X-CSRF-Token':token})).status,400);
 await page.setRequestInterception(true);const cross=r=>r.continue({headers:{...r.headers(),origin:'https://untrusted.invalid','sec-fetch-site':'cross-site'}});page.on('request',cross);const rejected=await api('simple-v1/documents','POST',{kind:'PRODUCTION'},{'X-CSRF-Token':token});page.off('request',cross);await page.setRequestInterception(false);assert.equal(rejected.status,403);assert.equal(rejected.body.error.code,'ORIGIN_REJECTED');
 assert.deepEqual((await api('simple-v1/documents')).body,before);checks.push('Invalid JSON, invalid CSRF and cross-origin requests rejected without document effects');
 const malformed=await new Promise((resolve,reject)=>https.get(origin+'/api/v1/management/session/current',{rejectUnauthorized:false,headers:{Cookie:'__Host-upms-php[bad]=synthetic'}},r=>{r.resume();resolve({status:r.statusCode,headers:r.headers});}).on('error',reject));headers('Laravel malformed-cookie error',malformed.status,malformed.headers);assert.equal(malformed.status,503);checks.push('Actual Laravel exception response retains headers');
 const routes=['','items','items/new','stock-in','stock-in/new?kind=PRODUCTION','challans','challans/new','challan-returns','clients','vendors','client-payments','vendor-payments','expenses','company-transactions','reports','reports?report=movements','ledgers','settings'];
 for(const r of routes){await go(r);await page.waitForSelector('main h1');assert.ok(!(await page.$eval('main',e=>e.innerText)).includes('Page not available'),r);}checks.push('18 management routes usable');
 const assets=await page.$$eval('script[src],link[rel=stylesheet]',es=>es.map(e=>e.src||e.href));for(const url of assets){const result=await page.evaluate(async url=>{const r=await fetch(url);return{status:r.status,headers:Object.fromEntries(r.headers)};},url);headers('static '+new URL(url).pathname,result.status,result.headers);assert.equal(result.status,200);}checks.push('Actual JavaScript and styles served with policy');
 for(const path of ['/missing-file.js','/.env','/server.key']){const result=await new Promise((resolve,reject)=>https.get(origin+path,{rejectUnauthorized:false},r=>{r.resume();resolve({status:r.statusCode,headers:r.headers});}).on('error',reject));headers('Apache '+path,result.status,result.headers);assert.ok([403,404].includes(result.status));}checks.push('Apache errors retain headers');
 await go();await button('Sign out');await page.waitForSelector('[name=username]');assert.equal((await api('session/current')).status,401);checks.push('Logout invalidates session');
 // Expire only this fresh synthetic session, never an owner schema or administrator credential.
 await go();
 await page.type('[name=username]',credentials.username);await page.type('[name=password]',credentials.password);await button('Sign in');await page.waitForSelector('.operations-dashboard');
 const liveCookie=(await browser.cookies()).find(c=>c.name===cookie.name);await verifyUatEngine();assert.match(setup.database,/^upms_test_php_6_browser_\d+$/);
 const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json'));const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,database:setup.database},pool:{min:0,max:1}});
 try{assert.equal(await db('sessions').where({token_hash:createHash('sha256').update(liveCookie.value).digest('hex'),revoked:0}).update({idle_expires:1}),1);}finally{await db.destroy();}
 assert.equal((await api('session/current')).status,401);checks.push('Actual server idle expiry denies a formerly valid browser session');
 await browser.setCookie({...cookie,expires:Math.floor(Date.now()/1000)-60});assert.equal((await api('session/current')).status,401);checks.push('Expired browser cookie is not authenticated');
 const publicPage=await browser.newPage();await publicPage.evaluateOnNewDocument(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));});const publicResponse=await publicPage.goto(publicOrigin,{waitUntil:'networkidle0'});assert.equal(publicResponse.status(),200);assert.equal(publicResponse.headers()['x-frame-options'],'DENY');assert.deepEqual(await publicPage.evaluate(()=>window.__csp),[]);checks.push('Public rendering unaffected');
 // Actual ephemeral HTTPS parent avoids Local Network Access masking CSP.
 const frameChecks=await checkFrameDenials(browser,setup),frameLogs=frameChecks.flatMap(c=>c.denials);checks.push('Positive iframe controls and individual negative private/public embedding checks');


 for(const r of authResponses)headers(r.label,r.status,r.headers);assert.ok(authResponses.some(r=>r.status===200));assert.ok(authResponses.some(r=>r.status===204));checks.push('Actual successful login and logout response headers');
 violations.push(...await page.evaluate(()=>window.__csp||[]));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
 const result={passed:true,checks:checks.length,evidence:checks,responses,cspViolations:violations,javascriptErrors:errors,frameChecks,expectedFrameDenials:frameLogs.filter(s=>/frame-ancestors|X-Frame-Options|Refused to frame|Framing/.test(s)),ownerSignoff:'PENDING OWNER'};await writeFile('tmp/php-runtime/php78/security-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,checks:checks.length,responses:responses.length,cspViolations:0}));
}finally{await browser.close();}
