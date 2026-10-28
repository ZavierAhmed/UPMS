// Independent fresh-schema editable-pricing matrix; transport/bootstrap mirrors the accepted PHP-6 harness.
import {editablePricingProbes} from './php-7-6-pricing-probes.mjs';
import {lostCommitProxy} from './php-test-commit-proxy.mjs';
import {integrityProbes} from './php-7-1-probes.mjs';
import {integrityPrivileges} from './php-7-1-privileges.mjs';
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
import {grantPhp6} from './php-2-runtime-grants.mjs';

const php=process.env.PHP76_BINARY,phpArgs=JSON.parse(process.env.PHP76_ARGS||'[]');
assert.ok(php,'Explicit PHP6_BINARY required');assert.ok(process.env.PHP_TEST_ADMIN_PASSWORD,'Isolated admin password required');
const port=3330,host='127.0.0.1',run=Date.now().toString(),directory=resolve('tmp/php-runtime/php76-pricing_'+run);
await mkdir(directory,{recursive:false});
const adminConnection={host,port,user:process.env.PHP_TEST_ADMIN_USER||'root',password:process.env.PHP_TEST_ADMIN_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false};
const admin=knex({client:'mysql2',connection:adminConnection,pool:{min:0,max:2}});
const databases=[],evidence=[],checks=[],raceKeys=new Set();
const origin='https://app.unique-plastic.test',base='/api/v1/management',prefix=base+'/simple-v1/';
const password='Synthetic-PHP6-Only-2026!';
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
async function snapshot(db){const result={};for(const table of ['v1_control','v1_items','v1_stock','v1_parties','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands']){const order=table==='v1_commands'?'key':table==='v1_stock'?'item_id':'id';result[table]=normalize(await db(table).orderBy(order));if(table==='v1_commands'){result[table]=result[table].map(row=>({...row,key:raceKeys.has(row.key)?'<concurrent-winner:'+row.fingerprint+'>':row.key})).sort((a,b)=>a.key.localeCompare(b.key));}}return result;}
async function tables(name){const a=await snapshot(databases[0]),b=await snapshot(databases[1]);try{assert.deepEqual(b,a);}catch(error){await writeFile(directory+'/table-failure.json',JSON.stringify({name,reference:a,php:b},null,2));throw Error(name+' database parity failed: '+error.message.slice(0,500));}checks.push({name,tables:10,sha256:createHash('sha256').update(JSON.stringify(a)).digest('hex')});}
async function login(a,b,user='php-admin'){await a.call('GET',base+'/session/csrf');await b.call('GET',base+'/session/csrf');const [x,y]=await Promise.all([a.call('POST',base+'/session/login',{username:user,password}),b.call('POST',base+'/session/login',{username:user,password})]);assert.equal(x.status,200);assert.equal(y.status,200);assert.deepEqual(y.body.user,x.body.user);}
try{
 const [[engine]]=await admin.raw('SELECT VERSION() AS version,@@port AS port');assert.match(engine.version,/^10\.11\.19-MariaDB/);assert.equal(Number(engine.port),port);
 for(const side of ['ref','app']){
  const name='upms_test_php_6_'+side+'_'+run;assert.match(name,/^upms_test_php_6_(ref|app)_[0-9]+$/);
  await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[name]);
  const db=knex({client:'mysql2',connection:{...adminConnection,database:name,timezone:'Z'},pool:{min:0,max:6}});databases.push(db);
  await identitySchema(db);await v1Schema(db);await entrySchema(db);
  const identity=createIdentityService(db);await identity.bootstrap({username:'php-admin',displayName:'Synthetic PHP6 administrator',password});
  const [owner]=await db('users').where({id:1});for(const [id,user,role]of [[2,'inventory','inventory'],[3,'other-admin','administrator']]){await db('users').insert({...owner,id,login_key:user,display_name:user});await db('user_roles').insert({user_id:id,role_code:role});}
  await db('v1_control').where({id:1}).update({operator_id:'1',state:'READY',cutover_evidence:'Isolated PHP-6 acceptance only'});
  if(side==='app'){
   const user='php6_'+run,runtimePassword=randomBytes(32).toString('hex');await grantPhp6(admin,name,user,runtimePassword);
   envFile=directory+'/php.env';await writeFile(envFile,`APP_NAME="Unique Plastic Industry"\nAPP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=${origin}\nUPMS_DB_HOST=${host}\nUPMS_DB_PORT=${port}\nUPMS_DB_DATABASE=${name}\nUPMS_DB_USERNAME=${user}\nUPMS_DB_PASSWORD=${runtimePassword}\n`);
  }
 }
 referenceApp=express();referenceApp.use((req,res,next)=>{req.peer={secure:true};next();});referenceApp.use(managementRouter(databases[0],{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-php2-reference',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));
 ref=refDriver(referenceApp);appDriver=phpDriver(envFile);await login(ref,appDriver);

 const date='2020-01-03';
 async function draft(name,body,opts){return same(name+' draft','POST',prefix+'documents',{date,...body},opts);}
 async function post(name,body){const d=await draft(name,body);const result=await same(name+' post','POST',prefix+'documents/'+d.id+'/post',{version:1});assert.equal(result.status,'POSTED');return result;}
 const fixture=await editablePricingProbes({same,post,draft,tables,databases,snapshot,date,ref,appDriver,raceKeys});
 const uncertain=await draft('PHP76 unknown custom challan',{kind:'CHALLAN',partyId:fixture.clientId,lines:[{itemId:fixture.itemId,quantity:'1',rate:'7.77'}]}),uncertainKey=randomUUID(),proxies=[];let faultDb;
 try{
  for(let side=0;side<2;side++)proxies.push(await lostCommitProxy({host,port}));
  faultDb=knex({client:'mysql2',connection:{...adminConnection,database:databases[0].client.connectionSettings.database,port:proxies[0].port,timezone:'Z'},pool:{min:0,max:3}});const faultApp=express();faultApp.use((req,res,next)=>{req.peer={secure:true};next();});faultApp.use(managementRouter(faultDb,{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-php6-uncertain',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));const faultEnv=directory+'/uncertain.env';await writeFile(faultEnv,(await readFile(envFile,'utf8')).replace('UPMS_DB_PORT=3330','UPMS_DB_PORT='+proxies[1].port));const faultRef=refDriver(faultApp),faultPhp=phpDriver(faultEnv);await login(faultRef,faultPhp);const outcomes=await Promise.all([faultRef.call('POST',prefix+'documents/'+uncertain.id+'/post',{version:1},{key:uncertainKey}),faultPhp.call('POST',prefix+'documents/'+uncertain.id+'/post',{version:1},{key:uncertainKey})]);assert.deepEqual(outcomes.map(r=>r.status),[503,503]);assert.ok(proxies.every(p=>p.dropped()));
 }finally{await faultDb?.destroy();for(const p of proxies){for(const socket of p.sockets)socket.destroy();await new Promise(r=>p.proxy.close(r));}}
 const committed=await snapshot(databases[1]);assert.equal((await databases[1]('v1_documents').where({id:uncertain.id}).first()).status,'POSTED');await same('replay after real lost COMMIT acknowledgement','POST',prefix+'documents/'+uncertain.id+'/post',{version:1},{key:uncertainKey});assert.deepEqual(await snapshot(databases[1]),committed);await tables('unknown COMMIT result replays one durable custom challan outcome');checks.push({name:'PHP76 custom-rate lost COMMIT acknowledgements',dropped:2,serverCommitted:true,replayWithoutDuplicates:true});
 const final=await same('PHP76 final lost-COMMIT reconciliation','GET',prefix+'reconciliation');assert.equal(final.matched,true);await tables('PHP76 final all ten business tables');
 const report={phpBinary:php,engine:engine.version,schemas:databases.map(db=>db.client.connectionSettings.database),httpComparisons:evidence.length,snapshotComparisons:checks.filter(c=>c.tables).length,evidence,checks,ownerDatabaseContacted:false,migrationsModified:false};await writeFile(directory+'/evidence.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,httpComparisons:report.httpComparisons,snapshots:report.snapshotComparisons,evidence:directory+'/evidence.json'}));
}finally{for(const db of databases)await db.destroy();await admin.destroy();}
