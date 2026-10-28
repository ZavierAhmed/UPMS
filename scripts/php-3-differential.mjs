import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import knex from 'knex';
import express from 'express';
import request from 'supertest';
import {up as identitySchema} from '../server/migrations/202610210001_identity.js';
import {up as v1Schema} from '../server/simple-v1-migrations/202610240001_simple_v1.js';
import {up as entrySchema} from '../server/simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../server/src/identity/service.js';
import {managementRouter} from '../server/src/identity/router.js';
import {today} from '../server/src/simple-v1/exact.js';
import {documentInput} from '../server/src/simple-v1/service.js';
import {canonical} from '../server/src/business/transactions.js';
import {grantPhp3} from './php-2-runtime-grants.mjs';

const php=process.env.PHP3_BINARY,phpArgs=JSON.parse(process.env.PHP3_ARGS||'[]');
assert.ok(php,'Explicit PHP3_BINARY required');assert.ok(process.env.PHP_TEST_ADMIN_PASSWORD,'Isolated admin password required');
const port=3330,host='127.0.0.1',run=Date.now().toString(),directory=resolve('tmp/php-runtime/php3_'+run);
await mkdir(directory,{recursive:false});
const adminConnection={host,port,user:process.env.PHP_TEST_ADMIN_USER||'root',password:process.env.PHP_TEST_ADMIN_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false};
const admin=knex({client:'mysql2',connection:adminConnection,pool:{min:0,max:2}});
const databases=[],evidence=[],checks=[],raceKeys=new Set();
const origin='https://app.unique-plastic.test',base='/api/v1/management',prefix=base+'/simple-v1/';
const password='Synthetic-PHP3-Only-2026!';
function normalize(value){
 if(Array.isArray(value))return value.map(normalize);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>k!=='reference'||!('code'in value)).map(([k,v])=>[k,k==='created_at'?'<generated UTC milliseconds>':normalize(v)]));
 return value;
}
function phpHttp(envFile,input){return new Promise((done,fail)=>{
 const child=spawn(php,[...phpArgs,'upms.php/tests/Support/http-bridge.php'],{cwd:resolve('.'),env:{...process.env,UPMS_PHP2_ENV:envFile},windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';
 child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
 const timer=setTimeout(()=>{child.kill();fail(Error('PHP HTTP bridge timed out'));},20000);
 child.on('error',e=>{clearTimeout(timer);fail(e);});child.on('exit',code=>{clearTimeout(timer);if(code!==0)return fail(Error('PHP bridge failed: '+err.slice(0,300)));try{const r=JSON.parse(out);r.body=r.raw?JSON.parse(r.raw):null;done(r);}catch{fail(Error('Invalid PHP bridge output: '+out.slice(0,300)+' '+err.slice(0,200)));}});
 child.stdin.end(JSON.stringify(input));
});}
function refDriver(app){return{cookies:{},csrf:'',async call(method,path,body,opts={}){
 const headers={'Origin':origin,'Host':'app.unique-plastic.test',...opts.headers};if(this.csrf&&!opts.noCsrf)headers['x-csrf-token']=this.csrf;
 if(opts.key)headers['Idempotency-Key']=opts.key;
 let r=request(app)[method.toLowerCase()](path).set(headers);const cookie=Object.entries(this.cookies).map(([k,v])=>k+'='+v).join('; ');if(cookie)r=r.set('Cookie',cookie);
 if(method!=='GET')r=r.set('Content-Type','application/json').send(opts.raw??JSON.stringify(body??{}));
 const result=await r;for(const cookie of result.headers['set-cookie']||[]){const pair=cookie.split(';')[0],at=pair.indexOf('=');this.cookies[pair.slice(0,at)]=pair.slice(at+1);}
 if(result.body.csrfToken)this.csrf=result.body.csrfToken;
 return{status:result.status,body:result.body};
 }};}
function phpDriver(envFile){return{cookies:{},csrf:'',async call(method,path,body,opts={}){
 const headers={'origin':origin,...opts.headers};if(this.csrf&&!opts.noCsrf)headers['x-csrf-token']=this.csrf;if(opts.key)headers['idempotency-key']=opts.key;
 const r=await phpHttp(envFile,{method,path,headers,cookies:this.cookies,raw:method==='GET'?null:opts.raw??JSON.stringify(body??{})});Object.assign(this.cookies,r.cookies);if(r.body?.csrfToken)this.csrf=r.body.csrfToken;return r;
 }};}
let ref,appDriver,referenceApp,envFile;
async function same(name,method,path,body,opts={}){
 const options=method==='GET'?opts:{key:randomUUID(),...opts};
 const [a,b]=await Promise.all([ref.call(method,path,body,options),appDriver.call(method,path,body,options)]);
 const left=normalize(a.body),right=normalize(b.body);
 try{assert.equal(b.status,a.status);assert.deepEqual(right,left);}catch(error){await writeFile(directory+'/failure.json',JSON.stringify({name,path,expected:a,actual:b},null,2));throw Error(name+' parity failed: Express '+a.status+' / PHP '+b.status+'; '+error.message.slice(0,500));}
 evidence.push({name,method,path,status:a.status,...(a.body?.error?{error:a.body.error.code}:{}),key:options.key||null});
 return a.body;
}
async function both(work){for(const db of databases)await work(db);}
async function snapshot(db){const result={};for(const table of ['v1_control','v1_items','v1_stock','v1_parties','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands']){const order=table==='v1_commands'?'key':table==='v1_stock'?'item_id':'id';result[table]=normalize(await db(table).orderBy(order));if(table==='v1_commands'){result[table]=result[table].map(row=>({...row,key:raceKeys.has(row.key)?'<concurrent-winner>':row.key})).sort((a,b)=>a.key.localeCompare(b.key));}}return result;}
async function tables(name){const a=await snapshot(databases[0]),b=await snapshot(databases[1]);try{assert.deepEqual(b,a);}catch(error){await writeFile(directory+'/table-failure.json',JSON.stringify({name,reference:a,php:b},null,2));throw Error(name+' database parity failed: '+error.message.slice(0,500));}checks.push({name,tables:10,sha256:createHash('sha256').update(JSON.stringify(a)).digest('hex')});}
async function login(a,b,user='php-admin'){await a.call('GET',base+'/session/csrf');await b.call('GET',base+'/session/csrf');const [x,y]=await Promise.all([a.call('POST',base+'/session/login',{username:user,password}),b.call('POST',base+'/session/login',{username:user,password})]);assert.equal(x.status,200);assert.equal(y.status,200);assert.deepEqual(y.body.user,x.body.user);}
try{
 const [[engine]]=await admin.raw('SELECT VERSION() AS version,@@port AS port');assert.match(engine.version,/^10\.11\.19-MariaDB/);assert.equal(Number(engine.port),port);
 for(const side of ['ref','app']){
  const name='upms_test_php_3_'+side+'_'+run;assert.match(name,/^upms_test_php_3_(ref|app)_[0-9]+$/);
  await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[name]);
  const db=knex({client:'mysql2',connection:{...adminConnection,database:name,timezone:'Z'},pool:{min:0,max:6}});databases.push(db);
  await identitySchema(db);await v1Schema(db);await entrySchema(db);
  const identity=createIdentityService(db);await identity.bootstrap({username:'php-admin',displayName:'Synthetic PHP3 administrator',password});
  const [owner]=await db('users').where({id:1});for(const [id,user,role]of [[2,'inventory','inventory'],[3,'other-admin','administrator']]){await db('users').insert({...owner,id,login_key:user,display_name:user});await db('user_roles').insert({user_id:id,role_code:role});}
  await db('v1_control').where({id:1}).update({operator_id:'1',state:'READY',cutover_evidence:'Isolated PHP-3 acceptance only'});
  if(side==='app'){
   const user='php3_'+run,runtimePassword=randomBytes(32).toString('hex');await grantPhp3(admin,name,user,runtimePassword);
   envFile=directory+'/php.env';await writeFile(envFile,`APP_NAME="Unique Plastic Industry"\nAPP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=${origin}\nUPMS_DB_HOST=${host}\nUPMS_DB_PORT=${port}\nUPMS_DB_DATABASE=${name}\nUPMS_DB_USERNAME=${user}\nUPMS_DB_PASSWORD=${runtimePassword}\n`);
  }
 }
 referenceApp=express();referenceApp.use((req,res,next)=>{req.peer={secure:true};next();});referenceApp.use(managementRouter(databases[0],{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-php2-reference',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));
 ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver);
 const date=today(),early='2020-01-01';
 const itemBody={description:'Synthetic PHP3 bottle',quality:'A',colour:'Graphite',packing:'12',sellingPrice:'10.01'};
 const items=[];
 for(let i=0;i<10;i++)items.push(await same('create item '+(i+1),'POST',prefix+'items',{...itemBody,description:'Synthetic PHP3 item '+(i+1)}));
 const client=await same('create client','POST',prefix+'parties',{kind:'CLIENT',name:'Synthetic PHP3 client'}),vendor=await same('create vendor','POST',prefix+'parties',{kind:'VENDOR',name:'Synthetic PHP3 vendor'});
 async function draft(name,body){return same(name+' draft','POST',prefix+'documents',{date,...body});}
 async function post(name,body){const d=await draft(name,body);const r=await same(name+' post','POST',prefix+'documents/'+d.id+'/post',{version:1});return {...d,...r};}
 async function rejectPost(name,body){const d=await draft(name,body);const before=await snapshot(databases[1]);const r=await same(name+' rejected posting','POST',prefix+'documents/'+d.id+'/post',{version:1});assert.ok(r.error,name);assert.deepEqual(await snapshot(databases[1]),before);return d;}
 await post('client opening',{kind:'CLIENT_OPENING',date:early,partyId:client.id,amount:'0',direction:'OWED_TO_COMPANY'});
 await post('vendor opening',{kind:'VENDOR_OPENING',date:early,partyId:vendor.id,amount:'0',direction:'OWED_BY_COMPANY'});
 for(const i of items.slice(0,2).concat(items[9]))await post('stock opening '+i.id,{kind:'STOCK_OPENING',date:early,lines:[{itemId:i.id,quantity:'100'}]});
 const multi=[{itemId:items[9].id,quantity:'3'},{itemId:items[1].id,quantity:'2'},{itemId:items[0].id,quantity:'1'}];
 await post('multi-item production reverse numeric order',{kind:'PRODUCTION',lines:multi});await tables('production stock-only effects and 2-before-10 lock order');
 assert.equal((await databases[1]('v1_party_journal')).length,2);
 for(const [name,body]of [['fractional production',{kind:'PRODUCTION',lines:[{itemId:items[0].id,quantity:'1.5'}]}],['duplicate production lines',{kind:'PRODUCTION',lines:[multi[0],multi[0]]}],['missing production item',{kind:'PRODUCTION',lines:[{itemId:'99999',quantity:'1'}]}]])await same(name,'POST',prefix+'documents',{date,...body});
 await rejectPost('unverified stock',{kind:'PRODUCTION',lines:[{itemId:items[2].id,quantity:'1'}]});
 await rejectPost('production before opening',{kind:'PRODUCTION',date:'2019-12-31',lines:[{itemId:items[0].id,quantity:'1'}]});
 await rejectPost('empty production',{kind:'PRODUCTION',lines:[]});
 const stale=await draft('stale production',{kind:'PRODUCTION',lines:[multi[2]]});
 await same('edit item before production post','PATCH',prefix+'items/'+items[0].id,{...itemBody,description:'Updated bottle',version:1});
 await same('stale production snapshot','POST',prefix+'documents/'+stale.id+'/post',{version:1});
 await same('refresh production draft','PATCH',prefix+'documents/'+stale.id,{date,kind:'PRODUCTION',lines:[multi[2]],version:1});await same('refreshed production post','POST',prefix+'documents/'+stale.id+'/post',{version:2});
 const inactive=await draft('inactive item production',{kind:'PRODUCTION',lines:[multi[1]]});await same('deactivate item','PATCH',prefix+'items/'+items[1].id,{...itemBody,active:false,version:1});await same('inactive production rejected','POST',prefix+'documents/'+inactive.id+'/post',{version:1});await same('reactivate item','PATCH',prefix+'items/'+items[1].id,{...itemBody,active:true,version:2});
 const purchase={kind:'PURCHASE',partyId:vendor.id,reference:'SYN-PUR-1',lines:[{itemId:items[9].id,quantity:'7',rate:'1.23'},{itemId:items[1].id,quantity:'3',rate:'4.56'}]};
 await post('credit purchase',purchase);
 await post('paid cash purchase',{...purchase,reference:'SYN-PUR-CASH',paidImmediately:true,method:'CASH'});
 await post('paid bank purchase',{...purchase,reference:'SYN-PUR-BANK',paidImmediately:true,method:'BANK_TRANSFER'});
 await rejectPost('duplicate normalized purchase reference',{...purchase,reference:' syn-pur-1 '});
 await rejectPost('missing purchase reference',{...purchase,reference:''});
 await rejectPost('immediate purchase missing method',{...purchase,reference:'SYN-BAD-METHOD',paidImmediately:true});
 await rejectPost('immediate purchase cheque unsupported',{...purchase,reference:'SYN-BAD-CHEQUE',paidImmediately:true,method:'CHEQUE_RECEIVED'});
 await rejectPost('zero rate credit purchase',{...purchase,reference:'SYN-ZERO-RATE',lines:[{itemId:items[0].id,quantity:'1',rate:'-1'}]});
 await post('allowed zero rate purchase',{...purchase,reference:'SYN-ALLOWED-ZERO',lines:[{itemId:items[0].id,quantity:'1',rate:'0'}]});
 await rejectPost('purchase invalid rate precision',{...purchase,reference:'SYN-BAD-RATE',lines:[{itemId:items[0].id,quantity:'1',rate:'1.001'}]});
 await rejectPost('purchase wrong party',{...purchase,partyId:client.id,reference:'SYN-WRONG-PARTY'});
 const unverifiedVendor=await same('unverified vendor','POST',prefix+'parties',{kind:'VENDOR',name:'Unverified vendor'});
 await rejectPost('unverified vendor opening',{...purchase,partyId:unverifiedVendor.id,reference:'SYN-UNVERIFIED'});
 await rejectPost('purchase date precedes vendor opening',{...purchase,date:'2019-12-31',reference:'SYN-EARLY'});
 await tables('purchase stock, exact totals, vendor debit-credit effects');
 const challan={kind:'CHALLAN',partyId:client.id,vehicle:'SYN-123',driver:'Synthetic driver',time:'23:59',address:'Synthetic delivery address',lines:[{itemId:items[9].id,quantity:'3',rate:'10.01'},{itemId:items[0].id,quantity:'4',rate:'10.01'}]};
 const noDiscount=await post('no-discount challan',challan);assert.equal(noDiscount.total,'70.07');assert.equal(noDiscount.official_number,'DC-0001');
 const fixed=await post('fixed discount challan',{...challan,discountMode:'FIXED',discountValue:'0.01'});assert.equal(fixed.total,'70.06');
 const percent=await post('percentage discount challan',{...challan,discountMode:'PERCENT',discountValue:'12.50'});assert.equal(percent.total,'61.31');
 for(const [name,body]of [['none with value',{...challan,discountValue:'1'}],['fixed exceeds subtotal',{...challan,discountMode:'FIXED',discountValue:'100'}],['percent over 100',{...challan,discountMode:'PERCENT',discountValue:'100.01'}],['negative discount',{...challan,discountMode:'FIXED',discountValue:'-1'}],['non-decimal discount',{...challan,discountMode:'PERCENT',discountValue:'1e1'}],['bad saved rate',{...challan,lines:[{itemId:items[0].id,quantity:'1',rate:'11'}]}],['invalid local time',{...challan,time:'24:00'}],['future challan',{...challan,date:'2099-01-01'}]])await same(name,'POST',prefix+'documents',{date,...body});
 await rejectPost('zero-total percent blocked',{...challan,discountMode:'PERCENT',discountValue:'100'});
 await rejectPost('zero-total fixed blocked',{...challan,discountMode:'FIXED',discountValue:'70.07'});
 const unverifiedClient=await same('unverified client','POST',prefix+'parties',{kind:'CLIENT',name:'Unverified client'});
 await rejectPost('unverified client opening',{...challan,partyId:unverifiedClient.id});
 await rejectPost('challan wrong party',{...challan,partyId:vendor.id});
 await rejectPost('challan insufficient stock',{...challan,lines:[{itemId:items[0].id,quantity:'9999',rate:'10.01'}]});
 const missingPrice=await same('item price not set','POST',prefix+'items',{...itemBody,sellingPrice:null});await same('reject missing saved price','POST',prefix+'documents',{date,...challan,lines:[{itemId:missingPrice.id,quantity:'1',rate:'10.01'}]});
 const priceDraft=await draft('saved price changes',challan);
 await same('change item saved price','PATCH',prefix+'items/'+items[0].id,{...itemBody,sellingPrice:'11.01',version:2});
 await same('reject changed item version','POST',prefix+'documents/'+priceDraft.id+'/post',{version:1});
 const refreshed={...challan,lines:challan.lines.map(l=>({...l,rate:l.itemId===items[0].id?'11.01':l.rate}))};
 await same('explicitly refresh saved prices','PATCH',prefix+'documents/'+priceDraft.id,{date,...refreshed,version:1});await same('post refreshed prices','POST',prefix+'documents/'+priceDraft.id+'/post',{version:2});
 const tampered=await draft('reviewed discount tamper',{...refreshed,discountMode:'PERCENT',discountValue:'12.50'});
 await both(async db=>{const d=await db('v1_documents').where({id:tampered.id}).first();const p=JSON.parse(d.payload);p.discountSummary.amount='0.01';await db('v1_documents').where({id:tampered.id}).update({payload:JSON.stringify(p)});});
 const beforeTamper=await snapshot(databases[1]);await same('discount review mismatch','POST',prefix+'documents/'+tampered.id+'/post',{version:1});assert.deepEqual(await snapshot(databases[1]),beforeTamper);
 await same('cancel tampered draft','POST',prefix+'documents/'+tampered.id+'/cancel',{version:1,reason:'Discard synthetic tampered draft'});
 await tables('challans, discounts, immutable snapshots and numbering');
 // Cancellation validation and replay use the same command transaction.
 for(const kind of ['PRODUCTION','PURCHASE','CHALLAN','STOCK_OPENING','CLIENT_OPENING','VENDOR_OPENING']){
  const body=kind==='CHALLAN'?refreshed:kind==='PURCHASE'?{...purchase,reference:'SYN-CANCEL'}:kind.endsWith('_OPENING')&&kind!=='STOCK_OPENING'?{kind,partyId:kind==='CLIENT_OPENING'?client.id:vendor.id,amount:'0',direction:'OWED_TO_COMPANY'}:{kind,lines:[{itemId:items[0].id,quantity:'1'}]};
  const d=await draft('cancellation '+kind,body);
  for(const bad of [{version:'1',reason:'valid'},{version:1,reason:'x'},{version:0,reason:'valid'},{version:1,reason:'valid',extra:1}])await same('invalid cancellation '+kind,'POST',prefix+'documents/'+d.id+'/cancel',bad);
  const key=randomUUID();await same('cancel '+kind,'POST',prefix+'documents/'+d.id+'/cancel',{version:1,reason:'Reviewed cancellation'},{key});await same('replay cancel '+kind,'POST',prefix+'documents/'+d.id+'/cancel',{version:1,reason:'Reviewed cancellation'},{key});
  await same('cannot post cancelled '+kind,'POST',prefix+'documents/'+d.id+'/post',{version:1});await same('cannot edit cancelled '+kind,'PATCH',prefix+'documents/'+d.id,{date,...body,version:1});
 }
 await same('posted challan cannot cancel','POST',prefix+'documents/'+noDiscount.id+'/cancel',{version:1,reason:'Cannot cancel posted'});
 await tables('cancellation preserves all journal and number effects');
 // Numeric locking trace: one reversed multi-item production has journals in 1,2,10 order.
 const ordered=await post('numeric-lock-order production',{kind:'PRODUCTION',lines:multi});
 const orderedRows=await databases[1]('v1_stock_journal').where({document_id:ordered.id}).orderBy('id');assert.deepEqual(orderedRows.map(r=>String(r.item_id)),[items[0].id,items[1].id,items[9].id]);checks.push({name:'deterministic numeric stock order',input:[items[9].id,items[1].id,items[0].id],journalOrder:orderedRows.map(r=>String(r.item_id))});
 // Atomic failures at late effects must restore stock, journals and next_dc.
 for(const [name,table]of [['after lines before ledger','v1_party_journal'],['after counter and document before audit','v1_audit'],['after audit before receipt','v1_commands']]){
  const d=await draft('fault '+name,refreshed),key=randomUUID(),before=await snapshot(databases[1]);
  await both(db=>db.raw('CREATE TRIGGER php3_fault BEFORE INSERT ON '+table+" FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic rollback probe'"));
  const r=await same('rollback '+name,'POST',prefix+'documents/'+d.id+'/post',{version:1},{key});assert.equal(r.error.code,'IDENTITY_UNAVAILABLE');assert.deepEqual(await snapshot(databases[1]),before);await tables('rollback '+name);
  await both(db=>db.raw('DROP TRIGGER php3_fault'));await same('retry rollback key '+name,'POST',prefix+'documents/'+d.id+'/post',{version:1},{key});
 }
 // Same-document different-key double-click: one sale, one immutable conflict.
 const double=await draft('double click challan',refreshed),doubleKeys=[randomUUID(),randomUUID()];doubleKeys.forEach(k=>raceKeys.add(k));
 const doubles=await Promise.all([ref,appDriver].map(driver=>Promise.all(doubleKeys.map(key=>driver.call('POST',prefix+'documents/'+double.id+'/post',{version:1},{key})))));
 for(const results of doubles){assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(results.find(r=>r.status===409).body.error.code,'IMMUTABLE_DOCUMENT');}
 assert.deepEqual(doubles[0].map(r=>({status:r.status,body:normalize(r.body)})).sort((a,b)=>a.status-b.status),doubles[1].map(r=>({status:r.status,body:normalize(r.body)})).sort((a,b)=>a.status-b.status));await tables('double-click no duplicate sale');checks.push({name:'different-key same-document posting',successes:1,conflicts:1});
 // Force a consistent lead request while both contenders overlap on the last bottle.
 const last=items[8];await post('last-bottle opening',{kind:'STOCK_OPENING',date:early,lines:[{itemId:last.id,quantity:'1'}]});
 const lastBody={...challan,lines:[{itemId:last.id,quantity:'1',rate:'10.01'}]},a=await draft('last bottle A',lastBody),b=await draft('last bottle B',lastBody);
 await both(db=>db.raw('CREATE TRIGGER php3_pause_stock BEFORE UPDATE ON v1_stock FOR EACH ROW DO SLEEP(2)'));
 const firstKey=randomUUID(),secondKey=randomUUID(),first=Promise.all([ref.call('POST',prefix+'documents/'+a.id+'/post',{version:1},{key:firstKey}),appDriver.call('POST',prefix+'documents/'+a.id+'/post',{version:1},{key:firstKey})]);
 const waiting=new Set();for(let attempt=0;attempt<100&&waiting.size<2;attempt++){const [rows]=await admin.raw("SELECT DB FROM information_schema.PROCESSLIST WHERE STATE='User sleep'");for(const row of rows)if(databases.some(db=>db.client.connectionSettings.database===row.DB))waiting.add(row.DB);if(waiting.size<2)await new Promise(r=>setTimeout(r,10));}assert.equal(waiting.size,2);
 const second=Promise.all([ref.call('POST',prefix+'documents/'+b.id+'/post',{version:1},{key:secondKey}),appDriver.call('POST',prefix+'documents/'+b.id+'/post',{version:1},{key:secondKey})]);
 const [firstResponses,secondResponses]=await Promise.all([first,second]);assert.deepEqual(firstResponses.map(r=>r.status),[200,200]);assert.deepEqual(secondResponses.map(r=>r.status),[409,409]);assert.equal(secondResponses[0].body.error.code,'INSUFFICIENT_STOCK');assert.deepEqual(normalize(firstResponses[0].body),normalize(firstResponses[1].body));assert.deepEqual(normalize(secondResponses[0].body),normalize(secondResponses[1].body));
 await both(db=>db.raw('DROP TRIGGER php3_pause_stock'));await tables('competing challans preserve last bottle and counter');checks.push({name:'concurrent competing challans',observedOverlappingTransactions:2,posted:1,rejected:1,remaining:'0'});
 // Lost HTTP acknowledgement followed by new-process replay.
 const lost=await draft('lost acknowledgement challan',refreshed),lostKey=randomUUID();await Promise.all([ref.call('POST',prefix+'documents/'+lost.id+'/post',{version:1},{key:lostKey}),appDriver.call('POST',prefix+'documents/'+lost.id+'/post',{version:1},{key:lostKey})]);const afterLost=await snapshot(databases[1]);await same('lost response replay','POST',prefix+'documents/'+lost.id+'/post',{version:1},{key:lostKey});assert.deepEqual(await snapshot(databases[1]),afterLost);
 // Kill real transaction connections after all effects, before receipt insertion.
 const killedDraft=await draft('interrupted challan',refreshed),killedKey=randomUUID(),beforeKilled=await snapshot(databases[1]);
 await both(db=>db.raw('CREATE TRIGGER php3_pause_command BEFORE INSERT ON v1_commands FOR EACH ROW DO SLEEP(4)'));
 const pending=Promise.all([ref.call('POST',prefix+'documents/'+killedDraft.id+'/post',{version:1},{key:killedKey}),appDriver.call('POST',prefix+'documents/'+killedDraft.id+'/post',{version:1},{key:killedKey})]);
 const killed=new Set();for(let attempt=0;attempt<250&&killed.size<2;attempt++){const [rows]=await admin.raw("SELECT ID,DB FROM information_schema.PROCESSLIST WHERE STATE='User sleep'");for(const row of rows)if(databases.some(db=>db.client.connectionSettings.database===row.DB)&&!killed.has(row.DB)){assert.match(String(row.ID),/^[0-9]+$/);await admin.raw('KILL CONNECTION '+row.ID);killed.add(row.DB);}if(killed.size<2)await new Promise(r=>setTimeout(r,20));}
 assert.equal(killed.size,2);const interrupted=await pending;assert.deepEqual(interrupted.map(r=>r.status),[503,503]);assert.deepEqual(await snapshot(databases[1]),beforeKilled);await tables('interrupted posting restores next_dc and all journals');await both(db=>db.raw('DROP TRIGGER php3_pause_command'));await same('restart retry interrupted challan','POST',prefix+'documents/'+killedDraft.id+'/post',{version:1},{key:killedKey});checks.push({name:'interrupted transaction recovery',connectionsKilled:2,counterGap:false});
 // Only fixture setup changes numbering to exercise transitions; posting never resets it.
 for(const [n,expected]of [[999,'DC-0999'],[1000,'DC-1000'],[1001,'DC-A0001'],[1002,'DC-A0002'],[10999,'DC-A9999']]){await both(db=>db('v1_control').where({id:1}).update({next_dc:n}));const result=await post('DC boundary '+n,{...refreshed,lines:[{itemId:items[9].id,quantity:'1',rate:'10.01'}]});assert.equal(result.official_number,expected);}
 await rejectPost('DC rollover blocked',{...refreshed,lines:[{itemId:items[9].id,quantity:'1',rate:'10.01'}]});await tables('numbering transitions and rollover atomic refusal');
 // SQL-level denials: no runtime DDL, global access or immutable rewrites.
 const {parseEnv}=await import('node:util');const runtimeEnv=parseEnv(await readFile(envFile,'utf8'));
 const runtime=knex({client:'mysql2',connection:{host,port,database:runtimeEnv.UPMS_DB_DATABASE,user:runtimeEnv.UPMS_DB_USERNAME,password:runtimeEnv.UPMS_DB_PASSWORD},pool:{min:0,max:1}});
 const denied=["UPDATE v1_stock_journal SET delta='0' WHERE id=1","DELETE FROM v1_stock_journal WHERE id=1","UPDATE v1_party_journal SET debit='0' WHERE id=1","DELETE FROM v1_party_journal WHERE id=1","UPDATE v1_lines SET amount='0' WHERE id=1","UPDATE v1_audit SET reason='rewrite' WHERE id=1","DELETE FROM v1_commands","UPDATE v1_commands SET fingerprint='rewrite'","UPDATE v1_documents SET actor_id=3 WHERE id=1","UPDATE v1_documents SET created_at=UTC_TIMESTAMP() WHERE id=1","UPDATE v1_items SET code='REPLACED' WHERE id=1","UPDATE v1_parties SET kind='VENDOR' WHERE id=1","INSERT INTO users(login_key) VALUES('intruder')","DELETE FROM user_roles WHERE user_id=1","UPDATE users SET enabled=0 WHERE id=1","CREATE TABLE php3_forbidden(id INT)","SELECT * FROM mysql.user"];
 try{for(const sql of denied)await assert.rejects(runtime.raw(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_COLUMNACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));}finally{await runtime.destroy();}checks.push({name:'SQL least-privilege denials',denied:denied.length});
 for(const kind of ['CHALLAN_RETURN','CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE','STOCK_CORRECTION','OPENING_CORRECTION','PAYMENT_REVERSAL']){
  const before=await snapshot(databases[1]);const r=await appDriver.call('POST',prefix+'documents',{kind,date},{key:randomUUID()});assert.equal(r.status,501);
  const raw={kind,date},key=randomUUID();let id;
  await both(async db=>{const [saved]=await db('v1_documents').insert({kind,date,party_id:null,status:'DRAFT',version:1,payload:JSON.stringify({...documentInput.parse({...raw,...(['STOCK_CORRECTION','OPENING_CORRECTION','PAYMENT_REVERSAL'].includes(kind)?{reason:'Synthetic blocked fixture'}:{})}),entryVersion:2}),actor_id:'1',created_at:new Date()});id=String(saved);await db('v1_commands').insert({key,actor_id:'1',fingerprint:createHash('sha256').update(canonical({operation:'document.draft:undefined',input:raw})).digest('hex'),result:JSON.stringify({id})});});
  const seeded=await snapshot(databases[1]);for(const [method,path,body,k]of [['POST','documents/'+id+'/post',{version:1},randomUUID()],['POST','documents/'+id+'/cancel',{version:1,reason:'Blocked unsupported'},randomUUID()],['PATCH','documents/'+id,{date,kind:'PRODUCTION',lines:[multi[2]],version:1},randomUUID()],['POST','documents',raw,key]]){const denied=await appDriver.call(method,prefix+path,body,{key:k});assert.equal(denied.status,501);}assert.deepEqual(await snapshot(databases[1]),seeded);
 }
 const protectedDraft=await draft('protected cancellation',{kind:'PRODUCTION',lines:[multi[1]]});
 const cancelPath=prefix+'documents/'+protectedDraft.id+'/cancel',cancelBody={version:1,reason:'Synthetic authorized cancellation'},cancelKey=randomUUID();
 for(const [name,opts]of [['missing UUID',{key:undefined}],['invalid UUID',{key:'not-a-uuid'}],['missing CSRF',{noCsrf:true}],['untrusted origin',{headers:{origin:'https://attacker.test'}}]])await same('cancel '+name,'POST',cancelPath,cancelBody,opts);
 await same('cancel canonical command','POST',cancelPath,cancelBody,{key:cancelKey});await same('cancel reordered canonical replay','POST',cancelPath,{reason:cancelBody.reason,version:1},{key:cancelKey});await same('cancel same-key conflict','POST',cancelPath,{...cancelBody,reason:'Different cancellation reason'},{key:cancelKey});
 const oldRef=ref,oldPhp=appDriver;ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver,'other-admin');await both(db=>db('v1_control').where({id:1}).update({operator_id:'3'}));await same('cancel actor-bound replay','POST',cancelPath,cancelBody,{key:cancelKey});await both(db=>db('v1_control').where({id:1}).update({operator_id:'1'}));
 ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver,'inventory');await same('non-operator cannot post','POST',prefix+'documents/'+protectedDraft.id+'/post',{version:1});await same('non-operator cannot cancel','POST',cancelPath,cancelBody);ref=oldRef;appDriver=oldPhp;
 for(const path of ['state','items','parties?kind=CLIENT','parties?kind=VENDOR','documents','overview','movements','register','ledgers/'+client.id,'ledgers/'+vendor.id,'documents/'+percent.id])await same('read after all writes '+path,'GET',prefix+path);
 const recon=await same('final reconciliation','GET',prefix+'reconciliation');assert.equal(recon.matched,true);await tables('final stock, ledger, audit, command and counter state');
 const report={run,phpBinary:php,engine:engine.version,schemas:databases.map(d=>d.client.connectionSettings.database),httpComparisons:evidence.length,snapshotComparisons:checks.filter(c=>c.tables).length,evidence,checks,ownerDatabaseContacted:false,migrationsModified:false};
 await writeFile(directory+'/evidence.json',JSON.stringify(report,null,2));await writeFile('tmp/php-runtime/php3-latest.json',JSON.stringify({directory,envFile,report:directory+'/evidence.json'}));console.log(JSON.stringify({passed:true,httpComparisons:evidence.length,snapshots:report.snapshotComparisons,checks:checks.length,evidence:directory+'/evidence.json',ownerDatabaseContacted:false}));
}finally{for(const db of databases)await db.destroy();await admin.destroy();}
