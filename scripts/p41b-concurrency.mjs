import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {phpBridge,privatePath} from './uath1-preview.mjs';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';

await verifyUatEngine();
const fixture=JSON.parse(await readFile(await privatePath('tmp/php-runtime/p4-uat2a-extras.json'),'utf8'));
const envPath=await privatePath(fixture.envPath);
const env=Object.fromEntries((await readFile(envPath,'utf8')).split(/\r?\n/)
  .filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
assert.match(fixture.binding.schema,/^upms_test_php_money_\d+$/);
assert.equal(env.UPMS_DB_DATABASE,fixture.binding.schema);
assert.equal(env.UPMS_DB_HOST,'127.0.0.1');
assert.equal(env.UPMS_DB_PORT,'3330');
const sessions=Array.from({length:5},()=>{
  const child=spawnSync('tmp/php-runtime/bin/php.exe',['upms.php/tests/Support/uat3-session.php'],{
    input:JSON.stringify({binding:fixture.binding,envPath}),encoding:'utf8',windowsHide:true,
    env:Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('UPMS_'))),
  });
  assert.equal(child.status,0,'Isolated session creation failed');
  return JSON.parse(child.stdout);
});
const report={passed:false,independentSessions:5,distinctActors:1,cases:[]};
async function request(session,path,method='GET'){
  const start=performance.now();
  const response=await phpBridge(envPath,{
    path:'/api/v1/management/'+path,method,cookies:{'__Host-upms-php':session.token},
    ...(method==='POST'?{raw:'{}',headers:{origin:'https://app.unique-plastic.test','x-csrf-token':session.csrfToken}}:{}),
  });
  return {path,status:response.status,code:response.raw?JSON.parse(response.raw).error?.code:undefined,
    reference:response.requestReference,ms:Math.round(performance.now()-start)};
}
async function batch(label,requests){
  const results=await Promise.all(requests);
  report.cases.push({label,results});
  assert.ok(results.every(result=>result.status===200),label);
}
const db=await mysql.createConnection({host:'127.0.0.1',port:3330,database:fixture.binding.schema,
  user:env.UPMS_DB_USERNAME,password:env.UPMS_DB_PASSWORD});
try{
  const paths=['state','documents?kind=CHALLAN','parties?kind=VENDOR','money','employee-hafta','cheques'];
  await db.beginTransaction();
  await db.query('SELECT id FROM identity_guard WHERE id=1 LOCK IN SHARE MODE');
  await batch('held shared guard, five sessions',sessions.map(session=>request(session,'simple-v1/documents')));
  await db.rollback();
  for(const path of paths){
    await batch('five concurrent sessions',sessions.map(session=>request(session,'simple-v1/'+path)));
  }
  await batch('three parallel reads, one session',paths.slice(0,3).map(path=>request(sessions[0],'simple-v1/'+path)));
  await db.beginTransaction();
  await db.query('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE');
  const blocked=await request(sessions[0],'simple-v1/documents');
  report.cases.push({label:'held exclusive guard',results:[blocked]});
  assert.equal(blocked.status,503);
  assert.equal(blocked.code,'READ_BUSY');
  await db.rollback();
  const logout=await request(sessions[0],'session/logout','POST');
  const revoked=await request(sessions[0],'simple-v1/documents');
  report.cases.push({label:'logout then read',results:[logout,revoked]});
  assert.equal(logout.status,204);
  assert.equal(revoked.status,401);
  report.passed=true;
}finally{
  await db.rollback();
  await db.end();
  await writeFile('docs/phase-4.1b/evidence/concurrency.json',JSON.stringify(report,null,2)+'\n');
}
