import {createServer as tcpServer,connect as tcpConnect} from 'node:net';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {simpleV1Service} from '../src/simple-v1/service.js';
// Local synthetic acceptance only. Refuses existing schemas; never resets data.
import knex from 'knex';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {up as identity} from '../migrations/202610210001_identity.js';
import {up as simple} from '../simple-v1-migrations/202610240001_simple_v1.js';
import {up as entry} from '../simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../src/identity/service.js';
import {createDatabase} from '../src/identity/database.js';
import {simpleV1RuntimePrivileges} from '../src/identity/grants.js';
import {identityConfig} from '../src/identity/config.js';
import {createApp} from '../src/app.js';
import {returnBrowser} from './challan-return-browser.mjs';
const target=process.argv[2]||'01';assert.match(target,/^0[1-6]$/);const schema='upms_test_dcr_20261026_'+target,user='upms_runtime_test_dcr_'+target,checks=[];
const secret=()=>randomBytes(40).toString('base64url');
let owner,setup,db,server;
async function check(name,fn){await fn();checks.push(name);console.info('PASS '+name);}
try{
 assert.equal(process.env.DB_HOST,'127.0.0.1');assert.equal(process.env.DB_PORT,'3316');assert.equal(process.env.NODE_ENV,'development');
 owner=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3316,user:process.env.DB_USER,password:process.env.DB_PASSWORD},pool:{min:0,max:1}});
 const [[state]]=await owner.raw('SELECT @@port p,@@server_id s,@@innodb_force_recovery r,VERSION() v');assert.equal(Number(state.p),3316);assert.equal(Number(state.r),0);assert.equal(Number(state.s),331626);if(!process.env.DB_PASSWORD){const adminPassword=process.env.UPMS_DCR_BOOTSTRAP_PASSWORD;assert.ok(adminPassword?.length>=32);await owner.raw("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[adminPassword]);process.env.DB_PASSWORD=adminPassword;owner.client.connectionSettings.password=adminPassword;}
 assert.equal((await owner.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]))[0].length,0,'Preserve existing synthetic schema; do not repeat provision');
 assert.equal((await owner.raw('SELECT User FROM mysql.user WHERE User=?',[user]))[0].length,0);
 await owner.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);
 setup=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3316,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:schema,dateStrings:true},pool:{min:0,max:1}});
 await identity(setup);await simple(setup);await entry(setup);
 const password=secret(),runtime=secret(),operator=await createIdentityService(setup).bootstrap({username:'v1_operator',displayName:'Synthetic Return Operator',password});
 await setup('v1_control').where({id:1}).update({operator_id:operator,state:'READY',cutover_evidence:'Fresh synthetic return acceptance; no company data.'});
 await owner.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',runtime]);
 for(const [table,rights]of Object.entries(simpleV1RuntimePrivileges))await owner.raw('GRANT '+rights.join(',')+' ON ??.?? TO ?@?',[schema,table,user,'localhost']);
 const env={...process.env,DB_NAME:schema,DB_CONFIRM_NAME:schema,DB_USER:user,DB_PASSWORD:runtime,IDENTITY_DB_PURPOSE:'runtime',UPMS_SIMPLE_V1:'synthetic-v1',DB_ALLOW_MARIADB_COMPATIBILITY:'true',MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:'http://127.0.0.1:3196',SESSION_SECRET:secret()};
 db=createDatabase(env);let app;server=createServer((req,res)=>app(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;app=createApp({identityDatabase:db,management:{...identityConfig(env),origin}});
 let cookie='',csrf='';const date='2026-10-26';
 async function api(path,body,status=200,method='POST',key=randomUUID()){
  const response=await fetch(origin+'/api/v1/management'+path,{method:body?method:'GET',headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;
 }
 const cmd=(p,b,s=200,m='POST',key)=>api('/simple-v1'+p,b,s,m,key),draft=b=>cmd('/documents',{date,...b},201),post=async b=>{const d=await draft(b);return cmd('/documents/'+d.id+'/post',{version:1});},get=p=>cmd(p);
 csrf=(await api('/session/csrf')).csrfToken;csrf=(await api('/session/login',{username:'v1_operator',password})).csrfToken;
 await check('Restricted runtime rejects journal mutation, runtime DDL and global data access',async()=>{await assert.rejects(db('v1_party_journal').update({credit:'0'}));await assert.rejects(db.raw('CREATE TABLE illegal_test (id int)'));await assert.rejects(db.raw('SELECT * FROM mysql.user'));});
 const client=(await cmd('/parties',{kind:'CLIENT',name:'Synthetic Returns Client'},201)).id;
 await post({kind:'CLIENT_OPENING',partyId:client,amount:'0',direction:'OWED_TO_COMPANY'});
 const items=[];for(const description of ['Synthetic Bottle A','Synthetic Bottle B']){const item=await cmd('/items',{description,quality:'Virgin',colour:'White',packing:'Carton',sellingPrice:'0.01'},201);items.push(item);await post({kind:'STOCK_OPENING',lines:[{itemId:item.id,quantity:'1000'}]});}
 const challan=await post({kind:'CHALLAN',partyId:client,discountMode:'FIXED',discountValue:'0.01',lines:[{itemId:items[0].id,quantity:'3',rate:'0.01'},{itemId:items[1].id,quantity:'2',rate:'0.01'}]});
 const original=await get('/documents/'+challan.id),originalRow=await db('v1_documents').where({id:challan.id}).first(),originalLines=await db('v1_lines').where({document_id:challan.id});
 const request=(source,index,quantity)=>({kind:'CHALLAN_RETURN',originalId:source.id,partyId:client,reason:'Accepted resalable customer return',lines:[{itemId:String(source.lines[index].item_id),originalLineId:String(source.lines[index].id),quantity,rate:source.lines[index].rate}]});
 await check('Unposted challans, wrong client, foreign lines, changed rates, invalid quantity and reason rejected',async()=>{
  const unposted=await draft({kind:'CHALLAN',partyId:client,lines:[{itemId:items[0].id,quantity:'1',rate:'0.01'}]});
  for(const input of [{...request(original,0,'1'),originalId:unposted.id},{...request(original,0,'1'),partyId:'999'},{...request(original,0,'1'),reason:''},...['0','-1','4','1.5'].map(q=>request(original,0,q)),{...request(original,0,'1'),lines:[{...request(original,0,'1').lines[0],itemId:items[1].id}]},{...request(original,0,'1'),lines:[{...request(original,0,'1').lines[0],rate:'1.00'}]}])await cmd('/documents',{date,...input},400);
 });
 let first;
 await check('Save draft is unnumbered and changes neither stock nor client ledger',async()=>{const stock=await db('v1_stock'),ledger=await db('v1_party_journal');first=await draft(request(original,0,'1'));const detail=await get('/documents/'+first.id);assert.equal(detail.official_number,null);assert.deepEqual(await db('v1_stock'),stock);assert.deepEqual(await db('v1_party_journal'),ledger);});
 await check('Partial return posts stock and credit exactly once; same-key lost response retry replays',async()=>{const key=randomUUID(),p=await cmd('/documents/'+first.id+'/post',{version:1},200,'POST',key);assert.equal(p.total,'0.00');assert.deepEqual(await cmd('/documents/'+first.id+'/post',{version:1},200,'POST',key),p);await cmd('/documents/'+first.id+'/post',{version:1},409);assert.equal((await db('v1_stock_journal').where({document_id:first.id})).length,1);assert.equal((await db('v1_party_journal').where({document_id:first.id})).length,1);});
 await check('Concurrent returns revalidate remaining balance within transaction',async()=>{const a=await draft(request(original,0,'2')),b=await draft(request(original,0,'2'));const responses=await Promise.all([a,b].map(d=>fetch(origin+'/api/v1/management/simple-v1/documents/'+d.id+'/post',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':randomUUID()},body:'{"version":1}'})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal((await get('/documents/'+original.id)).returnableLines[0].remaining,'0');});
 await check('Multiple selected-item returns fully reverse discounted net debit without rounding drift',async()=>{await post(request(original,1,'1'));await post(request(original,1,'1'));const d=await get('/documents/'+original.id);assert.equal(d.returnCredit,'0.04');assert.equal(d.returnableLines.every(l=>l.remaining==='0'),true);assert.equal((await get('/ledgers/'+client)).closing,'0.00');for(const item of items)assert.equal((await db('v1_stock').where({item_id:item.id}).first()).quantity,'1000');});
 const second=await post({kind:'CHALLAN',partyId:client,lines:[{itemId:items[0].id,quantity:'500',rate:'0.01'}]}),secondDetail=await get('/documents/'+second.id);
 await post({kind:'CLIENT_PAYMENT',partyId:client,amount:'5.00',method:'CASH'});
 await check('Already-paid client gains a credit balance without any refund transaction',async()=>{await post(request(secondDetail,0,'100'));await post(request(secondDetail,0,'50'));const d=await get('/documents/'+second.id);assert.equal(d.returnableLines[0].remaining,'350');assert.equal((await get('/ledgers/'+client)).closing,'-1.50');});
 await check('Rollback after stock writes leaves draft, stock, ledger and command unchanged',async()=>{
  const d=await draft(request(secondDetail,0,'1')),stock=await db('v1_stock'),journals=await db('v1_stock_journal'),ledger=await db('v1_party_journal');
  await setup.raw("CREATE TRIGGER dcr_test_failure BEFORE INSERT ON v1_party_journal FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Synthetic rollback fault'");
  try{await cmd('/documents/'+d.id+'/post',{version:1},503);}finally{await setup.raw('DROP TRIGGER dcr_test_failure');}
  assert.deepEqual(await db('v1_stock'),stock);assert.deepEqual(await db('v1_stock_journal'),journals);assert.deepEqual(await db('v1_party_journal'),ledger);assert.equal((await get('/documents/'+d.id)).status,'DRAFT');
 });
 await check('Original challan and its historical lines remain immutable',async()=>{assert.deepEqual(await db('v1_documents').where({id:challan.id}).first(),originalRow);assert.deepEqual(await db('v1_lines').where({document_id:challan.id}),originalLines);await cmd('/documents/'+challan.id,{date,kind:'CHALLAN',remarks:'tamper'},409,'PATCH');});
 await check('Stock, ledger, discount and return journal reconciliation; register search and summaries',async()=>{assert.deepEqual((await get('/reconciliation')).mismatches,[]);const register=await get('/register?reference='+original.official_number);assert.equal(register.records.filter(r=>r.kind==='CHALLAN_RETURN').length,4);assert.equal(register.totals.returnCredits,'0.04');assert.equal((await get('/movements')).records.some(r=>r.kind==='CHALLAN_RETURN'),true);});
 await returnBrowser({db,origin,password,sourceId:second.id,checks});
 await check('Drafts finalized out of creation order reconcile discounted partial credits',async()=>{
  const c=await post({kind:'CHALLAN',partyId:client,discountMode:'FIXED',discountValue:'0.01',lines:[{itemId:items[0].id,quantity:'3',rate:'0.01'},{itemId:items[1].id,quantity:'2',rate:'0.01'}]}),source=await get('/documents/'+c.id);
  const older=await draft(request(source,0,'01')),newer=await draft(request(source,0,'1'));
  assert.equal((await cmd('/documents/'+newer.id+'/post',{version:1})).total,'0.00');assert.equal((await cmd('/documents/'+older.id+'/post',{version:1})).total,'0.01');
  await post(request(source,0,'1'));await post(request(source,1,'2'));assert.equal((await get('/documents/'+source.id)).returnCredit,'0.04');assert.deepEqual((await get('/reconciliation')).mismatches,[]);
 });
 await check('Concurrent same-document finalization posts stock and client credit once',async()=>{
  const d=await draft(request(secondDetail,0,'1'));
  const responses=await Promise.all([1,2].map(()=>fetch(origin+'/api/v1/management/simple-v1/documents/'+d.id+'/post',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':randomUUID()},body:'{"version":1}'})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal((await db('v1_stock_journal').where({document_id:d.id})).length,1);assert.equal((await db('v1_party_journal').where({document_id:d.id})).length,1);
 });
 await check('Lost COMMIT acknowledgement and separate restarted process replay durable return exactly once',async()=>{
  const d=await draft(request(secondDetail,0,'1')),key=randomUUID(),sockets=new Set();let armed=false,dropped=false;
  const proxy=tcpServer(clientSocket=>{const upstream=tcpConnect({host:'127.0.0.1',port:3316});sockets.add(clientSocket);sockets.add(upstream);let commit=false;for(const socket of [clientSocket,upstream]){socket.on('error',()=>{});socket.on('close',()=>{sockets.delete(socket);clientSocket.destroy();upstream.destroy();});}clientSocket.on('data',bytes=>{if(bytes.length>5&&bytes[4]===3){const sql=bytes.subarray(5).toString().replace(/^[\x00-\x1f]+/,'').trim();if(/insert into `v1_commands`/i.test(sql))armed=true;if(armed&&/^COMMIT\s*;?$/i.test(sql))commit=true;}upstream.write(bytes);});upstream.on('data',bytes=>{if(commit&&armed&&!dropped&&bytes.length>4&&bytes[4]===0){dropped=true;clientSocket.destroy();upstream.destroy();}else clientSocket.write(bytes);});});
  await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const fault=createDatabase(env);fault.client.connectionSettings.port=proxy.address().port;
  const session=await db('sessions').whereNotNull('user_id').where({revoked:false}).orderBy('idle_expires','desc').first();
  try{await assert.rejects(simpleV1Service(fault).post({userId:String(session.user_id),authVersion:1,recordHash:session.token_hash},key,d.id,{version:1}));assert.equal(dropped,true);
   const result=await cmd('/documents/'+d.id+'/post',{version:1},200,'POST',key),{stdout}=await promisify(execFile)(process.execPath,['server/tools/challan-return-replay.mjs'],{env:{...env,UPMS_DCR_REPLAY_KEY:key,UPMS_DCR_REPLAY_ID:d.id},windowsHide:true,timeout:20000});
   assert.deepEqual(JSON.parse(stdout),result);assert.equal((await db('v1_stock_journal').where({document_id:d.id})).length,1);assert.equal((await db('v1_party_journal').where({document_id:d.id})).length,1);
  }finally{await fault.destroy();for(const socket of sockets)socket.destroy();await new Promise(r=>proxy.close(r));}
 });
 assert.deepEqual((await get('/reconciliation')).mismatches,[]);
 await mkdir('docs/simple-v1/evidence',{recursive:true});await writeFile('docs/simple-v1/evidence/return-acceptance.json',JSON.stringify({passed:true,schema,engine:state.v,productionMySQLVerified:false,mysqlEngineVerified:true,checks,ownerDatabaseTouched:false},null,2)+'\n');
 console.info(JSON.stringify({passed:true,checks:checks.length,schema}));
}catch(error){console.error(JSON.stringify({failed:true,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Synthetic acceptance stopped; preserve partial schema and inspect locally.',stack:error.stack?.split('\n').filter(l=>/^\s+at /.test(l)).slice(0,4)}));process.exitCode=1;}
finally{if(server)await new Promise(r=>{server.close(r);server.closeIdleConnections();});await db?.destroy();await setup?.destroy();await owner?.destroy();}
