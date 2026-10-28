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
import {grantPhp4} from './php-2-runtime-grants.mjs';

const php=process.env.PHP4_BINARY,phpArgs=JSON.parse(process.env.PHP4_ARGS||'[]');
assert.ok(php,'Explicit PHP4_BINARY required');assert.ok(process.env.PHP_TEST_ADMIN_PASSWORD,'Isolated admin password required');
const port=3330,host='127.0.0.1',run=Date.now().toString(),directory=resolve('tmp/php-runtime/php4_'+run);
await mkdir(directory,{recursive:false});
const adminConnection={host,port,user:process.env.PHP_TEST_ADMIN_USER||'root',password:process.env.PHP_TEST_ADMIN_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false};
const admin=knex({client:'mysql2',connection:adminConnection,pool:{min:0,max:2}});
const databases=[],evidence=[],checks=[],raceKeys=new Set();
const origin='https://app.unique-plastic.test',base='/api/v1/management',prefix=base+'/simple-v1/';
const password='Synthetic-PHP4-Only-2026!';
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
  const name='upms_test_php_4_'+side+'_'+run;assert.match(name,/^upms_test_php_4_(ref|app)_[0-9]+$/);
  await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[name]);
  const db=knex({client:'mysql2',connection:{...adminConnection,database:name,timezone:'Z'},pool:{min:0,max:6}});databases.push(db);
  await identitySchema(db);await v1Schema(db);await entrySchema(db);
  const identity=createIdentityService(db);await identity.bootstrap({username:'php-admin',displayName:'Synthetic PHP4 administrator',password});
  const [owner]=await db('users').where({id:1});for(const [id,user,role]of [[2,'inventory','inventory'],[3,'other-admin','administrator']]){await db('users').insert({...owner,id,login_key:user,display_name:user});await db('user_roles').insert({user_id:id,role_code:role});}
  await db('v1_control').where({id:1}).update({operator_id:'1',state:'READY',cutover_evidence:'Isolated PHP-4 acceptance only'});
  if(side==='app'){
   const user='php4_'+run,runtimePassword=randomBytes(32).toString('hex');await grantPhp4(admin,name,user,runtimePassword);
   envFile=directory+'/php.env';await writeFile(envFile,`APP_NAME="Unique Plastic Industry"\nAPP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=${origin}\nUPMS_DB_HOST=${host}\nUPMS_DB_PORT=${port}\nUPMS_DB_DATABASE=${name}\nUPMS_DB_USERNAME=${user}\nUPMS_DB_PASSWORD=${runtimePassword}\n`);
  }
 }
 referenceApp=express();referenceApp.use((req,res,next)=>{req.peer={secure:true};next();});referenceApp.use(managementRouter(databases[0],{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-php2-reference',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));
 ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver);

 const date=today(),early='2020-01-01',itemBody={description:'PHP4 synthetic bottle',quality:'A',colour:'Graphite',packing:'12',sellingPrice:'0.01'},items=[];
 for(let i=1;i<=10;i++)items.push(await same('create item '+i,'POST',prefix+'items',{...itemBody,description:'PHP4 bottle '+i}));
 const client=await same('create client','POST',prefix+'parties',{kind:'CLIENT',name:'PHP4 synthetic client'}),vendor=await same('create vendor','POST',prefix+'parties',{kind:'VENDOR',name:'PHP4 vendor'});
 async function draft(name,body,opts){return same(name+' draft','POST',prefix+'documents',{date,...body},opts);}
 async function post(name,body){const d=await draft(name,body);return same(name+' post','POST',prefix+'documents/'+d.id+'/post',{version:1});}
 await post('client opening',{kind:'CLIENT_OPENING',date:early,partyId:client.id,amount:'0',direction:'OWED_TO_COMPANY'});
 await post('vendor opening',{kind:'VENDOR_OPENING',date:early,partyId:vendor.id,amount:'0',direction:'OWED_BY_COMPANY'});
 for(const item of [items[0],items[1],items[9]])await post('stock opening '+item.id,{kind:'STOCK_OPENING',date:early,lines:[{itemId:item.id,quantity:'1000'}]});
 const saleBody={kind:'CHALLAN',partyId:client.id,lines:[{itemId:items[9].id,quantity:'3',rate:'0.01'},{itemId:items[1].id,quantity:'2',rate:'0.01'}],discountMode:'FIXED',discountValue:'0.01'};
 async function sale(name,patch={}){const d=await post(name,{...saleBody,...patch});return same(name+' detail','GET',prefix+'documents/'+d.id);}
 function body(source,quantities=source.returnableLines.map(l=>l.quantity)){return{kind:'CHALLAN_RETURN',date,originalId:source.id,partyId:client.id,reason:'Accepted returned bottles',lines:source.returnableLines.map((line,i)=>({originalLineId:line.id,itemId:line.item_id,quantity:quantities[i],rate:line.rate})).filter(l=>l.quantity!=='0')};}
 async function returned(name,source,quantities){const r=await post(name,body(source,quantities));assert.equal(r.official_number,'DCR-'+r.id.padStart(4,'0'));await same(name+' posted detail','GET',prefix+'documents/'+r.id);await same(name+' source context','GET',prefix+'documents/'+source.id);return r;}
 const single=await sale('single original',{lines:[{itemId:items[0].id,quantity:'10',rate:'0.01'}],discountMode:'NONE',discountValue:'0'});
 await returned('partial three',single,['3']);await returned('partial two',single,['2']);await returned('partial five completes',single,['5']);
 const exhausted=await draft('exhausted source',body(single,['1']));assert.equal(exhausted.error.code,'RETURN_QUANTITY_EXCEEDED');
 const full=await sale('single full original',{lines:[{itemId:items[0].id,quantity:'10',rate:'0.01'}],discountMode:'NONE',discountValue:'0'});assert.equal((await returned('single full',full,['10'])).total,full.total);
 const multi=await sale('fixed discount original');const all=await returned('full multi-line fixed return',multi);assert.equal(all.total,multi.total);
 const journalOrder=await databases[1]('v1_stock_journal').where({document_id:all.id}).orderBy('id');assert.deepEqual(journalOrder.map(l=>String(l.item_id)),[items[1].id,items[9].id]);checks.push({name:'numeric return stock order',input:['10','2'],stockJournalOrder:journalOrder.map(l=>String(l.item_id))});
 for(const [name,patch,partition]of [['fixed partition A',{},[['1','0'],['1','1'],['1','1']]],['fixed partition B',{},[['0','2'],['3','0']]],['percentage partition',{discountMode:'PERCENT',discountValue:'20'},[['1','1'],['2','1']]],['one cent last unit',{discountMode:'FIXED',discountValue:'0.04'},[['1','1'],['1','1'],['1','0']]]]){
  const source=await sale(name,patch);let total=0n;for(const [i,quantities]of partition.entries()){const r=await returned(name+' part '+i,source,quantities);total+=BigInt(r.total.replace('.',''));}assert.equal(total,BigInt(source.total.replace('.','')));await tables(name+' telescopes');
 }
 const reordered=await sale('out of creation order original'),older=await draft('older return draft',body(reordered,['01','0'])),newer=await draft('newer return draft',body(reordered,['1','0']));
 assert.equal((await same('post newer return first','POST',prefix+'documents/'+newer.id+'/post',{version:1})).total,'0.00');assert.equal((await same('post older return recomputes credit','POST',prefix+'documents/'+older.id+'/post',{version:1})).total,'0.01');const recomputed=await same('posted older credit payload','GET',prefix+'documents/'+older.id);assert.equal(recomputed.payload.lines[0].quantity,'1');assert.equal(recomputed.payload.returnCredit,'0.01');await returned('complete out of order returns',reordered,['1','2']);assert.equal((await same('out of order original total credit','GET',prefix+'documents/'+reordered.id)).returnCredit,reordered.total);await tables('out of order returns recompute rounded credits');
 const source=await sale('validation original'),valid=body(source,['1','1']),unposted=await draft('unposted original',saleBody);
 const invalid=[['missing original',{...valid,originalId:undefined}],['nonexistent original',{...valid,originalId:'999999'}],['unposted original',{...valid,originalId:unposted.id}],['wrong original kind',{...valid,originalId:'1'}],['wrong client',{...valid,partyId:vendor.id}],['before original',{...valid,date:'2019-12-31'}],['future return',{...valid,date:'2099-01-01'}],['short reason',{...valid,reason:' x '}],['astral short reason',{...valid,reason:'😀'}],['empty lines',{...valid,lines:[]}],['wrong original line',{...valid,lines:[{...valid.lines[0],originalLineId:'99999'}]}],['missing original line',{...valid,lines:[{itemId:items[0].id,quantity:'1',rate:'0.01'}]}],['wrong item',{...valid,lines:[{...valid.lines[0],itemId:items[0].id}]}],['modified rate',{...valid,lines:[{...valid.lines[0],rate:'0.02'}]}],['invalid rate',{...valid,lines:[{...valid.lines[0],rate:'1e2'}]}],['duplicate lines',{...valid,lines:[valid.lines[0],valid.lines[0]]}],['duplicate original lines',{...valid,lines:[valid.lines[0],{...valid.lines[0],itemId:items[0].id}]}],['quantity zero',{...valid,lines:[{...valid.lines[0],quantity:'0'}]}],['quantity negative',{...valid,lines:[{...valid.lines[0],quantity:'-1'}]}],['quantity fraction',{...valid,lines:[{...valid.lines[0],quantity:'1.2'}]}],['quantity precision',{...valid,lines:[{...valid.lines[0],quantity:'1000000000000000'}]}],['quantity exceeds',{...valid,lines:[{...valid.lines[0],quantity:'4'}]}],['client credit injection',{...valid,returnCredit:'999'}]];
 for(const [name,input]of invalid){const before=await snapshot(databases[1]);const r=await draft(name,input);assert.ok(r.error,name);assert.deepEqual(await snapshot(databases[1]),before);}
 const stripped=await draft('line snapshot injection stripped',{...valid,lines:[{...valid.lines[0],snapshot:{code:'injected'}}]});const strippedDetail=await same('server snapshot replaces injected value','GET',prefix+'documents/'+stripped.id);assert.notEqual(strippedDetail.payload.lines[0].snapshot.code,'injected');
 const cancelled=await draft('cancel return',valid);await same('stale return edit','PATCH',prefix+'documents/'+cancelled.id,{...valid,version:2});await same('edit return','PATCH',prefix+'documents/'+cancelled.id,{...valid,reason:'Reviewed updated reason',version:1});await same('stale return post','POST',prefix+'documents/'+cancelled.id+'/post',{version:1});await same('cancel requires reason','POST',prefix+'documents/'+cancelled.id+'/cancel',{version:2,reason:'x'});
 const cancelKey=randomUUID(),cancelBody={version:2,reason:'Reviewed cancelled return'};await same('cancel return','POST',prefix+'documents/'+cancelled.id+'/cancel',cancelBody,{key:cancelKey});await same('cancel replay reordered','POST',prefix+'documents/'+cancelled.id+'/cancel',{reason:cancelBody.reason,version:2},{key:cancelKey});await same('cancelled return cannot post','POST',prefix+'documents/'+cancelled.id+'/post',{version:2});await same('cancelled return cannot edit','PATCH',prefix+'documents/'+cancelled.id,{...valid,version:2});
 const fresh=await draft('replay return',valid),postPath=prefix+'documents/'+fresh.id+'/post',key=randomUUID();
 for(const [name,opts]of [['missing UUID',{key:undefined}],['invalid UUID',{key:'invalid'}],['missing CSRF',{noCsrf:true}],['origin',{headers:{origin:'https://attacker.test'}}]])await same('return '+name,'POST',postPath,{version:1},opts);
 const result=await same('return posting','POST',postPath,{version:1},{key}),saved=await snapshot(databases[1]);await same('return fresh-process replay','POST',postPath,{version:1},{key});assert.deepEqual(await snapshot(databases[1]),saved);await same('same key changed input','POST',postPath,{version:2},{key});await same('posted return immutable','PATCH',prefix+'documents/'+fresh.id,{...valid,version:1});await same('posted return cannot cancel','POST',prefix+'documents/'+fresh.id+'/cancel',{version:1,reason:'Rejected posted cancellation'});
 const oldRef=ref,oldPhp=appDriver;ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver,'other-admin');await both(db=>db('v1_control').where({id:1}).update({operator_id:'3'}));await same('return actor-bound replay','POST',postPath,{version:1},{key});await both(db=>db('v1_control').where({id:1}).update({operator_id:'1'}));ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver,'inventory');await same('inventory cannot return','POST',prefix+'documents',valid);ref=oldRef;appDriver=oldPhp;
 await both(db=>db('v1_control').where({id:1}).update({state:'PENDING'}));await same('return READY gate','POST',prefix+'documents',valid);await same('saved return replay precedes READY','POST',postPath,{version:1},{key});await both(db=>db('v1_control').where({id:1}).update({state:'READY'}));
 await tables('validation cancellation and command security');
 // Historical returns ignore current item prices/active status and current party snapshots.
 const history=await sale('historical immutable original');await same('change historical item','PATCH',prefix+'items/'+items[9].id,{...itemBody,sellingPrice:'9.99',active:false,version:1});await same('change historical client','PATCH',prefix+'parties/'+client.id,{kind:'CLIENT',name:'Changed client',active:false,version:1});await returned('historical price and identity preserved',history,['1','1']);await same('reactivate item','PATCH',prefix+'items/'+items[9].id,{...itemBody,version:2});await same('reactivate client','PATCH',prefix+'parties/'+client.id,{kind:'CLIENT',name:'Current client',active:true,version:2});
 // Fault injection is restricted to the two new synthetic schemas.
 for(const [name,table]of [['after stock journal','v1_lines'],['after client journal','v1_audit'],['before receipt','v1_commands']]){
  const original=await sale('fault source '+name),d=await draft('fault return '+name,body(original,['1','1'])),key=randomUUID(),before=await snapshot(databases[1]);
  await both(db=>db.raw('CREATE TRIGGER php4_fault BEFORE INSERT ON '+table+" FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic return fault'"));const failure=await same('return rollback '+name,'POST',prefix+'documents/'+d.id+'/post',{version:1},{key});assert.equal(failure.error.code,'IDENTITY_UNAVAILABLE');assert.deepEqual(await snapshot(databases[1]),before);await tables('atomic return rollback '+name);await both(db=>db.raw('DROP TRIGGER php4_fault'));await same('return retry '+name,'POST',prefix+'documents/'+d.id+'/post',{version:1},{key});
 }
 async function overlap(name,original,qa,qb,expectedSecond){
  const a=await draft(name+' A',body(original,qa)),b=await draft(name+' B',body(original,qb));await both(db=>db.raw('CREATE TRIGGER php4_pause_stock BEFORE UPDATE ON v1_stock FOR EACH ROW DO SLEEP(2)'));
  const ka=randomUUID(),kb=randomUUID(),first=Promise.all([ref.call('POST',prefix+'documents/'+a.id+'/post',{version:1},{key:ka}),appDriver.call('POST',prefix+'documents/'+a.id+'/post',{version:1},{key:ka})]);
  const waiting=new Set();for(let n=0;n<200&&waiting.size<2;n++){const [rows]=await admin.raw("SELECT DB FROM information_schema.PROCESSLIST WHERE STATE='User sleep'");for(const row of rows)if(databases.some(db=>db.client.connectionSettings.database===row.DB))waiting.add(row.DB);if(waiting.size<2)await new Promise(r=>setTimeout(r,10));}assert.equal(waiting.size,2);
  const second=Promise.all([ref.call('POST',prefix+'documents/'+b.id+'/post',{version:1},{key:kb}),appDriver.call('POST',prefix+'documents/'+b.id+'/post',{version:1},{key:kb})]);const [x,y]=await Promise.all([first,second]);assert.deepEqual(x.map(r=>r.status),[200,200]);assert.deepEqual(y.map(r=>r.status),[expectedSecond,expectedSecond]);assert.deepEqual(normalize(x[0].body),normalize(x[1].body));assert.deepEqual(normalize(y[0].body),normalize(y[1].body));await both(db=>db.raw('DROP TRIGGER php4_pause_stock'));await tables(name+' complete exact state');checks.push({name,overlappingTransactions:2,firstStatus:200,secondStatus:expectedSecond});await same(name+' original context','GET',prefix+'documents/'+original.id);
 }
 await overlap('final remaining units race',await sale('race original'),['3','0'],['3','0'],400);
 await overlap('different original lines race',await sale('distinct lines original'),['3','0'],['0','2'],200);
 const twiceSource=await sale('double click source'),twice=await draft('double click return',body(twiceSource,['1','1'])),keys=[randomUUID(),randomUUID()];keys.forEach(k=>raceKeys.add(k));
 const responses=await Promise.all([ref,appDriver].map(driver=>Promise.all(keys.map(key=>driver.call('POST',prefix+'documents/'+twice.id+'/post',{version:1},{key})))));for(const rows of responses){assert.deepEqual(rows.map(r=>r.status).sort(),[200,409]);assert.equal(rows.find(r=>r.status===409).body.error.code,'IMMUTABLE_DOCUMENT');}await tables('double posting no duplicate restoration or credit');
 const lostSource=await sale('lost response source'),lost=await draft('lost response return',body(lostSource,['1','1'])),lostKey=randomUUID();await Promise.all([ref.call('POST',prefix+'documents/'+lost.id+'/post',{version:1},{key:lostKey}),appDriver.call('POST',prefix+'documents/'+lost.id+'/post',{version:1},{key:lostKey})]);const lostState=await snapshot(databases[1]);await same('discarded response restart replay','POST',prefix+'documents/'+lost.id+'/post',{version:1},{key:lostKey});assert.deepEqual(await snapshot(databases[1]),lostState);
 const interruptedSource=await sale('interrupted source'),interruptedDraft=await draft('interrupted return',body(interruptedSource,['1','1'])),interruptedKey=randomUUID(),beforeKilled=await snapshot(databases[1]);await both(db=>db.raw('CREATE TRIGGER php4_pause_command BEFORE INSERT ON v1_commands FOR EACH ROW DO SLEEP(4)'));
 const pending=Promise.all([ref.call('POST',prefix+'documents/'+interruptedDraft.id+'/post',{version:1},{key:interruptedKey}),appDriver.call('POST',prefix+'documents/'+interruptedDraft.id+'/post',{version:1},{key:interruptedKey})]);const killed=new Set();for(let attempt=0;attempt<250&&killed.size<2;attempt++){const [rows]=await admin.raw("SELECT ID,DB FROM information_schema.PROCESSLIST WHERE STATE='User sleep'");for(const row of rows)if(databases.some(db=>db.client.connectionSettings.database===row.DB)&&!killed.has(row.DB)){assert.match(String(row.ID),/^[0-9]+$/);await admin.raw('KILL CONNECTION '+row.ID);killed.add(row.DB);}if(killed.size<2)await new Promise(r=>setTimeout(r,20));}assert.equal(killed.size,2);assert.deepEqual((await pending).map(r=>r.status),[503,503]);assert.deepEqual(await snapshot(databases[1]),beforeKilled);await tables('connection killed before return receipt');await both(db=>db.raw('DROP TRIGGER php4_pause_command'));await same('interrupted return retry','POST',prefix+'documents/'+interruptedDraft.id+'/post',{version:1},{key:interruptedKey});checks.push({name:'interrupted return transaction',connectionsKilled:2});
 const brokenSource=await sale('stock integrity source'),broken=await draft('stock integrity return',body(brokenSource,['1','0']));
 for(const [name,change,restore]of [['unverified',{verified:0},{verified:1}],['unreconciled',{quantity:'7'},null]]){const stock=await databases[1]('v1_stock').where({item_id:items[9].id}).first();await both(db=>db('v1_stock').where({item_id:items[9].id}).update(change));const before=await snapshot(databases[1]);const r=await same('return stock '+name,'POST',prefix+'documents/'+broken.id+'/post',{version:1});assert.ok(r.error);assert.deepEqual(await snapshot(databases[1]),before);await both(db=>db('v1_stock').where({item_id:items[9].id}).update(restore||{quantity:stock.quantity}));}
 const missingStock=await databases[1]('v1_stock').where({item_id:items[9].id}).first();await both(db=>db('v1_stock').where({item_id:items[9].id}).delete());const missingState=await snapshot(databases[1]);const missingResult=await same('missing return stock projection','POST',prefix+'documents/'+broken.id+'/post',{version:1});assert.equal(missingResult.error.code,'STOCK_OPENING_UNVERIFIED');assert.deepEqual(await snapshot(databases[1]),missingState);await both(db=>db('v1_stock').insert(missingStock));
 // Seed an existing receipt with the authoritative Express service in both new schemas;
 // PHP payments remain blocked. Historical account credit must append without refunds.
 const paidSource=await sale('partly paid original'),fixtureApp=express();fixtureApp.use((req,res,next)=>{req.peer={secure:true};next();});fixtureApp.use(managementRouter(databases[1],{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-php4-fixture',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));
 const fixtureA=refDriver(referenceApp),fixtureB=refDriver(fixtureApp);await login(fixtureA,fixtureB);const receiptKey=randomUUID(),receiptBody={kind:'CLIENT_PAYMENT',date,partyId:client.id,amount:'0.01',method:'CASH'};const [receiptA,receiptB]=await Promise.all([fixtureA.call('POST',prefix+'documents',receiptBody,{key:receiptKey}),fixtureB.call('POST',prefix+'documents',receiptBody,{key:receiptKey})]);assert.equal(receiptA.status,201);assert.deepEqual(receiptB.body,receiptA.body);const finalizeKey=randomUUID();for(const driver of [fixtureA,fixtureB])assert.equal((await driver.call('POST',prefix+'documents/'+receiptA.body.id+'/post',{version:1},{key:finalizeKey})).status,200);
 const beforePaid=await same('partly paid client ledger before return','GET',prefix+'ledgers/'+client.id),receiptCount=await databases[1]('v1_documents').where({kind:'CLIENT_PAYMENT'}).count({n:'id'}).first();await returned('full credit after partial payment',paidSource);const afterPaid=await same('partly paid client ledger after return','GET',prefix+'ledgers/'+client.id);assert.equal(BigInt(afterPaid.closing.replace('.','')),BigInt(beforePaid.closing.replace('.',''))-BigInt(paidSource.total.replace('.','')));assert.deepEqual(await databases[1]('v1_documents').where({kind:'CLIENT_PAYMENT'}).count({n:'id'}).first(),receiptCount);checks.push({name:'partly paid challan return',receiptFixture:'Express only in both synthetic schemas',newRefundOrPayment:false});
 // No business runtime privilege expansion beyond PHP-3 is needed.
 const {parseEnv}=await import('node:util'),runtimeEnv=parseEnv(await readFile(envFile,'utf8')),runtime=knex({client:'mysql2',connection:{host,port,database:runtimeEnv.UPMS_DB_DATABASE,user:runtimeEnv.UPMS_DB_USERNAME,password:runtimeEnv.UPMS_DB_PASSWORD},pool:{min:0,max:1}});
 const denied=["UPDATE v1_stock_journal SET delta='0' WHERE id=1","DELETE FROM v1_stock_journal WHERE id=1","UPDATE v1_party_journal SET credit='0' WHERE id=1","DELETE FROM v1_party_journal WHERE id=1","UPDATE v1_lines SET amount='0' WHERE id=1","DELETE FROM v1_lines WHERE id=1","UPDATE v1_audit SET reason='rewrite' WHERE id=1","DELETE FROM v1_audit WHERE id=1","UPDATE v1_commands SET fingerprint='rewrite'","DELETE FROM v1_commands","UPDATE v1_documents SET actor_id=3 WHERE id=1","UPDATE v1_control SET operator_id=3 WHERE id=1","UPDATE v1_items SET code='REPLACED' WHERE id=1","UPDATE v1_parties SET kind='VENDOR' WHERE id=1","INSERT INTO users(login_key) VALUES('intruder')","CREATE TABLE php4_forbidden(id INT)","SELECT * FROM mysql.user"];
 try{for(const sql of denied)await assert.rejects(runtime.raw(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_COLUMNACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));}finally{await runtime.destroy();}checks.push({name:'SQL least-privilege denials',denied:denied.length});
 for(const kind of ['EXPENSE']){
  const r=await appDriver.call('POST',prefix+'documents',{kind,date},{key:randomUUID()});assert.equal(r.status,501);const raw={kind,date,...(['STOCK_CORRECTION','OPENING_CORRECTION','PAYMENT_REVERSAL'].includes(kind)?{reason:'Blocked fixture reason'}:{})},key=randomUUID();let id;
  await both(async db=>{const [saved]=await db('v1_documents').insert({kind,date,status:'DRAFT',version:1,payload:JSON.stringify({...documentInput.parse(raw),entryVersion:2}),actor_id:'1',created_at:new Date()});id=String(saved);await db('v1_commands').insert({key,actor_id:'1',fingerprint:createHash('sha256').update(canonical({operation:'document.draft:undefined',input:raw})).digest('hex'),result:JSON.stringify({id})});});
  const before=await snapshot(databases[1]);for(const [method,path,input,k]of [['POST','documents/'+id+'/post',{version:1},randomUUID()],['POST','documents/'+id+'/cancel',{version:1,reason:'Blocked cancellation'},randomUUID()],['PATCH','documents/'+id,{...valid,version:1},randomUUID()],['POST','documents',raw,key]])assert.equal((await appDriver.call(method,prefix+path,input,{key:k})).status,501);assert.deepEqual(await snapshot(databases[1]),before);
 }
 const wide=await sale('unsigned original line identities');await both(async db=>{const rows=await db('v1_lines').where({document_id:wide.id}).orderBy('line_no');for(const [index,row]of rows.entries())await db('v1_lines').where({id:row.id}).update({id:String(9223372036854776808n+BigInt(index))});});const wideSource=await same('unsigned original line context','GET',prefix+'documents/'+wide.id);assert.deepEqual(wideSource.returnableLines.map(l=>l.id),['9223372036854776808','9223372036854776809']);await returned('distinct uint64 original lines',wideSource);checks.push({name:'unsigned original line identity precision',ids:wideSource.returnableLines.map(l=>l.id),noIdentityNormalization:true});
 for(const path of ['documents','documents?kind=CHALLAN_RETURN','documents/'+source.id,'ledgers/'+client.id,'register','overview','movements'])await same('final return reads '+path,'GET',prefix+path);
 const recon=await same('final return reconciliation','GET',prefix+'reconciliation');assert.equal(recon.matched,true);await tables('final return stock ledger immutable evidence and counters');
 const report={run,phpBinary:php,engine:engine.version,schemas:databases.map(d=>d.client.connectionSettings.database),httpComparisons:evidence.length,snapshotComparisons:checks.filter(c=>c.tables).length,evidence,checks,ownerDatabaseContacted:false,migrationsModified:false};await writeFile(directory+'/evidence.json',JSON.stringify(report,null,2));await writeFile('tmp/php-runtime/php4-latest.json',JSON.stringify({directory,envFile,report:directory+'/evidence.json'}));console.log(JSON.stringify({passed:true,httpComparisons:evidence.length,snapshots:report.snapshotComparisons,checks:checks.length,evidence:directory+'/evidence.json'}));
}finally{for(const db of databases)await db.destroy();await admin.destroy();}
