// One loopback listener owns setup, readiness and the real PHP preview throughout.
import {createServer} from 'node:http';
import {mkdir,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {employeePreview,bodyText,privateRoot} from './uath1-preview.mjs';
import {exists,atomicJson,provisionWorkspace} from './uath1-workspace.mjs';
import {protectPrivateDirectory} from './php-7-5-private-directory.mjs';
export async function startEmployeeLauncher({port=5180,bindingPath=resolve(privateRoot,'uath1-owner-binding.json'),directory=resolve(privateRoot,'uath1-owner-setup'),afterStage=()=>{}}={}){
 await mkdir(directory,{recursive:true});await protectPrivateDirectory(directory);
 const origin='http://127.0.0.1:'+port,target=origin+'/management',csrf=randomBytes(32).toString('hex'),nonce=randomBytes(24).toString('base64');let state='STARTING',stage='binding',errorCode=null,preview=null;
 const diagnostics=resolve(directory,'startup-events.jsonl');
 const event=async(type,extra={})=>appendFile(diagnostics,JSON.stringify({utc:new Date().toISOString(),type,stage,...extra})+'\n');
 const fail=async error=>{state='FAILED';preview=null;errorCode=/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'STARTUP_FAILED';await event('failure',{code:errorCode,helperCodes:error.diagnosticCodes||[]});};
 const shell=(title,body,script='')=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style nonce="${nonce}">body{font:17px system-ui;background:#f7f3eb;color:#252a30;max-width:650px;margin:8vh auto;padding:24px}main{background:white;padding:32px;border-radius:16px}input,button{box-sizing:border-box;width:100%;font:inherit;padding:14px;margin:12px 0}button{background:#f98218;border:0;border-radius:8px;cursor:pointer}a{color:#9c4400}code{overflow-wrap:anywhere}</style></head><body><main><h1>${title}</h1>${body}</main>${script?`<script nonce="${nonce}">${script}</script>`:''}</body></html>`;
 const form=(message='')=>shell('UPMS latest workspace',`<p>Employee Production Labor &amp; Hafta, in a separate isolated workspace. Existing UAT records and administrators remain unchanged.</p><p role="alert">${message}</p><form method="post" action="${origin}/setup"><input type="hidden" name="token" value="${csrf}"><label>New synthetic php-admin password<input type="password" name="password" minlength="14" maxlength="128" required autocomplete="new-password"></label><button>Start updated UPMS</button></form><p>Use 14–128 characters. On a retry after administrator creation, use the password chosen on your first attempt. Passwords are never written to files or logs.</p>`);
 const waiting=()=>shell('Starting updated UPMS','<p id="status" role="status">Preparing and verifying the isolated workspace…</p><p id="failure"></p><a id="retry" href="/setup" hidden>Retry safely</a>',`setInterval(async()=>{try{const r=await fetch('/setup/status',{cache:'no-store'});const s=await r.json();if(s.state==='READY'){const check=await fetch('${target}',{cache:'no-store'});if(check.status===200&&check.headers.get('X-UPMS-Workspace')==='employee-hafta'){location.replace('${target}');}}else if(s.state==='FAILED'){document.getElementById('status').textContent='Startup failed at '+s.stage+'.';document.getElementById('failure').textContent=s.error+' — diagnostic evidence retained in the protected workspace. Existing records were not reset.';document.getElementById('retry').hidden=false;}else document.getElementById('status').textContent='Preparing workspace: '+s.stage; }catch{document.getElementById('status').textContent='Startup connection interrupted. Reload to inspect status; do not reset the database.';}},1000);`);
 let server;
 async function activate(){stage='binding-readiness';const candidate=await employeePreview(bindingPath,{port});preview=candidate.handler;stage='http-readiness';const r=await fetch(target,{redirect:'manual'});if(r.status!==200||r.headers.get('X-UPMS-Workspace')!=='employee-hafta')throw Error('DASHBOARD_HTTP_READINESS_FAILED');state='READY';stage='ready';errorCode=null;await event('ready',{dashboardStatus:r.status});}
 server=createServer(async(req,res)=>{try{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Content-Type-Options','nosniff');
  const host=req.headers.host;if(!['127.0.0.1:'+port,'localhost:'+port].includes(host)){res.writeHead(403);return res.end('Local Host rejected.');}
  const path=new URL(req.url,origin).pathname;
  if(host==='localhost:'+port&&['GET','HEAD'].includes(req.method)){res.writeHead(303,{Location:origin+req.url});return res.end();}
  if(path==='/setup/status'&&req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({state,stage,error:errorCode,url:state==='READY'?target:null}));}
  if(path==='/setup'&&req.method==='POST'){
   if(host!=='127.0.0.1:'+port||req.headers.origin!==origin){res.writeHead(403);return res.end('Local Origin rejected.');}
   if(!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded')){res.writeHead(415);return res.end();}
   let raw=await bodyText(req,8192);const f=new URLSearchParams(raw);raw='';const token=f.get('token')||'';
   if(Buffer.byteLength(token)!==Buffer.byteLength(csrf)||!timingSafeEqual(Buffer.from(token),Buffer.from(csrf))){res.writeHead(403);return res.end('Setup CSRF rejected.');}
   let password=f.get('password')||'';f.delete('password');if(password.length<14||password.length>128){res.writeHead(400,{'Content-Type':'text/html;charset=utf-8'});return res.end(form('Use a password of 14–128 characters. No database was initialized.'));}
   if(['RUNNING','STARTING','READY'].includes(state)){res.writeHead(409);return res.end('Setup already running or complete; reload the workspace.');}
   state='RUNNING';errorCode=null;stage='preflight';await event('setup-request');res.writeHead(202,{'Content-Type':'text/html;charset=utf-8'});res.end(waiting());
   void (async()=>{try{if(!await exists(bindingPath)){const binding=await provisionWorkspace({directory,password,onStage:s=>{stage=s;},afterStage});stage='binding-publication';if(await exists(bindingPath))throw Error('BINDING_EXISTS_REVIEW_REQUIRED');await atomicJson(bindingPath,binding);}password='';await activate();}catch(e){password='';await fail(e);}})();return;
  }
  if(preview&&['/management','/api/v1/management/'].some(p=>path.startsWith(p))){res.setHeader('X-UPMS-Workspace','employee-hafta');return await preview(req,res);}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if(!['/','/management','/setup'].includes(path)){res.writeHead(404);return res.end();}
  if(state==='READY'){res.writeHead(303,{Location:target});return res.end();}
  res.setHeader('Content-Security-Policy',`default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`);
  res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(['WAITING','FAILED'].includes(state)?form(state==='FAILED'?'Previous startup failed at '+stage+' ('+errorCode+'). Protected diagnostic evidence is retained; retry reuses its checkpoint and never resets existing data.':''):waiting());
 }catch(e){await event('request-failed',{code:e.message==='REQUEST_TOO_LARGE'?e.message:'REQUEST_FAILED'});if(!res.headersSent)res.writeHead(503);res.end('Local request failed. Evidence retained; no reset performed.');}});
 await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
 if(await exists(bindingPath)){try{await activate();}catch(e){await fail(e);}}else{state='WAITING';stage='awaiting-password';await event('waiting');}
 return {server,status:()=>({state,stage,error:errorCode}),bindingPath,directory};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{const app=await startEmployeeLauncher();console.log(JSON.stringify({listener:'http://127.0.0.1:5180/management',...app.status()}));}catch(e){console.error(e.code==='EADDRINUSE'?'PORT_5180_IN_USE: existing server preserved; identify its process before replacement.':'LOCAL_STARTUP_FAILED: inspect protected startup evidence.');process.exitCode=1;}}
