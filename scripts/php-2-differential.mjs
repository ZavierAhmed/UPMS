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
import {grantPhp2} from './php-2-runtime-grants.mjs';

const php=process.env.PHP2_BINARY,phpArgs=JSON.parse(process.env.PHP2_ARGS||'[]');
assert.ok(php,'Explicit PHP2_BINARY required');assert.ok(process.env.PHP_TEST_ADMIN_PASSWORD,'Isolated admin password required');
const port=3330,host='127.0.0.1',run=Date.now().toString(),directory=resolve('tmp/php-runtime/php2_'+run);
await mkdir(directory,{recursive:false});
const adminConnection={host,port,user:process.env.PHP_TEST_ADMIN_USER||'root',password:process.env.PHP_TEST_ADMIN_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false};
const admin=knex({client:'mysql2',connection:adminConnection,pool:{min:0,max:2}});
const databases=[],evidence=[],checks=[],raceKeys=new Set();
const origin='https://app.unique-plastic.test',base='/api/v1/management',prefix=base+'/simple-v1/';
const password='Synthetic-PHP2-Only-2026!';
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
  const name='upms_test_php_2_'+side+'_'+run;assert.match(name,/^upms_test_php_2_(ref|app)_[0-9]+$/);
  await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[name]);
  const db=knex({client:'mysql2',connection:{...adminConnection,database:name,timezone:'Z'},pool:{min:0,max:6}});databases.push(db);
  await identitySchema(db);await v1Schema(db);await entrySchema(db);
  const identity=createIdentityService(db);await identity.bootstrap({username:'php-admin',displayName:'Synthetic PHP2 administrator',password});
  const [owner]=await db('users').where({id:1});for(const [id,user,role]of [[2,'inventory','inventory'],[3,'other-admin','administrator']]){await db('users').insert({...owner,id,login_key:user,display_name:user});await db('user_roles').insert({user_id:id,role_code:role});}
  await db('v1_control').where({id:1}).update({operator_id:'1',state:'READY',cutover_evidence:'Isolated PHP-2 acceptance only'});
  if(side==='app'){
   const user='php2_'+run,runtimePassword=randomBytes(32).toString('hex');await grantPhp2(admin,name,user,runtimePassword);
   envFile=directory+'/php.env';await writeFile(envFile,`APP_NAME="Unique Plastic Industry"\nAPP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=${origin}\nUPMS_DB_HOST=${host}\nUPMS_DB_PORT=${port}\nUPMS_DB_DATABASE=${name}\nUPMS_DB_USERNAME=${user}\nUPMS_DB_PASSWORD=${runtimePassword}\n`);
  }
 }
 referenceApp=express();referenceApp.use((req,res,next)=>{req.peer={secure:true};next();});referenceApp.use(managementRouter(databases[0],{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-php2-reference',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));
 ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver);
 const itemBody={description:'\u00a0Synthetic bottle 🔒\u00a0',quality:'A',colour:'Graphite',packing:'12',sellingPrice:'0010.01',reason:'0'};
 const itemKey=randomUUID();const item=await same('create item','POST',prefix+'items',itemBody,{key:itemKey});
 await same('replay reordered request','POST',prefix+'items',Object.fromEntries(Object.entries(itemBody).reverse()),{key:itemKey});
 await same('different input conflicts','POST',prefix+'items',{...itemBody,description:'Changed'},{key:itemKey});
 for(const [name,body]of [['missing fields',{}],['invalid types',{description:null,quality:3,colour:false,packing:[],active:'true',sellingPrice:0}],['unknown field',{...itemBody,extra:1}],['zero selling price',{...itemBody,sellingPrice:'0'}],['negative selling price',{...itemBody,sellingPrice:'-1'}],['overprecision price',{...itemBody,sellingPrice:'1.001'}],['scientific price',{...itemBody,sellingPrice:'1e2'}],['manual item code',{...itemBody,code:'ABC'}],['invalid code',{...itemBody,code:'!'}],['invalid version',{...itemBody,version:0}],['noninteger numeric JSON',{...itemBody,version:1.2}],['unsafe exact value',{...itemBody,extra:9007199254740992}],['Unicode length',{...itemBody,description:'🔒'.repeat(101)}]])await same(name,'POST',prefix+'items',body);
 for(const key of ['bad', '12345678-1234-0234-8234-123456789abc', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'])await same('invalid UUID '+key,'POST',prefix+'items',itemBody,{key});
 await same('missing UUID','POST',prefix+'items',itemBody,{key:null});
 await same('array input validation','POST',prefix+'items',[]);
 await same('array invalid key precedence','POST',prefix+'items',[],{key:'bad'});
 await same('invalid JSON transport error','POST',prefix+'items',null,{raw:'{invalid'});
 await same('nil UUID','POST',prefix+'items',{...itemBody,description:'Nil UUID',sellingPrice:null},{key:'00000000-0000-0000-0000-000000000000'});
 await same('max UUID','POST',prefix+'items',{...itemBody,description:'Max UUID',sellingPrice:''},{key:'ffffffff-ffff-ffff-ffff-ffffffffffff'});
 await same('inactive item update','PATCH',prefix+'items/'+item.id,{...itemBody,active:false,version:1});
 await same('stale item update','PATCH',prefix+'items/'+item.id,{...itemBody,version:1});
 await same('immutable item code','PATCH',prefix+'items/'+item.id,{...itemBody,version:2,code:'OTHER'});
 await same('immutable code same value','PATCH',prefix+'items/'+item.id,{...itemBody,version:2,code:item.code,active:true});
 await same('invalid route ID','PATCH',prefix+'items/0',{...itemBody,version:3});
 await same('missing item','PATCH',prefix+'items/99999',{...itemBody,version:1});
 await tables('item writes and validation');
 const clientBody={kind:'CLIENT',name:' Synthetic client ',phone:' 0300-TEST ',address:'Test address',remarks:'0',reason:'0'};
 const client=await same('create client','POST',prefix+'parties',clientBody);
 const vendor=await same('create vendor','POST',prefix+'parties',{kind:'VENDOR',name:'Synthetic vendor'});
 for(const [name,body]of [['duplicate party',clientBody],['party missing fields',{}],['party invalid fields',{...clientBody,kind:'OTHER',name:'',active:0,version:'1'}],['party extra',{...clientBody,extra:true}]])await same(name,'POST',prefix+'parties',body);
 await same('edit client','PATCH',prefix+'parties/'+client.id,{...clientBody,name:'Updated client',version:1});
 await same('stale party','PATCH',prefix+'parties/'+client.id,{...clientBody,version:1});
 await same('immutable party type','PATCH',prefix+'parties/'+client.id,{...clientBody,kind:'VENDOR',version:2});
 await tables('party writes and validation');
 const date=today(),stockBody={kind:'STOCK_OPENING',date,lines:[{itemId:item.id,quantity:'00012',ignored:'stripped'}],reason:'0'};
 const draft=await same('draft stock opening','POST',prefix+'documents',stockBody);
 await same('draft has no effects','GET',prefix+'documents/'+draft.id);
 await same('update item after draft','PATCH',prefix+'items/'+item.id,{...itemBody,version:3});
 await same('reject stale item snapshot','POST',prefix+'documents/'+draft.id+'/post',{version:1});
 await same('edit stock draft','PATCH',prefix+'documents/'+draft.id,{...stockBody,version:1});
 await same('stale draft edit','PATCH',prefix+'documents/'+draft.id,{...stockBody,version:1});
 await same('stale posting version','POST',prefix+'documents/'+draft.id+'/post',{version:1});
 await same('invalid posting body','POST',prefix+'documents/'+draft.id+'/post',{version:'2',extra:true});
 const postingKey=randomUUID();await same('post stock opening','POST',prefix+'documents/'+draft.id+'/post',{version:2},{key:postingKey});
 await same('replay posting after lost acknowledgement','POST',prefix+'documents/'+draft.id+'/post',{version:2},{key:postingKey});
 await same('posted opening immutable','PATCH',prefix+'documents/'+draft.id,{...stockBody,version:2});
 await same('posted opening cannot repost','POST',prefix+'documents/'+draft.id+'/post',{version:2});
 const duplicate=await same('duplicate stock opening draft','POST',prefix+'documents',stockBody);await same('duplicate stock opening blocked','POST',prefix+'documents/'+duplicate.id+'/post',{version:1});
 const zero=await same('zero stock item','POST',prefix+'items',{...itemBody,sellingPrice:null});
 const zeroDraft=await same('zero stock draft','POST',prefix+'documents',{kind:'STOCK_OPENING',date,lines:[{itemId:zero.id,quantity:'0'}]});await same('post zero stock opening','POST',prefix+'documents/'+zeroDraft.id+'/post',{version:1});
 for(const [name,body]of [['invalid document date',{...stockBody,date:'2026-02-30'}],['future date',{...stockBody,date:'2099-01-01'}],['unknown document field',{...stockBody,extra:true}],['bad line identifiers',{...stockBody,lines:[{itemId:'0',quantity:2}]}],['fractional quantity',{...stockBody,lines:[{itemId:item.id,quantity:'1.5'}]}],['negative opening quantity',{...stockBody,lines:[{itemId:item.id,quantity:'-1'}]}],['too large quantity',{...stockBody,lines:[{itemId:item.id,quantity:'1000000000000000'}]}],['duplicate lines',{...stockBody,lines:[{itemId:item.id,quantity:'1'},{itemId:item.id,quantity:'2'}]}],['missing item reference',{...stockBody,lines:[{itemId:'9999',quantity:'1'}]}],['invalid optional reference',{...stockBody,correctsId:'0'}],['invalid date fields',{...stockBody,partyId:1,date:null,time:'25:00',paidImmediately:0,lines:[{itemId:null,quantity:false,rate:0}]}]])await same(name,'POST',prefix+'documents',body);
 for(const [name,lines]of [['no bottle lines',[]],['multiple opening lines',[{itemId:item.id,quantity:'0'},{itemId:zero.id,quantity:'0'}]]]){const d=await same(name+' draft','POST',prefix+'documents',{kind:'STOCK_OPENING',date,lines});await same(name+' posting rejected','POST',prefix+'documents/'+d.id+'/post',{version:1});}
 await tables('stock openings and immutable evidence');
 const clientOpening={kind:'CLIENT_OPENING',date,partyId:client.id,amount:'9999999999999.99',direction:'OWED_TO_COMPANY'};
 const cd=await same('draft client opening','POST',prefix+'documents',clientOpening);
 await same('edit party after draft','PATCH',prefix+'parties/'+client.id,{...clientBody,name:'Latest client',version:2});
 await same('reject stale party snapshot','POST',prefix+'documents/'+cd.id+'/post',{version:1});
 await same('refresh client opening','PATCH',prefix+'documents/'+cd.id,{...clientOpening,version:1});
 await same('post exact large debit opening','POST',prefix+'documents/'+cd.id+'/post',{version:2});
 const cp=await same('second party opening draft','POST',prefix+'documents',clientOpening);await same('duplicate party opening blocked','POST',prefix+'documents/'+cp.id+'/post',{version:1});
 await same('party edit preserves opening','PATCH',prefix+'parties/'+client.id,{...clientBody,name:'Client after opening',version:3});
 const vd=await same('draft vendor credit opening','POST',prefix+'documents',{kind:'VENDOR_OPENING',date,partyId:vendor.id,amount:'123.45',direction:'OWED_BY_COMPANY'});await same('post vendor credit opening','POST',prefix+'documents/'+vd.id+'/post',{version:1});
 for(const [kind,direction,amount,name]of [['CLIENT','OWED_BY_COMPANY','0','Zero client credit'],['VENDOR','OWED_TO_COMPANY','0','Zero vendor debit'],['CLIENT','OWED_BY_COMPANY','0.01','Client advance'],['VENDOR','OWED_TO_COMPANY','0.01','Vendor advance']]){const p=await same(name+' party','POST',prefix+'parties',{kind,name});const d=await same(name+' draft','POST',prefix+'documents',{kind:kind+'_OPENING',date,partyId:p.id,amount,direction});await same(name+' posting','POST',prefix+'documents/'+d.id+'/post',{version:1});}
 const pending=await same('unverified client','POST',prefix+'parties',{kind:'CLIENT',name:'Pending client'});
 for(const [name,body]of [['missing direction',{kind:'CLIENT_OPENING',date,partyId:pending.id,amount:'1'}],['invalid amount',{kind:'CLIENT_OPENING',date,partyId:pending.id,amount:'1.001',direction:'OWED_TO_COMPANY'}],['negative amount',{kind:'CLIENT_OPENING',date,partyId:pending.id,amount:'-1',direction:'OWED_TO_COMPANY'}],['wrong party classification',{kind:'VENDOR_OPENING',date,partyId:pending.id,amount:'1',direction:'OWED_TO_COMPANY'}],['unexpected bottle lines',{kind:'CLIENT_OPENING',date,partyId:pending.id,amount:'1',direction:'OWED_TO_COMPANY',lines:[{itemId:item.id,quantity:'1'}]}]]){const d=await same(name+' draft','POST',prefix+'documents',body);await same(name+' posting rejected','POST',prefix+'documents/'+d.id+'/post',{version:1});}
 await same('nonexistent posting','POST',prefix+'documents/999999/post',{version:1});
 for(const path of ['items','parties?kind=CLIENT','parties?kind=VENDOR','documents','overview','movements','register','reconciliation','ledgers/'+client.id,'ledgers/'+vendor.id])await same('read after writes '+path,'GET',prefix+path);
 await tables('party openings and read contracts');
 // A completed result replays even when READY is later revoked; new work is blocked.
 await both(db=>db('v1_control').where({id:1}).update({state:'PENDING'}));
 await same('READY gate','POST',prefix+'items',itemBody);await same('replay precedes READY gate','POST',prefix+'items',itemBody,{key:itemKey});
 await both(db=>db('v1_control').where({id:1}).update({state:'READY'}));
 // Separate authenticated actors cannot replay one another's command receipts.
 const oldRef=ref,oldPhp=appDriver;ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver,'other-admin');
 await both(db=>db('v1_control').where({id:1}).update({operator_id:'3'}));await same('actor-bound replay','POST',prefix+'items',itemBody,{key:itemKey});await both(db=>db('v1_control').where({id:1}).update({operator_id:'1'}));
 ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver,'inventory');await same('non-operator business write','POST',prefix+'items',itemBody);ref=oldRef;appDriver=oldPhp;
 await same('CSRF protects writes','POST',prefix+'items',itemBody,{noCsrf:true});await same('origin protects writes','POST',prefix+'items',itemBody,{headers:{origin:'https://attacker.test'}});
 await tables('authorization and command replay');
 // Concurrent same-key commands must serialize and return one saved outcome.
 const concurrentKey=randomUUID(),concurrentBody={...itemBody,description:'Concurrent item'};
 const [ra,pa]=await Promise.all([Promise.all([ref.call('POST',prefix+'items',concurrentBody,{key:concurrentKey}),ref.call('POST',prefix+'items',concurrentBody,{key:concurrentKey})]),Promise.all([appDriver.call('POST',prefix+'items',concurrentBody,{key:concurrentKey}),appDriver.call('POST',prefix+'items',concurrentBody,{key:concurrentKey})])]);
 assert.deepEqual(pa.map(r=>({status:r.status,body:normalize(r.body)})),ra.map(r=>({status:r.status,body:normalize(r.body)})));assert.equal(pa[0].status,201);assert.deepEqual(pa[0].body,pa[1].body);checks.push({name:'concurrent identical submission',responses:2,committedCommands:1});await tables('concurrent same-key atomicity');
 const raceBody={...itemBody,version:4},keys=[randomUUID(),randomUUID()];keys.forEach(k=>raceKeys.add(k));
 const races=await Promise.all([ref,appDriver].map(driver=>Promise.all(keys.map(key=>driver.call('PATCH',prefix+'items/'+item.id,raceBody,{key})))));
 for(const results of races){assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(results.find(r=>r.status===409).body.error.code,'STALE_RECORD');}
 assert.deepEqual(races[0].map(r=>({status:r.status,body:normalize(r.body)})).sort((a,b)=>a.status-b.status),races[1].map(r=>({status:r.status,body:normalize(r.body)})).sort((a,b)=>a.status-b.status));
 checks.push({name:'concurrent optimistic-version race',perSide:{successes:1,staleConflicts:1},winnerKeys:races.map(rs=>keys[rs.findIndex(r=>r.status===200)])});await tables('concurrent stale-version atomicity');
 // Failure after item/counter/audit mutations but before command receipt commits.
 const faultKey=randomUUID(),faultBody={...itemBody,description:'Rollback fault'};
 const faultBefore=await snapshot(databases[1]);
 await both(db=>db.raw("CREATE TRIGGER php2_fail_command BEFORE INSERT ON v1_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic command interruption'"));
 await same('interrupted command rolls back','POST',prefix+'items',faultBody,{key:faultKey});assert.deepEqual(await snapshot(databases[1]),faultBefore);await tables('rollback after audit before receipt');
 await both(db=>db.raw('DROP TRIGGER php2_fail_command'));await same('retry rolled-back key','POST',prefix+'items',faultBody,{key:faultKey});
 // Simulated response loss: discard committed responses, then retry in new PHP processes.
 const lostKey=randomUUID(),lostBody={...clientBody,name:'Lost acknowledgement party'};
 await Promise.all([ref.call('POST',prefix+'parties',lostBody,{key:lostKey}),appDriver.call('POST',prefix+'parties',lostBody,{key:lostKey})]);
 await same('lost acknowledgement replay','POST',prefix+'parties',lostBody,{key:lostKey});await tables('lost acknowledgement recovery');
 for(const kind of ['STOCK_OPENING','CLIENT_OPENING']){
  const entity=kind==='STOCK_OPENING'?await same('rollback stock item','POST',prefix+'items',itemBody):await same('rollback client','POST',prefix+'parties',{kind:'CLIENT',name:'Rollback client'});
  const body=kind==='STOCK_OPENING'?{kind,date,lines:[{itemId:entity.id,quantity:'7'}]}:{kind,date,partyId:entity.id,amount:'0.01',direction:'OWED_TO_COMPANY'};
  const draft=await same(kind+' rollback draft','POST',prefix+'documents',body),key=randomUUID(),before=await snapshot(databases[1]);
  await both(db=>db.raw("CREATE TRIGGER php2_fail_command BEFORE INSERT ON v1_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic posting interruption'"));
  await same(kind+' atomic posting rollback','POST',prefix+'documents/'+draft.id+'/post',{version:1},{key});
  assert.deepEqual(await snapshot(databases[1]),before);await tables(kind+' journal and verification rollback');
  await both(db=>db.raw('DROP TRIGGER php2_fail_command'));await same(kind+' retry posting','POST',prefix+'documents/'+draft.id+'/post',{version:1},{key});
 }
 const killedKey=randomUUID(),killedBody={...itemBody,description:'Killed transaction'},beforeKilled=await snapshot(databases[1]);
 await both(db=>db.raw('CREATE TRIGGER php2_pause_command BEFORE INSERT ON v1_commands FOR EACH ROW DO SLEEP(4)'));
 const pendingKilled=Promise.all([ref.call('POST',prefix+'items',killedBody,{key:killedKey}),appDriver.call('POST',prefix+'items',killedBody,{key:killedKey})]);
 const killed=new Set(),observations=[];
 for(let attempt=0;attempt<250&&killed.size<2;attempt++){
  const [rows]=await admin.raw("SELECT ID,DB FROM information_schema.PROCESSLIST WHERE STATE='User sleep'");
  if(rows.length)observations.push(rows);
  for(const row of rows){if(databases.some(db=>db.client.connectionSettings.database===row.DB)&&!killed.has(row.DB)){assert.match(String(row.ID),/^[0-9]+$/);await admin.raw('KILL CONNECTION '+row.ID);killed.add(row.DB);}}
  if(killed.size<2)await new Promise(r=>setTimeout(r,20));
 }
 const killedResponses=await pendingKilled;
 if(killed.size!==2){await writeFile(directory+'/kill-diagnostic.json',JSON.stringify({killed:[...killed],observations,responses:killedResponses},null,2));throw Error('Kill capture incomplete: '+JSON.stringify({killed:[...killed],responses:killedResponses.map(r=>({status:r.status,body:normalize(r.body)}))}));}
 assert.deepEqual(killedResponses.map(r=>r.status),[503,503]);assert.deepEqual(normalize(killedResponses[0].body),normalize(killedResponses[1].body));
 assert.deepEqual(await snapshot(databases[1]),beforeKilled);await tables('server-killed transaction rollback');await both(db=>db.raw('DROP TRIGGER php2_pause_command'));
 await same('retry server-killed command','POST',prefix+'items',killedBody,{key:killedKey});checks.push({name:'server-side interrupted transactions',connectionsKilled:2,atomicRollback:true});
 // The PHP runtime has no table-level business UPDATE and no immutable DELETE/UPDATE.
 const {parseEnv}=await import('node:util');const runtimeEnv=parseEnv(await readFile(envFile,'utf8'));
 const runtime=knex({client:'mysql2',connection:{host,port,database:runtimeEnv.UPMS_DB_DATABASE,user:runtimeEnv.UPMS_DB_USERNAME,password:runtimeEnv.UPMS_DB_PASSWORD},pool:{min:0,max:1}});
 const denied=["UPDATE v1_stock_journal SET delta='0' WHERE id=1","DELETE FROM v1_stock_journal WHERE id=1","UPDATE v1_party_journal SET debit='0' WHERE id=1","DELETE FROM v1_party_journal WHERE id=1","UPDATE v1_lines SET amount='0' WHERE id=1","UPDATE v1_audit SET reason='rewrite' WHERE id=1","DELETE FROM v1_commands","UPDATE v1_commands SET fingerprint='rewrite'","UPDATE v1_documents SET actor_id=3 WHERE id=1","UPDATE v1_documents SET created_at=UTC_TIMESTAMP() WHERE id=1","UPDATE v1_control SET next_dc=99 WHERE id=1","UPDATE v1_items SET code='REPLACED' WHERE id=1","UPDATE v1_parties SET kind='VENDOR' WHERE id=1","INSERT INTO users(login_key) VALUES('intruder')","DELETE FROM user_roles WHERE user_id=1","UPDATE users SET enabled=0 WHERE id=1"];
 try{for(const sql of denied)await assert.rejects(runtime.raw(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_COLUMNACCESS_DENIED_ERROR'].includes(e.code));}finally{await runtime.destroy();}checks.push({name:'narrow runtime privilege denials',denied:denied.length});
 // Unsupported kinds remain PHP-only 501, including stored later-milestone drafts.
 for(const kind of ['CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE','STOCK_CORRECTION','OPENING_CORRECTION','PAYMENT_REVERSAL']){const r=await appDriver.call('POST',prefix+'documents',{kind,date},{key:randomUUID()});assert.equal(r.status,501);assert.equal(r.body.error.code,'PHP_WRITE_MODULE_PENDING_REVIEW');}
 const noWriteBefore=await snapshot(databases[1]);await appDriver.call('POST',prefix+'documents/1/cancel',{version:1},{key:randomUUID()});assert.deepEqual(await snapshot(databases[1]),noWriteBefore);
 const unsupportedInput={kind:'EXPENSE',date},unsupportedKey=randomUUID();let unsupportedId;
 await both(async db=>{
  const [id]=await db('v1_documents').insert({kind:'EXPENSE',date,party_id:null,status:'DRAFT',version:1,payload:JSON.stringify({...documentInput.parse(unsupportedInput),entryVersion:2}),actor_id:'1',created_at:new Date()});
  unsupportedId=String(id);await db('v1_commands').insert({key:unsupportedKey,actor_id:'1',fingerprint:createHash('sha256').update(canonical({operation:'document.draft:undefined',input:unsupportedInput})).digest('hex'),result:JSON.stringify({id:String(id)})});
 });
 const beforeUnsupported=await snapshot(databases[1]);
 for(const [method,path,body,key]of [['POST','documents/'+unsupportedId+'/post',{version:1},randomUUID()],['PATCH','documents/'+unsupportedId,{...stockBody,version:1},randomUUID()],['POST','documents',unsupportedInput,unsupportedKey]]){
  const r=await appDriver.call(method,prefix+path,body,{key});assert.equal(r.status,501);assert.equal(r.body.error.code,'PHP_WRITE_MODULE_PENDING_REVIEW');
 }
 assert.deepEqual(await snapshot(databases[1]),beforeUnsupported);checks.push({name:'unsupported stored draft and receipt replay blocked',attempts:3});
 const recon=await same('final reconciliation','GET',prefix+'reconciliation');assert.equal(recon.matched,true);await tables('final business state');
 const report={run,phpBinary:php,phpArgs,engine:engine.version,schemas:databases.map(d=>d.client.connectionSettings.database),httpComparisons:evidence.length,snapshotComparisons:checks.filter(c=>c.tables).length,evidence,checks,ownerDatabaseContacted:false,migrationsModified:false};
 await writeFile(directory+'/evidence.json',JSON.stringify(report,null,2));await writeFile('tmp/php-runtime/php2-latest.json',JSON.stringify({directory,envFile,report:directory+'/evidence.json'}));
 console.log(JSON.stringify({passed:true,httpComparisons:evidence.length,checks:checks.length,schemas:report.schemas,evidence:directory+'/evidence.json',ownerDatabaseContacted:false}));
}finally{for(const db of databases)await db.destroy();await admin.destroy();}
