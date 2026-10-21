// Owner-authorized local setup. Passwords stay in memory and a DPAPI handoff.
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFile, access, unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/identity/database.js';
import { createIdentityService, identity } from '../src/identity/service.js';
import { createInput } from '../src/identity/validation.js';
import { createApp } from '../src/app.js';
import { identityConfig } from '../src/identity/config.js';
import { loadConfig } from '../src/config/index.js';

const handoff='server/.local/p21a/initial-administrator.credential.clixml';
function privateHandoff(action, value) {
  const child=spawnSync('pwsh.exe',['-NoProfile','-NonInteractive','-File','server/tools/Administrator-Handoff.ps1','-Action',action],
    {input:value ? JSON.stringify(value):undefined,encoding:'utf8',windowsHide:true});
  if(child.status!==0) throw new Error('Private encrypted handoff operation failed; account state was preserved.');
  return action==='Read' ? JSON.parse(child.stdout):undefined;
}
let db,server,stage='runtime-connection';
try {
  if(process.env.DB_NAME!=='upms' || process.env.IDENTITY_DB_PURPOSE!=='runtime') throw new Error('Verified main runtime profile required.');
  db=createDatabase(process.env);
  await db.raw('SELECT 1');
  const admins=await db('user_roles').where({role_code:'administrator'}).select('user_id');
  let credentials,created=false;
  if(!admins.length) {
    stage='encrypted-handoff';
    try {await access(handoff);credentials=privateHandoff('Read');}
    catch(error) {
      if(error.code!=='ENOENT') throw error;
      credentials={username:'upms_admin',password:randomBytes(36).toString('base64url')};
      privateHandoff('Save',credentials);
    }
    // No direct SQL user insertion; the supported service serializes bootstrap and audit.
    stage='supported-bootstrap';
    await createIdentityService(db).bootstrap({...createInput.parse({...credentials,displayName:'UPMS Administrator',roles:['administrator'],reason:'Owner-authorized automated local setup'}),requirePasswordChange:true});
    created=true;
  } else {
    stage='existing-account-handoff';
    // Never create another administrator or reset an existing password.
    try {await access(handoff);credentials=privateHandoff('Read');} catch(error) {if(error.code!=='ENOENT') throw error;}
  }
  if(!credentials) {
    console.info(JSON.stringify({database:'upms',administratorExists:true,bootstrap:'preserved existing account',authentication:'owner credentials unavailable; no reset performed'}));
  } else {
    stage='local-api-verification';
    const account=await db('users').where({login_key:credentials.username}).first('id');
    if(!account) throw new Error('Handoff does not match the existing administrator.');
    const state=await identity(db,account.id);
    if(!state.roles.includes('administrator'))throw new Error('Handoff account is not an administrator.');
    if(!state.passwordChangeRequired){
      await unlink(handoff);
      console.info(JSON.stringify({database:'upms',administratorExists:true,bootstrap:'existing account preserved',passwordRotation:'completed',temporaryHandoff:'removed',authentication:'owner-selected password preserved'}));
    } else {
    const bootstrapEvent=await db('identity_audit_events').where({target_id:account.id,action:'administrator.bootstrap'}).first('id');
    await writeFile('server/.local/p21a/initial-administrator.metadata.json',JSON.stringify({userId:String(account.id),bootstrapEventId:String(bootstrapEvent.id)}));
    const origin='http://127.0.0.1';
    const management=identityConfig({MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:origin,SESSION_SECRET:randomBytes(48).toString('hex')});
    const app=createApp({config:loadConfig({NODE_ENV:'development',INQUIRY_MODE:'Disabled'}),management,identityDatabase:db});
    server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
    const base=`http://127.0.0.1:${server.address().port}`,prefix='/api/v1/management';
    let cookie='';
    async function request(path,method='GET',body,token) {
      const response=await fetch(base+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(token?{'X-CSRF-Token':token}:{})},body:body?JSON.stringify(body):undefined});
      const set=response.headers.getSetCookie();if(set.length)cookie=set.map(value=>value.split(';')[0]).join('; ');
      return response;
    }
    const csrf=await (await request(prefix+'/session/csrf')).json();
    const missingCsrf=await request(prefix+'/session/login','POST',credentials);assert.equal(missingCsrf.status,403);
    const login=await request(prefix+'/session/login','POST',credentials,csrf.csrfToken);assert.equal(login.status,200,'Supported login must succeed.');
    assert.match(login.headers.get('set-cookie'),/HttpOnly/i);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/i);
    const authenticated=await login.json();assert.equal(authenticated.user.passwordChangeRequired,true,'Temporary credentials must remain rotation-restricted.');
    const current=await request(prefix+'/session/current');assert.equal(current.status,200);
    const denied=await request(prefix+'/users');assert.equal(denied.status,403);assert.equal((await denied.json()).error.code,'PASSWORD_CHANGE_REQUIRED');
    const oldCookie=cookie;
    assert.equal((await request(prefix+'/session/logout','POST',{},authenticated.csrfToken)).status,204);
    cookie=oldCookie;assert.equal((await request(prefix+'/session/current')).status,401);
    assert.equal((await request('/')).status,200);
    const events=await db('identity_audit_events').where({target_id:authenticated.user.id}).whereIn('action',['administrator.bootstrap','login.succeeded','session.logout']).select('action');
    for(const action of ['administrator.bootstrap','login.succeeded','session.logout'])assert.ok(events.some(event=>event.action===action));
    const result={database:'upms',bootstrap:created?'created through supported service':'existing account preserved',administratorCount:1,restrictedRuntime:true,
      login:true,csrfRejection:true,cookie:true,profile:true,firstLoginRestriction:true,logout:true,oldSessionRejected:true,audit:true,publicWebsite:true,ownerPasswordRotation:'required at first login',handoff:'Windows DPAPI; private local dialog'};
    await writeFile(`server/.local/p21a/automated-setup-${Date.now()}.json`,JSON.stringify(result,null,2),{flag:'wx'});
    console.info(JSON.stringify(result));
    credentials=null;
    }
  }
} catch {
  console.error(`Automated setup stopped at ${stage}. Existing accounts/data were preserved; no password or SQL diagnostics are logged.`);process.exitCode=1;
} finally {if(server)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});await db?.destroy();}
