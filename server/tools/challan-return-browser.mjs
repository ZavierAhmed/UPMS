import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
export async function returnBrowser({db,origin,password,sourceId,checks}){
 const dir='docs/simple-v1/evidence';await mkdir(dir,{recursive:true});
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,env:Object.fromEntries(Object.entries(process.env).filter(([k])=>!/PASSWORD|SECRET|OWNER|MIGRATOR/.test(k))),args:['--disable-extensions','--proxy-server=direct://','--proxy-bypass-list=*']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.setViewport({width:1440,height:1000});
  const click=async text=>{await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text&&!b.disabled),{},text);await page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text).click(),text);};
  const route=async path=>{await page.goto(origin+'/management'+path,{waitUntil:'networkidle0'});await page.waitForFunction(()=>!document.body.innerText.includes('Loading records…'));};
  await route('');await page.type('[name=username]','v1_operator');await page.type('[name=password]',password);await click('Sign in');await page.waitForSelector('.sidebar');
  await route('/documents/'+sourceId);await page.waitForFunction(()=>document.body.innerText.includes('Create Return'));await page.screenshot({path:dir+'/return-original.png',fullPage:true});await click('Create Return');await page.waitForSelector('[name=reason]');await page.type('[name=reason]','Accepted resalable bottles');const quantity=await page.$('input[name^="quantity-"]');await quantity.type('50');await page.screenshot({path:dir+'/return-form.png',fullPage:true});await click('Save Draft');await page.waitForFunction(()=>document.body.innerText.includes('Unnumbered draft'));await page.screenshot({path:dir+'/return-draft.png',fullPage:true});const returnId=page.url().split('/').at(-1);await click('Finalize');await page.waitForFunction(()=>document.body.innerText.includes('DCR-')&&document.body.innerText.includes('POSTED'));await page.screenshot({path:dir+'/return-posted.png',fullPage:true});
  assert.equal((await db('v1_party_journal').where({document_id:returnId})).length,1);assert.equal((await db('v1_stock_journal').where({document_id:returnId})).length,1);
  await page.emulateMediaType('print');await page.screenshot({path:dir+'/return-acknowledgment.png',fullPage:true});
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&getComputedStyle(e).display!=='none'&&e.getClientRects().length).some(e=>/PKR|Client credit|0\.50/.test(e.textContent))),false,'Printed acknowledgment must have no amounts');
  await page.emulateMediaType('screen');await page.reload({waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Finalize')),false);
  await click('Original challan');await page.waitForFunction(()=>document.body.innerText.includes('300'));await page.screenshot({path:dir+'/return-summary.png',fullPage:true});
  await page.setViewport({width:390,height:844});await route('/documents/'+returnId);await page.screenshot({path:dir+'/return-mobile.png',fullPage:true});
  await page.setViewport({width:1440,height:1000});
  const source=await db('v1_documents').where({id:sourceId}).first(),posted=await db('v1_documents').where({id:returnId}).first();
  for(const [path,label]of [['/reports?report=returns','returns'],['/reports?report=movements','stock-movements'],['/ledgers?party='+source.party_id,'client-ledger'],['/company-transactions','company-transactions']]){
   await route(path);await page.waitForFunction(reference=>document.body.innerText.includes(reference),{},posted.official_number);await page.screenshot({path:dir+'/return-'+label+'.png',fullPage:true});
   await page.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=blob=>{window.__returnExport=blob;return original(blob);};});await click('Export Excel');
   const bytes=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await window.__returnExport.arrayBuffer()))));
   assert.ok(bytes.toString().includes(posted.official_number));assert.ok(bytes.toString().includes('DC-0002'));assert.ok(bytes.toString().includes('DELIVERY CHALLAN RETURN'));
   await mkdir('tmp/dcr-exports',{recursive:true});await writeFile('tmp/dcr-exports/'+label+'.xlsx',bytes);
  }
  checks.push('Browser reports and actual XLSX exports: return report, stock movement, client ledger and company transactions retain DCR/original DC and return labels');
  assert.deepEqual(errors,[]);checks.push('Browser: posted challan → Create Return → Save Draft → Finalize → original summary; refresh cannot repost; desktop/mobile screenshots; print acknowledgment has no amounts');
 }finally{await browser.close();}
}
