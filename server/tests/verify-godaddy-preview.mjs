// Package acceptance only. No SQL, owner secrets, GoDaddy session or share token.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {once} from 'node:events';
import {previewHostname} from '../src/godaddy/policy.js';
const directory=resolve(process.argv[2]),zip=resolve(process.argv[3]),output=resolve(process.argv[4]);
const manifest=JSON.parse(await readFile(resolve(directory,'deployment-manifest.json'),'utf8'));
assert.equal(manifest.kind,'godaddy-private-preview-blocked');assert.equal(manifest.providerAccepted,false);assert.equal(manifest.databaseOperationsEnabled,false);
const digest=createHash('sha256').update(await readFile(zip)).digest('hex');assert.equal(digest,(await readFile(zip+'.sha256','utf8')).split(' ')[0]);
const pkg=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8'));
assert.equal(pkg.main,'server/src/godaddy/index.js');assert.equal(pkg.scripts.start,'node server/src/godaddy/index.js');assert.equal(pkg.engines.node,'^22.23.4');
assert.ok(Object.keys(manifest.files).every(n=>!/(?:^|\/)(?:node_modules|\.git|\.local|\.env)(?:\/|$)|\.sql$|credential|za.khan|brochure/i.test(n)));
assert.equal(await readFile(resolve(directory,'.npmrc'),'utf8'),'registry=https://registry.npmjs.org/\n');
execFileSync(process.execPath,['scripts/check-deployment.mjs'],{cwd:directory,stdio:'pipe'});
const file=resolve(directory,'PRODUCTION-HOSTING-READINESS.md'),bytes=await readFile(file);
try{await writeFile(file,Buffer.concat([bytes,Buffer.from('corruption test')]));assert.throws(()=>execFileSync(process.execPath,['scripts/check-deployment.mjs'],{cwd:directory,stdio:'pipe'}));}finally{await writeFile(file,bytes);}
const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const env={...process.env};for(const key of Object.keys(env))if(/^(DB_|UPMS_|MANAGEMENT_|SESSION_SECRET$|PUBLIC_ORIGIN$|ALLOWED_HOSTS$|TRUSTED_PROXY_IPS$|TRUST_PROXY$|ForwardedHeaders_)/.test(key))delete env[key];
Object.assign(env,{NODE_ENV:'production',PORT:String(port),UPMS_HOSTING_PROFILE:'godaddy-preview-blocked',UPMS_DATABASE_PROFILE:'godaddy-managed',MANAGEMENT_ENABLED:'true',PUBLIC_ORIGIN:'https://'+previewHostname,MANAGEMENT_ORIGIN:'https://'+previewHostname,ALLOWED_HOSTS:previewHostname,TRUSTED_PROXY_IPS:'127.0.0.1'});
const child=spawn(process.execPath,[pkg.main],{cwd:directory,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',()=>{});
// Native HTTP preserves the explicit virtual Host; Node 22 fetch rewrites that header.
const hit=(path,method='GET',host=previewHostname)=>new Promise((resolve,reject)=>{
  const req=request({host:'127.0.0.1',port,path,method,headers:{Host:host,'X-Forwarded-Proto':'https'},timeout:5000},res=>{
    const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>{const body=Buffer.concat(chunks).toString('utf8');resolve({status:res.statusCode,headers:{get:key=>res.headers[key.toLowerCase()]??null},text:async()=>body,json:async()=>JSON.parse(body)});});
  });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('Local probe timeout')));req.end();
});
try{
  let ready=false;for(let n=0;n<80;n++){try{if((await hit('/healthz')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Packaged start did not become available');
  assert.equal((await hit('/')).status,303);const login=await hit('/management'),html=await login.text();assert.equal(login.status,200);assert.match(html,/Staff sign in/);assert.match(html,/<fieldset disabled>/);assert.doesNotMatch(html,/<script\b/);assert.equal(login.headers.get('set-cookie'),null);
  const css=html.match(/href="(\/management\/assets\/[^" ]+\.css)"/)[1];assert.equal((await hit(css)).status,200);
  for(const method of ['GET','POST','PUT','PATCH','DELETE'])assert.equal((await hit('/api/v1/management/session/login',method)).status,503);
  for(const path of ['/about','/products','/.env','/server/src/index.js','/GODADDY-PREVIEW-VARIABLES.txt'])assert.equal((await hit(path)).status,404);
  assert.equal((await hit('/management','GET','other.airoapp.ai')).status,400);
  assert.deepEqual(await(await hit('/healthz')).json(),{status:'blocked',code:'GODADDY_COMPATIBILITY_BLOCKED'});assert.match(logs,/"database":"blocked"/);
  await writeFile(output,JSON.stringify({node:process.version,sourceCommit:manifest.sourceCommit,archiveSha256:digest,manifestFiles:Object.keys(manifest.files).length,cleanProductionInstall:true,integrityCorruptionRejected:true,entryPointStarted:true,disabledLogin:true,apiMethodsBlocked:5,privatePublicPathsDenied:5,unknownHostDenied:true,databaseConnections:0,providerAccepted:false,passed:true},null,2)+'\n');
  console.log('GoDaddy diagnostic preview package checks passed; operational acceptance remains blocked.');
}finally{const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;}
