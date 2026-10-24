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
const server=createServer((req,res)=>app(req,res));await new Promise(r=>server.listen(action==='serve'?3113:0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
  app=currentApp({identityDatabase:db,management:{...identityConfig(),origin}});
  if(['freshness','freshnesscontinue'].includes(action))await freshnessBrowser({db,origin});
  else if(action==='regression')await financialBrowserRegression({db,origin});
  else if(action==='browser'||action==='review')await v12Browser({db,origin,readonly:action==='review'});
  else if(action==='seed'){
   assert.equal(process.env.DB_NAME,'upms_test_simplev12a_demo_20261024_01');assert.equal((await db('v1_items')).length,0);assert.equal((await db('v1_documents')).length,0);let cookie='',csrf;
   async function call(path,body){const r=await fetch(origin+'/api/v1/management'+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf||'','Idempotency-Key':randomUUID()}:{})},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(r.ok);return r.json();}
   csrf=(await call('/session/csrf')).csrfToken;csrf=(await call('/session/login',{username:'v1_operator',password:process.env.V1_OPERATOR_PASSWORD})).csrfToken;const cmd=(p,b)=>call('/simple-v1'+p,b),date=today(),post=async b=>{const d=await cmd('/documents',{date,...b});return cmd('/documents/'+d.id+'/post',{version:1});},items=[];
   for(const [description,colour,sellingPrice]of [['DEMO Test Bottle','Black','25'],['DEMO Test Bottle White','White','30']]){const i=await cmd('/items',{description,quality:'Recycle',colour,packing:'DT2',sellingPrice});items.push(i.id);await post({kind:'STOCK_OPENING',lines:[{itemId:i.id,quantity:'0'}]});}
   const client=(await cmd('/parties',{kind:'CLIENT',name:'DEMO V1.2A Client'})).id,vendor=(await cmd('/parties',{kind:'VENDOR',name:'DEMO V1.2A Vendor'})).id;for(const [kind,id,direction]of [['CLIENT',client,'OWED_TO_COMPANY'],['VENDOR',vendor,'OWED_BY_COMPANY']])await post({kind:kind+'_OPENING',partyId:id,amount:'0',direction});await post({kind:'PRODUCTION',lines:[{itemId:items[0],quantity:'500'}]});await post({kind:'CHALLAN',partyId:client,discountMode:'PERCENT',discountValue:'10',lines:[{itemId:items[0],quantity:'200',rate:'25'}]});await writeFile('server/.local/simple-v12a/demo-seeded.json',JSON.stringify({items,client,vendor,stock:'300',clientReceivable:'4500.00',synthetic:true}),{flag:'wx'});console.info(JSON.stringify({seeded:true,stock:300,clientReceivable:'4500.00'}));
  }else if(action==='serve'){
   assert.equal(process.env.DB_NAME,'upms_test_simplev12a_demo_20261024_01');const {cp,access,readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),buildHash=createHash('sha256').update(await readFile('upms.client/dist/management/index.html')).digest('hex');let root='server/.local/simple-v12a/ui-'+buildHash.slice(0,12);try{await access(root+'/index.html');}catch(e){if(e.code!=='ENOENT')throw e;await cp('upms.client/dist/management',root,{recursive:true,errorOnExist:true,force:false});}app=currentApp({identityDatabase:db,management:{...identityConfig(),origin,root}});await writeFile('server/.local/simple-v12a/demo-server.json',JSON.stringify({pid:process.pid,port:3113,schema:process.env.DB_NAME,uiRoot:root,buildHash,synthetic:true}),{flag:'wx'});console.info('Synthetic V1.2A UAT http://127.0.0.1:3113/management');await new Promise(resolve=>{process.on('SIGTERM',resolve);process.on('SIGINT',resolve);});
  }else throw Error('Unknown action');

}finally{await new Promise(r=>{server.close(r);server.closeIdleConnections();});await db.destroy();}
