import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import puppeteer from 'puppeteer-core';
import {startChequeLauncher} from './uat2-preview.mjs';
const f=JSON.parse(await readFile('tmp/php-runtime/uat2a-repro.json','utf8'));
const app=await startChequeLauncher({port:5197,bindingPath:resolve(f.binding.directory,'binding.json'),directory:f.binding.directory});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await browser.newPage();await page.setViewport({width:1440,height:1100});await page.setCookie({name:'upms_cheque_uat',value:f.cookies['__Host-upms-php'],url:'http://127.0.0.1:5197',httpOnly:true});await page.goto('http://127.0.0.1:5197/management/cheques?id='+f.chequeId);await page.waitForSelector('.cheque-facts',{timeout:30000});await mkdir('docs/uat-2a/evidence/browser',{recursive:true});await page.screenshot({path:'docs/uat-2a/evidence/browser/before-details.png',fullPage:true});await writeFile('docs/uat-2a/evidence/browser/before.json',JSON.stringify({realChrome:true,status:await page.title(),ownerWorkspaceMutated:false}));console.log('Baseline Chrome detail screenshot captured');}finally{await browser.close();await new Promise(done=>app.server.close(done));}
