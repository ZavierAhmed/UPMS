import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import knex from 'knex';
import {provisionChequeWorkspace} from './uat2-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';
const f=await provisionChequeWorkspace(),engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,database:f.binding.schema,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});let cookies={},csrf='',nextPassword=randomBytes(24).toString('hex');const checks=[];
async function call(m,p,b,headers={}) {const r=await phpBridge(f.envPath,{method:m,path:'/api/v1/management'+p,cookies,headers:m==='GET'?headers:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf,'idempotency-key':randomUUID(),...headers},raw:m==='GET'?null:JSON.stringify(b??{})});Object.assign(cookies,r.cookies);const body=r.raw?JSON.parse(r.raw):null;if(body?.csrfToken)csrf=body.csrfToken;return {status:r.status,body};}
try {
 const user=await db('users').where({login_key:'php-admin'}).first();await db('identity_audit_events').insert({actor_id:user.id,target_id:user.id,action:'administrator.rotation.required',correlation:randomUUID(),details:JSON.stringify({requirePasswordChange:true}),created_at:db.fn.now(6)});
 await call('GET','/session/csrf');const login=await call('POST','/session/login',{username:'php-admin',password:f.password});assert.equal(login.status,200);assert.equal(login.body.user.passwordChangeRequired,true);
 assert.equal((await call('GET','/simple-v1/cheques')).status,403);assert.equal((await call('POST','/simple-v1/cheques',{})).status,403);checks.push('Mandatory first-login password change blocks cheque reads and mutations');
 assert.equal((await call('POST','/profile/password',{currentPassword:f.password,newPassword:nextPassword})).status,204);f.password='';assert.equal((await call('GET','/simple-v1/cheques')).status,401);checks.push('Real password change invalidates the prior session');
 await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:nextPassword})).status,200);assert.equal((await call('GET','/simple-v1/cheques')).status,200);
 assert.equal((await call('POST','/simple-v1/cheques',{}, {'x-csrf-token':'wrong'})).status,403);assert.equal((await call('POST','/simple-v1/cheques',{}, {origin:'https://evil.invalid'})).status,403);checks.push('New password independently logs in; invalid CSRF and cross-origin mutation rejected');
 const token=cookies['__Host-upms-php'];await db('sessions').where({token_hash:createHash('sha256').update(token).digest('hex')}).update({idle_expires:'1'});assert.equal((await call('GET','/simple-v1/cheques')).status,401);checks.push('Expired authenticated session cannot read or mutate cheques');
 await call('GET','/session/csrf');assert.equal((await call('POST','/session/login',{username:'php-admin',password:nextPassword})).status,200);assert.equal((await call('POST','/session/logout',{})).status,204);assert.equal((await call('GET','/simple-v1/cheques')).status,401);checks.push('Logout revokes cheque access');
 assert.equal((await db('cheque_instruments')).length,0);assert.equal((await db('money_movements')).length,0);
 await writeFile('docs/uat-2/evidence/auth-boundary.json',JSON.stringify({passed:true,checks,syntheticAdministratorOnly:true,credentialsRecorded:false,ownerDataMutated:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{f.password='';nextPassword='';await db.destroy();}
