import {request} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
import {access,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const cwd=resolve(process.argv[2]||'tmp/dcr-package-smoke');
for(const dependency of ['express','mysql2','knex','argon2'])await access(resolve(cwd,'node_modules',dependency,'package.json'));
for(const dependency of ['supertest','puppeteer-core','vite'])await assert.rejects(access(resolve(cwd,'node_modules',dependency,'package.json')));
const build=spawnSync(process.execPath,['scripts/check-deployment.mjs'],{cwd,windowsHide:true,encoding:'utf8'});assert.equal(build.status,0,build.stderr);
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const hostname='2idp3wfsef.preview.c35.airoapp.ai',origin='https://'+hostname;
const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,NODE_ENV:'production',PORT:String(port),UPMS_HOSTING_PROFILE:'godaddy-preview-blocked',UPMS_DATABASE_PROFILE:'godaddy-cpanel',MANAGEMENT_ENABLED:'true',PUBLIC_ORIGIN:origin,MANAGEMENT_ORIGIN:origin,ALLOWED_HOSTS:hostname,TRUSTED_PROXY_IPS:'127.0.0.1',INQUIRY_MODE:'Disabled'};
const child=spawn(process.execPath,['server/src/godaddy/index.js'],{cwd,env,windowsHide:true,stdio:'pipe'});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
try{
 const get=path=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,headers:{Host:hostname,'X-Forwarded-Proto':'https'}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,text:async()=>text,headers:{get:name=>res.headers[name.toLowerCase()]??null}}));});req.on('error',reject);req.end();});
 let ready=false;for(let n=0;n<40;n++){try{if((await get('/healthz')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,output);assert.ok(output.includes('"database":"blocked"'));const page=await get('/management'),html=await page.text();assert.equal(page.status,200);assert.ok(html.includes('<fieldset disabled>'));assert.ok(!/<script\b/i.test(html));assert.equal((await get('/api/v1/management/session/current')).status,503);assert.equal((await get('/about')).status,404);assert.equal(page.headers.get('set-cookie'),null);
 const unsafe=spawnSync(process.execPath,['server/src/godaddy/index.js'],{cwd,env:{...env,PORT:String(port+1),DB_PASSWORD:'synthetic-injected-value'},windowsHide:true,encoding:'utf8',timeout:10000});assert.equal(unsafe.status,1);assert.ok(unsafe.stderr.includes('GODADDY_COMPATIBILITY_BLOCKED'));
 const receiptPath='artifacts/upms-godaddy-cpanel-release-receipt.json',receipt=JSON.parse(await readFile(receiptPath));receipt.productionInstallSmoke={passed:true,node:process.versions.node,productionDependenciesOnly:true,buildManifestVerified:true,disabledLogin:true,api503:true,injectedCredentialsRejected:true};await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.info(JSON.stringify(receipt.productionInstallSmoke));
}finally{child.kill();await new Promise(r=>child.once('exit',r));}
