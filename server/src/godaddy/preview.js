import express from 'express';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadConfig} from '../config/index.js';
import {security} from '../middleware/security.js';
import {previewHostname,compatibilityBlockers,blocked} from './policy.js';

// Explicit non-operational preview. No database import, pool, cookie or administrator exists here.
export function createBlockedPreview(env=process.env){
  const origin='https://'+previewHostname;
  if(env.UPMS_HOSTING_PROFILE!=='godaddy-preview-blocked'||!['godaddy-managed','godaddy-cpanel'].includes(env.UPMS_DATABASE_PROFILE)||
    env.NODE_ENV!=='production'||env.PUBLIC_ORIGIN!==origin||env.MANAGEMENT_ORIGIN!==origin||
    env.ALLOWED_HOSTS!==previewHostname||env.MANAGEMENT_ENABLED!=='true'||
    env.MANAGEMENT_LOCAL_HTTP==='true'||env.UPMS_PRODUCTION_POSTING||env.UPMS_SIMPLE_V1_SYNTHETIC||
    env.DB_PASSWORD||env.DB_OWNER_PASSWORD||env.UPMS_ADMIN_PASSWORD||env.SESSION_SECRET)throw blocked();
  return disabledApplication(env);
}

// Separate fixed entry point: provider-injected DB values are ignored, never used.
export function createManagementDisabledPreview(env=process.env){
  const origins=['https://'+previewHostname,'https://app.unique-plastic.com'];
  if(env.UPMS_HOSTING_PROFILE!=='godaddy-management-disabled'||env.UPMS_DATABASE_PROFILE!=='godaddy-managed'||env.NODE_ENV!=='production'||!origins.includes(env.MANAGEMENT_ORIGIN)||env.PUBLIC_ORIGIN!==env.MANAGEMENT_ORIGIN||env.ALLOWED_HOSTS!==new URL(env.MANAGEMENT_ORIGIN).hostname||env.MANAGEMENT_ENABLED!=='true'||env.MANAGEMENT_LOCAL_HTTP==='true')throw blocked();
  if(Object.keys(env).some(k=>k.startsWith('UPMS_PRODUCTION_')||k.startsWith('UPMS_DIAGNOSTIC_')||['UPMS_SIMPLE_V1','UPMS_SIMPLE_V1_SYNTHETIC','UPMS_OPERATION_APPROVAL','DB_OWNER_PASSWORD','UPMS_ADMIN_PASSWORD','SESSION_SECRET'].includes(k)))throw blocked();
  return disabledApplication(env,true);
}

function disabledApplication(env,managementOnly=false){
  const config=loadConfig({...env,INQUIRY_MODE:'Disabled'});
  const app=express();app.disable('x-powered-by');app.disable('etag');app.set('trust proxy',false);
  app.use(security(config));
  app.use((req,res,next)=>{res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});next();});
  app.get('/',(req,res)=>res.redirect(303,'/management'));
  app.get('/healthz',(req,res)=>res.json({status:'blocked',code:'GODADDY_COMPATIBILITY_BLOCKED',...(managementOnly?{mode:'disabled-management-preview',operational:false,database:'unconnected'}:{})}));
  app.use('/api/v1/management',(req,res)=>res.status(503).json({error:{code:'GODADDY_COMPATIBILITY_BLOCKED'}}));
  const root=resolve('upms.client/dist/management');
  app.use('/management/assets',express.static(resolve(root,'assets'),{index:false,dotfiles:'deny',fallthrough:false}));
  const page=async(req,res)=>{
    const html=(await readFile(resolve(root,'index.html'),'utf8')).replace('<html','<html data-upms-mode="simple-v1"')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
      .replace('<div id="root"></div>','<div id="root"><div class="management signed-out"><header class="login-brand"><a class="brand" href="/management"><span class="brand-mark">U</span><span>Unique Plastic<small>INDUSTRY · MANAGEMENT</small></span></a></header><main><section class="login"><p class="eyebrow">PRIVATE PREVIEW</p><h1>Staff sign in</h1><p role="status">Database compatibility review pending. Sign-in and all business operations are disabled.</p><fieldset disabled><label>Username<input autocomplete="off" /></label><label>Password<input type="password" autocomplete="off" /></label><button disabled>Sign in unavailable</button></fieldset><p>No company data is connected to this preview.</p></section></main></div></div>');
    res.type('html').send(html);
  };
  app.get('/management',page);
  if(managementOnly)app.get(/^\/management\/(?:items|clients|vendors|stock-in|challans|challan-returns|client-payments|vendor-payments|ledgers|reports|company-transactions|expenses|settings|documents)(?:\/(?:new|[1-9][0-9]*)(?:\/edit)?)?\/?$/,page);
  app.use((req,res)=>res.status(404).end());
  app.use((error,req,res,next)=>{res.status(error.status===404?404:503).json({error:{code:error.status===404?'NOT_FOUND':'PREVIEW_UNAVAILABLE'}});});
  app.locals.compatibilityBlockers=compatibilityBlockers;
  return app;
}
