import {paymentReview} from './simple-v12b-review.mjs';
import {paymentBrowser} from './simple-v12b-payment-browser.mjs';
import {reproducePayment} from './simple-v12b-reproduce.mjs';
import {freshnessBrowser} from './simple-v12a-freshness-browser.mjs';
import {financialBrowserRegression} from './simple-v12-regression-browser.mjs';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createDatabase} from '../src/identity/database.js';
import {identityConfig} from '../src/identity/config.js';
import {today} from '../src/simple-v1/exact.js';
import {createApp as currentApp} from '../src/app.js';
import {v12Browser} from './simple-v12-browser.mjs';
const action=process.argv[2],db=createDatabase();let app;
const server=createServer((req,res)=>app(req,res));await new Promise(r=>server.listen(action==='serve'?3114:0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
  if(action==='reproduce'){const {createApp}=await import('../../tmp/v12b-baseline/server/src/app.js');const old=JSON.parse(await (await import('node:fs/promises')).readFile('server/.local/simple-v12a/demo-server.json','utf8'));app=createApp({identityDatabase:db,management:{...identityConfig(),origin,root:old.uiRoot}});}else app=currentApp({identityDatabase:db,management:{...identityConfig(),origin}});
  if(action==='paymentreview')await paymentReview({db,origin});
  else if(action==='paymentbrowser')await paymentBrowser({db,origin});
  else if(action==='reproduce')await reproducePayment({db,origin});
  else if(['freshness','freshnesscontinue'].includes(action))await freshnessBrowser({db,origin});
  else if(action==='regression')await financialBrowserRegression({db,origin});
  else if(action==='browser'||action==='review')await v12Browser({db,origin,readonly:action==='review'});
  else if(action==='seed'){
   assert.equal(process.env.DB_NAME,'upms_test_simplev12b_demo_20261024_01');assert.equal((await db('v1_items')).length,0);assert.equal((await db('v1_documents')).length,0);let cookie='',csrf;
   async function call(path,body){const r=await fetch(origin+'/api/v1/management'+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf||'','Idempotency-Key':randomUUID()}:{})},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(r.ok);return r.json();}
   csrf=(await call('/session/csrf')).csrfToken;csrf=(await call('/session/login',{username:'v1_operator',password:process.env.V1_OPERATOR_PASSWORD})).csrfToken;const cmd=(p,b)=>call('/simple-v1'+p,b),date=today(),post=async b=>{const d=await cmd('/documents',{date,...b});return cmd('/documents/'+d.id+'/post',{version:1});},items=[];
   for(const [description,colour,sellingPrice]of [['DEMO Test Bottle','Black','25'],['DEMO Test Bottle White','White','30']]){const i=await cmd('/items',{description,quality:'Recycle',colour,packing:'DT2',sellingPrice});items.push(i.id);await post({kind:'STOCK_OPENING',lines:[{itemId:i.id,quantity:'0'}]});}
   const client=(await cmd('/parties',{kind:'CLIENT',name:'DEMO V1.2B Client'})).id,vendor=(await cmd('/parties',{kind:'VENDOR',name:'DEMO V1.2B Vendor'})).id;for(const [kind,id,direction]of [['CLIENT',client,'OWED_TO_COMPANY'],['VENDOR',vendor,'OWED_BY_COMPANY']])await post({kind:kind+'_OPENING',partyId:id,amount:kind==='CLIENT'?'5000':'3000',direction});await post({kind:'PRODUCTION',lines:[{itemId:items[0],quantity:'500'}]});await post({kind:'CHALLAN',partyId:client,discountMode:'PERCENT',discountValue:'10',lines:[{itemId:items[0],quantity:'200',rate:'25'}]});const receipt=await post({kind:'CLIENT_PAYMENT',partyId:client,amount:'1000',method:'CASH'}),vendorPayment=await post({kind:'VENDOR_PAYMENT',partyId:vendor,amount:'1000',method:'CASH'}),draftPayment=await cmd('/documents',{date,kind:'CLIENT_PAYMENT',partyId:client,amount:'1000',method:'CASH'});await writeFile('server/.local/simple-v12b/demo-seeded.json',JSON.stringify({items,client,vendor,stock:'300',clientReceivable:'8500.00',vendorPayable:'2000.00',receipt:receipt.id,vendorPayment:vendorPayment.id,draftPayment:draftPayment.id,synthetic:true}),{flag:'wx'});console.info(JSON.stringify({seeded:true,stock:300,clientReceivable:'8500.00',draftPayment:draftPayment.id}));
  }else if(action==='serve'){
   assert.equal(process.env.DB_NAME,'upms_test_simplev12b_demo_20261024_01');const {cp,access,readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),buildHash=createHash('sha256').update(await readFile('upms.client/dist/management/index.html')).digest('hex');let root='server/.local/simple-v12b/ui-'+buildHash.slice(0,12);try{await access(root+'/index.html');}catch(e){if(e.code!=='ENOENT')throw e;await cp('upms.client/dist/management',root,{recursive:true,errorOnExist:true,force:false});}app=currentApp({identityDatabase:db,management:{...identityConfig(),origin,root}});await writeFile('server/.local/simple-v12b/demo-server.json',JSON.stringify({pid:process.pid,port:3114,schema:process.env.DB_NAME,uiRoot:root,buildHash,synthetic:true}),{flag:'wx'});console.info('Synthetic V1.2B UAT http://127.0.0.1:3114/management');await new Promise(resolve=>{process.on('SIGTERM',resolve);process.on('SIGINT',resolve);});
  }else throw Error('Unknown action');

}finally{await new Promise(r=>{server.close(r);server.closeIdleConnections();});await db.destroy();}
