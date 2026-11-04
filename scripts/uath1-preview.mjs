// Strict local PHP adapter, shared with setup to avoid a port handoff race.
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {workspaceMaintenance} from './uath1d-maintenance.mjs';
export const privateRoot=resolve('tmp/php-runtime');
export async function privatePath(path){const actual=await realpath(path);if(!actual.startsWith(privateRoot+sep))throw Error('PRIVATE_LOCAL_PATH_REQUIRED');return actual;}
export function phpBridge(envPath,input){return new Promise((done,fail)=>{
 const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/http-bridge.php'],{windowsHide:true,env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('UPMS_'))),UPMS_PRODUCTION_PROFILE:'',UPMS_PHP2_ENV:envPath},stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',()=>{});p.on('error',()=>fail(Error('PHP_START_FAILED')));const timer=setTimeout(()=>{p.kill();fail(Error('PHP_TIMEOUT'));},30000);p.on('close',code=>{clearTimeout(timer);if(code)return fail(Error('PHP_FAILED'));try{done(JSON.parse(out));}catch{fail(Error('PHP_RESPONSE_FAILED'));}});p.stdin.on('error',()=>{});p.stdin.end(JSON.stringify(input));
});}
export async function bodyText(req,limit=12288){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>limit)throw Error('REQUEST_TOO_LARGE');chunks.push(b);}return Buffer.concat(chunks).toString('utf8');}
export async function employeePreview(bindingPath,{port=5180,cookieName='upms_employee_uat'}={}){
 await verifyUatEngine();const setup=JSON.parse(await readFile(await privatePath(bindingPath),'utf8')),original=JSON.parse(await readFile(resolve(privateRoot,'owner-uat-binding.json'),'utf8'));
 if(setup.schema===original.schema||!/^upms_test_php_money_[0-9]+$/.test(setup.schema)||!/^money_rt_[0-9]+$/.test(setup.runtime))throw Error('DISTINCT_ISOLATED_EMPLOYEE_UAT_REQUIRED');
 const directory=await privatePath(setup.directory),fixture=JSON.parse(await readFile(resolve(directory,'browser.json'),'utf8')),envPath=await privatePath(fixture.envPath),env=await readFile(envPath,'utf8');
 for(const [k,v] of Object.entries({UPMS_DB_HOST:'127.0.0.1',UPMS_DB_PORT:'3330',UPMS_DB_DATABASE:setup.schema,UPMS_DB_USERNAME:setup.runtime,UPMS_EMPLOYEE_HAFTA_ENABLED:'true'}))if(!env.split(/\r?\n/).includes(k+'='+v))throw Error('EMPLOYEE_UAT_PROFILE_REJECTED');
 const ready=await phpBridge(envPath,{method:'GET',path:'/readyz'});if(ready.status!==200)throw Error('EMPLOYEE_UAT_NOT_READY');
 const root=resolve('upms.client/dist/management');await readFile(resolve(root,'index.html'));
 let inFlightWrites=0;
 return {setup,envPath,directory,metrics:()=>({inFlightWrites}),checkReadiness:async()=>{const maintenance=await workspaceMaintenance(directory);if(maintenance)return {ready:false,maintenance};const r=await phpBridge(envPath,{method:'GET',path:'/readyz'});return {ready:r.status===200};},handler:async(req,res)=>{
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403);return res.end('Local Host rejected.');}
  const u=new URL(req.url,'http://127.0.0.1:'+port);res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','same-origin');
  if(u.pathname.startsWith('/api/v1/management/')){
   const unsafe=!['GET','HEAD'].includes(req.method);if(unsafe&&req.headers.origin!=='http://'+req.headers.host){res.writeHead(403);return res.end('Local Origin rejected.');}
   if(unsafe&&await workspaceMaintenance(directory)){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:{code:'OWNER_UAT_UPGRADE_MAINTENANCE',message:'Owner UAT upgrade is in maintenance. No entry was posted. Existing records and diagnostic evidence are preserved.'}}));}
   if(unsafe)inFlightWrites++;
   try {
   const body=await bodyText(req),cookies={};for(const part of (req.headers.cookie||'').split(';')){const [name,...value]=part.trim().split('=');if(name===cookieName)cookies['__Host-upms-php']=decodeURIComponent(value.join('='));}
   const r=await phpBridge(envPath,{method:req.method,path:u.pathname+u.search,cookies,headers:unsafe?{origin:'https://app.unique-plastic.test','x-csrf-token':req.headers['x-csrf-token']||'','idempotency-key':req.headers['idempotency-key']||''}:{},raw:body||null});
   if(Object.hasOwn(r.cookies||{},'__Host-upms-php')){const token=r.cookies['__Host-upms-php'];res.setHeader('Set-Cookie',cookieName+'='+encodeURIComponent(token||'')+'; Path=/; HttpOnly; SameSite=Strict'+(!token?'; Max-Age=0':''));}
   res.writeHead(r.status,{'Content-Type':'application/json'});return res.end(r.raw);
   }finally{if(unsafe)inFlightWrites--;}
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if(u.pathname!=='/management'&&!u.pathname.startsWith('/management/')){res.writeHead(404);return res.end();}
  const file=u.pathname.startsWith('/management/assets/')?resolve(root,u.pathname.slice('/management/'.length)):resolve(root,'index.html');if(!file.startsWith(root+sep)){res.writeHead(403);return res.end();}
  let data=await readFile(file);const ext=extname(file);if(ext==='.html')data=Buffer.from(data.toString().replace('<html','<html data-upms-mode="simple-v1"'));
  res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[ext]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);
 }};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const {handler}=await employeePreview(resolve(privateRoot,'uath1-owner-binding.json'));createServer((req,res)=>handler(req,res).catch(()=>{if(!res.headersSent)res.writeHead(503);res.end('Isolated Employee UAT unavailable; no reset performed.');})).listen(5180,'127.0.0.1',()=>console.log('Employee Hafta preview listening; http://127.0.0.1:5180/management'));}
