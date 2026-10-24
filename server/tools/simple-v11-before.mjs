import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createApp} from '../src/app.js';
import {identityConfig} from '../src/identity/config.js';
import {createDatabase} from '../src/identity/database.js';
import {snapshots} from './business-operations.mjs';
assert.equal(process.env.DB_NAME,'upms_test_simplev11_demo_20261024_01');
const db=createDatabase(),before=await snapshots(db);let app;
const server=createServer((req,res)=>app(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
app=createApp({identityDatabase:db,management:{...identityConfig(),origin,root:'tmp/v11-baseline/upms.client/dist/management'}});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,env:Object.fromEntries(Object.entries(process.env).filter(([k])=>!/PASSWORD|SECRET|OWNER|MIGRATOR/.test(k))),args:['--disable-extensions','--proxy-server=direct://','--proxy-bypass-list=*']});
try{const page=await browser.newPage();await page.setViewport({width:1440,height:1000});await page.goto(origin+'/management');await page.type('[name=username]','v1_operator');await page.type('[name=password]',process.env.V1_OPERATOR_PASSWORD);await page.click('button');await page.waitForFunction(()=>document.body.innerText.includes('Available bottle stock'));
 await mkdir('tmp/simple-v11-before',{recursive:true});const measurements=[];
 for(const width of [1440,768,390]){await page.setViewport({width,height:1000});for(const path of ['/items/new','/clients/new','/vendors/new','/stock-in/new','/stock-in/new?kind=PURCHASE','/challans/new','/client-payments/new','/vendor-payments/new','/reports','/settings']){await page.goto(origin+'/management'+path);await page.waitForFunction(()=>document.querySelector('h1')&&!document.body.innerText.includes('Loading records…'));measurements.push({width,path,...await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,fields:[...document.querySelectorAll('.v1-form input:not([type=hidden]),.v1-form select')].map(e=>{const r=e.getBoundingClientRect();return {name:e.name,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};})}))});await page.screenshot({path:'tmp/simple-v11-before/'+path.split('?')[0].replaceAll('/','-')+(path.includes('PURCHASE')?'-purchase':'')+'-'+width+'.png',fullPage:true});}}
 await writeFile('tmp/simple-v11-before/measurements.json',JSON.stringify({sourceRevision:'435eee019e45d0aa550d5ac6a8d83c87eaa130f3',measurements},null,2));const after=await snapshots(db);for(const [name,table]of Object.entries(before))if(name.startsWith('v1_'))assert.deepEqual(after[name],table);console.info(JSON.stringify({baselineFormsCaptured:30,businessUnchanged:true}));
}finally{await browser.close();await new Promise(r=>{server.close(r);server.closeIdleConnections();});await db.destroy();}
