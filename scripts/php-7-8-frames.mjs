import assert from 'node:assert/strict';
import https from 'node:https';
import {readFile} from 'node:fs/promises';

export async function checkFrameDenials(browser,setup){
 const cert=await readFile(setup.directory+'/server.crt'),key=await readFile(setup.directory+'/server.key'),checks=[];
 for(const target of [setup.managementOrigin+'/management/',setup.publicOrigin+'/']){
  // An actual TLS loopback response establishes Local address space; intercepted parents do not.
  const server=https.createServer({cert,key},(_request,response)=>{response.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});response.end('<!doctype html><iframe id="positive" srcdoc="<p>Allowed control</p>"></iframe><iframe id="denied" src="'+target+'"></iframe>');});
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
  const page=await browser.newPage(),logs=[],failures=[],issues=[];const cdp=await page.createCDPSession();await cdp.send('Log.enable');await cdp.send('Audits.enable');cdp.on('Log.entryAdded',({entry})=>logs.push(entry.text));cdp.on('Audits.issueAdded',({issue})=>issues.push(issue));page.on('requestfailed',r=>failures.push({url:r.url(),reason:r.failure()?.errorText}));
  try{
   await page.goto('https://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle0'});
   assert.equal(await (await page.$('#positive')).contentFrame().then(f=>f.$eval('p',e=>e.textContent)),'Allowed control');
   const child=await (await page.$('#denied')).contentFrame();assert.ok(child);assert.ok(!child.url().startsWith(target));
   assert.ok(!failures.some(f=>/LOCAL_NETWORK|CERT_|CONNECTION_REFUSED/.test(f.reason)),JSON.stringify(failures));
   const denials=[...new Set(logs.filter(s=>/frame-ancestors|X-Frame-Options|Refused to frame|Framing/.test(s)))];const cspIssues=issues.filter(i=>i.code==='ContentSecurityPolicyIssue');assert.ok(denials.length||cspIssues.length,target+' must have actual CSP/frame denial evidence');
   checks.push({target,positiveControl:true,blockedChildUrl:child.url(),denials,cspIssues,requestFailures:failures});
  }finally{await page.close();await new Promise(done=>server.close(done));}
 }
 return checks;
}
