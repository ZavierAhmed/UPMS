// Local MariaDB + real PHP HTTP kernel only. No production connection or deployment.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {up as identitySchema} from '../server/migrations/202610210001_identity.js';
import {up as v1Schema} from '../server/simple-v1-migrations/202610240001_simple_v1.js';
import {up as entrySchema} from '../server/simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../server/src/identity/service.js';
await verifyUatEngine();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),run=Date.now().toString(),schema='upms_test_php_p31_'+run,runtime='p31_rt_'+run,dir=resolve('tmp/php-runtime/p31-'+run),php=resolve('tmp/php-runtime/bin/php.exe');
await mkdir(dir);const connection={host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true};
const admin=knex({client:'mysql2',connection,pool:{min:0,max:1}});let db;
const tests=[];const check=(name)=>tests.push(name);
function execute(file,input,env={}){return new Promise((done,fail)=>{const p=spawn(php,[file],{windowsHide:true,env:{...process.env,...env},stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',fail);p.on('close',code=>{if(code!==0)return fail(Error('Local PHP helper failed: '+file+' (credentials withheld)'));try{done(JSON.parse(out));}catch{fail(Error('Local PHP helper invalid JSON: '+file+' (output withheld)'));}});p.stdin.end(JSON.stringify(input));});}
try{
 await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);db=knex({client:'mysql2',connection:{...connection,database:schema},pool:{min:0,max:1}});
 await identitySchema(db);await v1Schema(db);await entrySchema(db);
 await db.schema.createTable('upms_production_migrations',t=>{t.integer('id').primary();});
 const loginPassword=randomBytes(24).toString('hex');await createIdentityService(db).bootstrap({username:'php-admin',displayName:'Synthetic P31 administrator',password:loginPassword});
 await db('v1_control').where({id:1}).update({operator_id:1,state:'READY',cutover_evidence:'Synthetic P31 only'});
 const runtimePassword=randomBytes(24).toString('hex');await admin.raw('CREATE USER ??@? IDENTIFIED BY ?',[runtime,'localhost',runtimePassword]);await admin.raw('GRANT SELECT,INSERT,UPDATE,DELETE ON ??.* TO ??@?',[schema,runtime,'localhost']);
 const guards=await execute('upms.php/tests/Support/p31-guards.php',{port:3330,schema,user:connection.user,password:engine.password,runtime});assert.equal(guards.triggers,45);check('45 actual guards installed on isolated MariaDB');
 const envFile=dir+'/test.env';await writeFile(envFile,`APP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=https://app.unique-plastic.test\nUPMS_DB_HOST=127.0.0.1\nUPMS_DB_PORT=3330\nUPMS_DB_DATABASE=${schema}\nUPMS_DB_USERNAME=${runtime}\nUPMS_DB_PASSWORD=${runtimePassword}\n`,{mode:0o600});
 let cookies={},csrf='';
 async function call(method,path,body,headers={},key=randomUUID()){
  const r=await execute('upms.php/tests/Support/http-bridge.php',{method,path:'/api/v1/management'+path,cookies,headers:{...(method!=='GET'?{Origin:'https://app.unique-plastic.test','X-CSRF-Token':csrf,'Idempotency-Key':key}:{}),...headers},raw:method==='GET'?null:JSON.stringify(body??{})},{UPMS_PHP2_ENV:envFile});r.body=r.raw?JSON.parse(r.raw):null;Object.assign(cookies,r.cookies);if(r.body?.csrfToken)csrf=r.body.csrfToken;return r;
 }
 let r=await call('GET','/simple-v1/hafta');assert.equal(r.status,401);check('unauthenticated report rejected');
 await call('GET','/session/csrf');r=await call('POST','/session/login',{username:'php-admin',password:loginPassword});assert.equal(r.status,200);
 const request=(m,p,b,h,k)=>call(m,'/simple-v1'+p,b,h,k);
 const ok=async(m,p,b,key)=>{const r=await request(m,p,b,{},key);assert.ok([200,201].includes(r.status),p+' '+JSON.stringify(r.body));return r.body;};
 const onlyName={description:'Synthetic bottle'},key=randomUUID(),i=await ok('POST','/items',onlyName,key);const retry=await ok('POST','/items',onlyName,key);assert.deepEqual(i,retry);check('name-only create and idempotent retry');
 const second=await ok('POST','/items',onlyName);assert.notEqual(i.code,second.code);const variant=await ok('POST','/items',{description:'Synthetic bottle',quality:'HDPE 500ml'});assert.notEqual(variant.code,i.code);check('identical and similar names keep distinct stock identities');
 let item=await db('v1_items').where({id:i.id}).first();assert.equal(item.quality,'');assert.equal(item.colour,'');assert.equal(item.packing,'');assert.equal(item.selling_price,null);
 await ok('PATCH','/items/'+i.id,{description:'Synthetic bottle revised',sellingPrice:'0.20',version:item.version});item=await db('v1_items').where({id:i.id}).first();await ok('PATCH','/items/'+i.id,{description:'Historical name',version:item.version});item=await db('v1_items').where({id:i.id}).first();assert.equal(item.selling_price,'0.20');assert.equal(item.code,i.code);check('edit preserves omitted price and immutable code');
 r=await request('PATCH','/items/'+i.id,{description:'x',code:'ALTERED',version:item.version});assert.equal(r.status,400);r=await request('POST','/items',{description:'x',sellingPrice:'0'});assert.equal(r.status,400);check('code mutation and zero default price rejected');
 async function post(body){const d=await ok('POST','/documents',body);return ok('POST','/documents/'+d.id+'/post',{version:1});}
 const party=await ok('POST','/parties',{kind:'CLIENT',name:'Synthetic Hafta client'});
 await post({kind:'CLIENT_OPENING',date:'2026-10-25',partyId:party.id,amount:'100.00',direction:'OWED_TO_COMPANY'});
 await post({kind:'STOCK_OPENING',date:'2026-10-25',lines:[{itemId:i.id,quantity:'100',rate:'0'}]});
 const dc=await post({kind:'CHALLAN',date:'2026-10-26',partyId:party.id,discountMode:'PERCENT',discountValue:'10',lines:[{itemId:i.id,quantity:'3',rate:'0.20',reviewedItemVersion:item.version}]});
 item=await db('v1_items').where({id:i.id}).first();await ok('PATCH','/items/'+i.id,{description:'Changed current catalog',sellingPrice:null,version:item.version});
 const receipt=await post({kind:'CLIENT_PAYMENT',date:'2026-10-27',partyId:party.id,amount:'10',method:'CHEQUE_RECEIVED',chequeReference:'SYNTHETIC-P31-CHEQUE'});
 await post({kind:'PAYMENT_REVERSAL',date:'2026-10-28',partyId:party.id,correctsId:receipt.id,amount:'10',reason:'Synthetic reversal'});
 const original=await ok('GET','/documents/'+dc.id);await post({kind:'CHALLAN_RETURN',date:'2026-10-29',partyId:party.id,originalId:dc.id,reason:'Synthetic return',lines:[{itemId:i.id,originalLineId:original.returnableLines[0].id,quantity:'1',rate:'0.20'}]});
 const before=await snapshot();r=await ok('GET','/hafta?from=2026-10-26&to=2026-11-01&parties='+party.id);const b=r.blocks[0];assert.equal(b.total,'0.36');assert.equal(b.balance,'100.36');assert.equal(b.receipts,'10.00');assert.equal(b.receiptReversals,'10.00');assert.equal(b.rows[0].description,'Historical name');assert.equal(b.rows[0].rate,'0.20');assert.equal(b.rows[0].amount,'0.60');assert.equal(b.advance,null);assert.deepEqual(await snapshot(),before);check('real posted snapshots, discounts, returns, receipts/reversal and exact balances; report makes no writes');
 await writeFile(dir+'/report.json',JSON.stringify(r,null,2));
 const vendor=await ok('POST','/parties',{kind:'VENDOR',name:'Separate vendor'});r=await request('GET','/hafta?parties='+vendor.id);assert.equal(r.status,400);check('vendor selection rejected');
 r=await request('GET','/hafta?from=2026-02-30');assert.equal(r.status,400);check('invalid date rejected');
 await db('user_roles').where({user_id:1}).del();r=await request('GET','/hafta');assert.equal(r.status,403);check('revoked administrator authorization rejected');
 const runtimeDb=knex({client:'mysql2',connection:{...connection,database:schema,user:runtime,password:runtimePassword},pool:{min:0,max:1}});try{await assert.rejects(runtimeDb('v1_lines').update({amount:'1.00'}));await assert.rejects(runtimeDb('v1_audit').del());}finally{await runtimeDb.destroy();}check('runtime immutable line/audit mutations still denied');
 const result={passed:true,php:'8.3',database:schema,guardCount:45,checks:tests,checkCount:tests.length,productionContacted:false,verifiedUtc:new Date().toISOString()};await mkdir('docs/phase-3.1/evidence',{recursive:true});await writeFile('docs/phase-3.1/evidence/local-integration.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 async function snapshot(){const names=(await db.raw('SHOW TABLES'))[0].map(r=>Object.values(r)[0]).filter(t=>!['sessions','login_attempts'].includes(t));const rows={};for(const t of names){rows[t]=(await db(t).select('*')).map(r=>JSON.stringify(r)).sort();}return createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
}finally{if(db)await db.destroy();await admin.destroy();}
