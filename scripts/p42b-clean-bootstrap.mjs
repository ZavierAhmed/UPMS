import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { phpBridge } from './uath1-preview.mjs';
import { verifyUatEngine } from './php-7-5-engine-guard.mjs';
import { protectPrivateDirectory } from './php-7-5-private-directory.mjs';

await verifyUatEngine();
const id=String(Date.now());
const schema='upms_test_php_p42b_'+id;
const dir=resolve('tmp/php-runtime/p42b-'+id);
await mkdir(dir);
await protectPrivateDirectory(dir);
const users={installer:'p42bi_'+id,definer:'p42bd_'+id,runtime:'p42br_'+id};
const secret=()=>randomBytes(24).toString('hex');
const databasePasswords=Object.fromEntries(Object.keys(users).map(role=>[role,secret()]));
const enrollment={admin:secret(),haris:secret()};
const roles={installer:'CREATE,REFERENCES,SELECT,INSERT,UPDATE',definer:'SELECT,TRIGGER',runtime:'SELECT,INSERT,UPDATE,DELETE'};
const config=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=await mysql.createConnection({host:'127.0.0.1',port:3330,user:'php2_test_admin',password:config.password});
try{
  await db.query('CREATE DATABASE `'+schema+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  for(const [role,user] of Object.entries(users)){
    await db.query("CREATE USER '"+user+"'@'localhost' IDENTIFIED BY ?",[databasePasswords[role]]);
    await db.query('GRANT '+roles[role]+' ON `'+schema.replaceAll('_','\\_')+"`.* TO '"+user+"'@'localhost'");
  }
}finally{await db.end();}
const reference='p42b-clean-'+id;
const release=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const journal=resolve(dir,'bootstrap.json');
function run(interrupt){
  return spawnSync(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/p42b-clean-bootstrap.php'],{
    input:JSON.stringify({schema,users,databasePasswords,enrollment,reference,release,journal,interrupt}),
    encoding:'utf8',timeout:180000,windowsHide:true,
  });
}
const stopped=run(true);
assert.equal(stopped.status,41,stopped.stderr.trim());
const finished=run(false);
assert.equal(finished.status,0,finished.stderr.trim());
const result=JSON.parse(finished.stdout);
const repeated=run(false);
assert.equal(repeated.status,0,repeated.stderr.trim());
assert.deepEqual(JSON.parse(repeated.stdout),result);
assert.equal(result.state,'CUMULATIVE_PENDING');
assert.equal(result.productionStartupEnabled,false);
const envPath=resolve(dir,'test.env');
await writeFile(envPath,[
  'APP_ENV=testing','APP_DEBUG=false','APP_KEY=base64:'+randomBytes(32).toString('base64'),
  'UPMS_ENABLED=true','UPMS_DB_HOST=127.0.0.1','UPMS_DB_PORT=3330','UPMS_DB_DATABASE='+schema,
  'UPMS_DB_USERNAME='+users.runtime,'UPMS_DB_PASSWORD='+databasePasswords.runtime,
  'UPMS_ORIGIN=https://app.unique-plastic.test','INQUIRY_MODE=Disabled',
].join('\n')+'\n',{flag:'wx',mode:0o600});
async function login(username){
  let cookies={};
  const prefix='/api/v1/management/';
  const call=async(method,path,csrf,body)=>{
    const r=await phpBridge(envPath,{method,path:prefix+path,cookies,
      ...(method==='POST'?{headers:{origin:'https://app.unique-plastic.test','x-csrf-token':csrf},raw:JSON.stringify(body)}:{})});
    Object.assign(cookies,r.cookies);
    return r;
  };
  const csrf=await call('GET','session/csrf');
  assert.equal(csrf.status,200);
  const token=JSON.parse(csrf.raw).csrfToken;
  const signedIn=await call('POST','session/login',token,{username,password:enrollment[username]});
  assert.equal(signedIn.status,200,JSON.parse(signedIn.raw).error?.code);
  const login=JSON.parse(signedIn.raw);
  assert.equal(login.user.passwordChangeRequired,true);
  const business=await call('GET','simple-v1/documents');
  assert.equal(business.status,403);
  const bad=await call('POST','session/logout','invalid',{});
  assert.equal(bad.status,403);
  const revokedCookie={...cookies};
  const logout=await call('POST','session/logout',login.csrfToken,{});
  assert.equal(logout.status,204);
  cookies=revokedCookie;
  const revoked=await call('GET','session/current');
  assert.equal(revoked.status,401);
  return {login:signedIn.status,forcedRotation:true,businessBlocked:business.status,badCsrf:bad.status,
    logout:logout.status,revoked:revoked.status};
}
const sessions=await Promise.all([login('admin'),login('haris')]);
await mkdir('tmp/phase-4.2b',{recursive:true});
const report={...result,passed:true,interruptedAfterDdlBeforeReceipt:true,idempotentResume:true,
  applicationMode:'isolated Laravel identity boundary',distinctAdministrators:2,sessions};
await writeFile('tmp/phase-4.2b/bootstrap-acceptance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
