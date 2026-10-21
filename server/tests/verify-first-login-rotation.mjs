// Append-only synthetic fixture in the already approved test schema; never upms.
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { createDatabase, transaction } from '../src/identity/database.js';
import { hashPassword } from '../src/identity/passwords.js';
import { audit } from '../src/identity/service.js';
import { createApp } from '../src/app.js';
import { identityConfig } from '../src/identity/config.js';
import { loadConfig } from '../src/config/index.js';
if(process.env.DB_NAME!=='upms_test_p21a_20261021'||process.env.DB_USER!=='upms_runtime_test_p21a')throw new Error('Approved synthetic runtime required.');
const db=createDatabase(process.env),initial=randomBytes(32).toString('hex'),next=randomBytes(32).toString('hex');
const username=`rotation_${randomBytes(6).toString('hex')}`;
let browser,server,app;
try {
  const hash=await hashPassword(initial);
  // Synthetic fixture setup only. Main administrator uses supported bootstrap.
  const userId=await transaction(db,async trx=>{
    const [id]=await trx('users').insert({login_key:username,display_name:'Synthetic Rotation Check',password_hash:hash,enabled:true,created_at:new Date(),updated_at:new Date()});
    await trx('user_roles').insert({user_id:id,role_code:'administrator'});
    await audit(trx,null,id,'administrator.bootstrap',{requirePasswordChange:true,source:'synthetic-first-login-test'});return id;
  });
  server=createServer((req,res)=>app(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  app=createApp({config:loadConfig({NODE_ENV:'development',INQUIRY_MODE:'Disabled'}),management:identityConfig({MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:origin,SESSION_SECRET:randomBytes(48).toString('hex')}),identityDatabase:db});
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-extensions','--proxy-server=direct://','--proxy-bypass-list=*']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  async function login(password){
    await page.waitForSelector('input[name="username"]');await page.type('input[name="username"]',username);await page.type('input[name="password"]',password);
    await page.click('button[type="submit"], form button');
  }
  await page.goto(origin+'/management');await login(initial);
  await page.waitForSelector('input[name="current"]');
  assert.equal(await page.evaluate(()=>document.body.textContent.includes('Change your temporary password')),true);
  const blocked=await page.evaluate(async()=>{const r=await fetch('/api/v1/management/users');return {status:r.status,code:(await r.json()).error.code};});
  assert.deepEqual(blocked,{status:403,code:'PASSWORD_CHANGE_REQUIRED'});
  const oldCookies=await page.cookies();
  await page.type('input[name="current"]',initial);await page.type('input[name="new"]',next);
  await page.click('form button');await page.waitForSelector('input[name="username"]');
  const rejected=await fetch(origin+'/api/v1/management/session/current',{headers:{Cookie:oldCookies.map(c=>`${c.name}=${c.value}`).join('; ')}});assert.equal(rejected.status,401);
  await login(next);await page.waitForFunction(()=>document.body.textContent.includes('Welcome, Synthetic Rotation Check'));
  assert.equal(await page.evaluate(async()=>(await fetch('/api/v1/management/users')).status),200);
  const changed=await db('identity_audit_events').where({target_id:userId,action:'user.password.changed'}).first();assert.ok(changed);
  assert.deepEqual(errors,[]);
  await writeFile('tmp/w06/p21a/first-login-rotation.json',JSON.stringify({database:process.env.DB_NAME,forcedProfile:true,administrationDeniedBeforeChange:true,browserPasswordChange:true,oldSessionRejected:true,newPasswordLogin:true,administrationAvailableAfterChange:true,atomicPasswordAudit:true,pageErrors:errors,ownerCredentialsUsed:false},null,2));
  console.info('Synthetic first-login browser rotation passed; no owner credentials used.');
} finally {await browser?.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});await db.destroy();}
