// Local HTTPS/browser simulation only; hostname mapping never reaches GoDaddy.
import {createServer} from 'node:https';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {previewHostname} from '../src/godaddy/policy.js';
const workspace=process.cwd(),directory=resolve(process.argv[2]);
const {createBlockedPreview}=await import(pathToFileURL(resolve(directory,'server/src/godaddy/preview.js')).href);
const env={NODE_ENV:'production',UPMS_HOSTING_PROFILE:'godaddy-preview-blocked',UPMS_DATABASE_PROFILE:'godaddy-managed',MANAGEMENT_ENABLED:'true',PUBLIC_ORIGIN:'https://'+previewHostname,MANAGEMENT_ORIGIN:'https://'+previewHostname,ALLOWED_HOSTS:previewHostname};
process.chdir(directory);const app=createBlockedPreview(env);process.chdir(workspace);
const cert=join(process.env.APPDATA,'ASP.NET/https/upms.client');
const server=createServer({cert:await readFile(cert+'.pem'),key:await readFile(cert+'.key')},app);
await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP '+previewHostname+' 127.0.0.1']});
const checks=[];
try{
  const page=await browser.newPage(),origin='https://'+previewHostname+':'+server.address().port,errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
  const response=await page.goto(origin,{waitUntil:'networkidle0'});assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,'/management');checks.push('HTTPS root redirects to exact-host management screen');
  assert.equal(await page.$eval('h1',e=>e.textContent),'Staff sign in');assert.ok(await page.$eval('[role=status]',e=>e.textContent.includes('disabled')));assert.ok(await page.$eval('fieldset',e=>e.disabled));assert.ok(await page.$eval('button',e=>e.disabled));checks.push('Clearly disabled login with no credential submission');
  assert.equal((await page.cookies()).length,0);checks.push('No session cookie or administrator created');
  const probes=await page.evaluate(async()=>Promise.all(['/api/v1/management/session/login','/about','/.env'].map(async path=>({path,status:(await fetch(path)).status}))));assert.deepEqual(probes.map(p=>p.status),[503,404,404]);checks.push('API blocked and website/private paths denied');
  const shots=resolve('tmp/godaddy-managed/screenshots');await mkdir(shots,{recursive:true});await page.screenshot({path:join(shots,'preview-1440.png'),fullPage:true});
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(shots,'preview-390.png'),fullPage:true});checks.push('Mobile layout without page overflow');
  assert.deepEqual(errors,[]);checks.push('No browser JavaScript errors');
  const result={node:process.version,checks:checks.length,passed:checks,providerAccepted:false,databaseConnections:0,localHttpsSimulation:true,testCertificateValidationBypassedForLocalBrowserOnly:true};
  await writeFile('tmp/godaddy-managed/browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
