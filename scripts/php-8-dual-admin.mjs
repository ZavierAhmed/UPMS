import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import knex from 'knex';
import express from 'express';
import request from 'supertest';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {up as identitySchema} from '../server/migrations/202610210001_identity.js';
import {up as v1Schema} from '../server/simple-v1-migrations/202610240001_simple_v1.js';
import {up as entrySchema} from '../server/simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../server/src/identity/service.js';
import {managementRouter} from '../server/src/identity/router.js';
import {grantPhp6} from './php-2-runtime-grants.mjs';
import {permittedOperator} from '../server/src/simple-v1/operators.js';
await verifyUatEngine();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const php=process.env.PHP8_BINARY||resolve('tmp/php-runtime/bin/php.exe'),args=JSON.parse(process.env.PHP8_ARGS||'[]');
const run=Date.now(),schema='upms_test_php_6_dual_'+run,dir=resolve('tmp/php-runtime/php8-dual-'+run);
await mkdir(dir);const connection={host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true};
const root=knex({client:'mysql2',connection,pool:{min:0,max:2}});let db;let checks=0;const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
function cli(file,input,extra={}){return new Promise((done,reject)=>{const p=spawn(php,[...args,file],{env:{...process.env,...extra},windowsHide:true});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>{try{done({code,...JSON.parse(out)});}catch{reject(Error('Invalid private fixture output '+err.slice(0,200)));}});p.stdin.end(JSON.stringify(input));});}
const base='/api/v1/management',prefix=base+'/simple-v1/',origin='https://app.unique-plastic.test';
const initial='Synthetic-Existing-Admin-Only-2026!',newPass='Synthetic-Rotated-Account-Only-2026!';
try{
 await root.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);db=knex({client:'mysql2',connection:{...connection,database:schema},pool:{min:0,max:6}});
 await identitySchema(db);await v1Schema(db);await entrySchema(db);
 await createIdentityService(db).bootstrap({username:'admin',displayName:'Admin',password:initial});
 await db('v1_control').where({id:1}).update({operator_id:'1',state:'READY',cutover_evidence:'Synthetic dual-admin only'});
 const original=(await db('users').where({id:1}).first()).password_hash,control=await db('v1_control').first();
 const input={...connection,schema,reference:'synthetic_dual_'+run,passwords:{admin:randomBytes(32).toString('hex'),haris:randomBytes(32).toString('hex')}};
 const provision=()=>cli('upms.php/tests/Support/provision-fixture.php',input);
 const first=await provision();check(first.code,0);check(first.created,['haris']);check(first.users,{admin:'1',haris:'2'});
 check((await db('users').where({id:1}).first()).password_hash,original);check(await db('v1_control').first(),control);
 const audits=await db('identity_audit_events').count('* as count').first();check((await provision()).changed,false);check(await db('identity_audit_events').count('* as count').first(),audits);
 await db('users').where({id:2}).update({display_name:'Conflicting owner name'});check((await provision()).error,'DESIGNATED_USERNAME_CONFLICT');await db('users').where({id:2}).update({display_name:'Haris'});
 const map={schema,users:first.users};db.upmsDesignatedOperators=map;
 for(const name of ['admin','haris'])check(permittedOperator({id:first.users[name],username:name},control,map,schema),true);
 for(const invalid of [{...map,schema:'wrong'},{...map,users:{admin:'1',haris:'1'}},{...map,users:{admin:1,haris:'2'}},{...map,extra:true},'invalid']){assert.throws(()=>permittedOperator({id:'1',username:'admin'},control,invalid,schema));checks++;}
 check(permittedOperator({id:'3',username:'third'},control,map,schema),false);
 const runtime='php6_dual_'+run,secret=randomBytes(32).toString('hex');await grantPhp6(root,schema,runtime,secret);
 const envFile=dir+'/runtime.env';await writeFile(envFile,`APP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=${origin}\nUPMS_DB_HOST=127.0.0.1\nUPMS_DB_PORT=3330\nUPMS_DB_DATABASE=${schema}\nUPMS_DB_USERNAME=${runtime}\nUPMS_DB_PASSWORD=${secret}\nUPMS_DESIGNATED_OPERATORS='${JSON.stringify(map)}'\n`,{mode:0o600});
 const app=express();app.use((req,res,next)=>{req.peer={secure:true};next();});app.use(managementRouter(db,{origin,secure:true,secret:randomBytes(40).toString('hex'),cookieName:'__Host-dual',idleMs:1800000,absoluteMs:28800000,simpleV1:true,root:'upms.client/dist/management'}));
 function driver(side){return{cookies:{},csrf:'',async call(method,path,body={},key=randomUUID()){
 const headers={origin,'x-csrf-token':this.csrf,'idempotency-key':key};let r;
 if(side==='php'){r=await cli('upms.php/tests/Support/http-bridge.php',{method,path,headers,cookies:this.cookies,raw:method==='GET'?null:JSON.stringify(body)},{UPMS_PHP2_ENV:envFile});r.body=r.raw?JSON.parse(r.raw):null;Object.assign(this.cookies,r.cookies);}
 else{let q=request(app)[method.toLowerCase()](path).set({...headers,Host:'app.unique-plastic.test',Cookie:Object.entries(this.cookies).map(([k,v])=>k+'='+v).join('; ')});if(method!=='GET')q=q.send(body);const response=await q;r={status:response.status,body:response.body};for(const cookie of response.headers['set-cookie']||[]){const [k,v]=cookie.split(';')[0].split('=');this.cookies[k]=v;}}
 if(r.body?.csrfToken)this.csrf=r.body.csrfToken;return r;
 }};}
 async function login(d,name,password){await d.call('GET',base+'/session/csrf');const r=await d.call('POST',base+'/session/login',{username:name,password});check(r.status,200);return r;}
 // Each implementation uses the same committed fixture, with independent sessions.
 for(const side of ['php','node']){
  const users={};for(const name of ['admin','haris']){const d=driver(side);const current=side==='php'?(name==='admin'?initial:input.passwords.haris):newPass;
   const r=await login(d,name,current);
   if(side==='php'){check(r.body.user.passwordChangeRequired,true);check((await d.call('POST',prefix+'items',{description:'Blocked',quality:'A',colour:'Graphite',packing:'12',sellingPrice:'10'})).status,403);check((await d.call('POST',base+'/profile/password',{currentPassword:current,newPassword:newPass})).status,204);await login(d,name,newPass);}
   users[name]=d;
  }
  const body={description:'Dual '+side,quality:'A',colour:'Graphite',packing:'12',sellingPrice:'10.01'},key=randomUUID();
  const result=await users.admin.call('POST',prefix+'items',body,key);check(result.status,201);check((await users.haris.call('POST',prefix+'items',body,key)).status,409);
  const concurrent=await Promise.all(['admin','haris'].map((name,i)=>users[name].call('POST',prefix+'items',{...body,description:body.description+i})));check(concurrent.map(r=>r.status),[201,201]);
  const actors=await db('v1_commands').whereIn('key',[key]).pluck('actor_id');check(actors.map(String),['1']);
  await db('v1_control').where({id:1}).update({state:'PENDING'});check((await users.haris.call('POST',prefix+'items',body)).status,409);await db('v1_control').where({id:1}).update({state:'READY'});
  await db('sessions').where({user_id:'2'}).update({revoked:1});check((await users.haris.call('POST',prefix+'items',body)).status,401);
 }
 const commandActors=(await db('v1_commands').distinct('actor_id')).map(r=>String(r.actor_id)).sort();check(commandActors,['1','2']);
 const result={passed:true,checks,php,schema,ownerDatabaseContacted:false,productionAccountsCreated:false};await writeFile(dir+'/evidence.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,evidence:dir+'/evidence.json'}));
}finally{if(db)await db.destroy();await root.destroy();}
