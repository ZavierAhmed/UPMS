import express from 'express';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadConfig} from '../config/index.js';
import {security} from '../middleware/security.js';
import {previewHostname,compatibilityBlockers,blocked} from './policy.js';

// Explicit non-operational preview. No database import, pool, cookie or administrator exists here.
export function createBlockedPreview(env=process.env){
  const origin='https://'+previewHostname;
  if(env.UPMS_HOSTING_PROFILE!=='godaddy-preview-blocked'||env.UPMS_DATABASE_PROFILE!=='godaddy-managed'||
    env.NODE_ENV!=='production'||env.PUBLIC_ORIGIN!==origin||env.MANAGEMENT_ORIGIN!==origin||
    env.ALLOWED_HOSTS!==previewHostname||env.MANAGEMENT_ENABLED!=='true'||
    env.MANAGEMENT_LOCAL_HTTP==='true'||env.UPMS_PRODUCTION_POSTING||env.UPMS_SIMPLE_V1_SYNTHETIC||
    env.DB_PASSWORD||env.DB_OWNER_PASSWORD||env.UPMS_ADMIN_PASSWORD||env.SESSION_SECRET)throw blocked();
  const config=loadConfig({...env,INQUIRY_MODE:'Disabled'});
  const app=express();app.disable('x-powered-by');app.disable('etag');app.set('trust proxy',false);
  app.use(security(config));
  app.use((req,res,next)=>{res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});next();});
  app.get('/',(req,res)=>res.redirect(303,'/management'));
  app.get('/healthz',(req,res)=>res.json({status:'blocked',code:'GODADDY_COMPATIBILITY_BLOCKED'}));
  app.use('/api/v1/management',(req,res)=>res.status(503).json({error:{code:'GODADDY_COMPATIBILITY_BLOCKED'}}));
  const root=resolve('upms.client/dist/management');
  app.use('/management/assets',express.static(resolve(root,'assets'),{index:false,dotfiles:'deny',fallthrough:false}));
  app.get('/management',async(req,res)=>{
    const html=(await readFile(resolve(root,'index.html'),'utf8')).replace('<html','<html data-upms-mode="simple-v1"')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
      .replace('<div id="root"></div>','<div id="root"><div class="management signed-out"><header class="login-brand"><a class="brand" href="/management"><span class="brand-mark">U</span><span>Unique Plastic<small>INDUSTRY · MANAGEMENT</small></span></a></header><main><section class="login"><p class="eyebrow">PRIVATE PREVIEW</p><h1>Staff sign in</h1><p role="status">Database compatibility review pending. Sign-in and all business operations are disabled.</p><fieldset disabled><label>Username<input autocomplete="off" /></label><label>Password<input type="password" autocomplete="off" /></label><button disabled>Sign in unavailable</button></fieldset><p>No company data is connected to this preview.</p></section></main></div></div>');
    res.type('html').send(html);
  });
  app.use((req,res)=>res.status(404).end());
  app.use((error,req,res,next)=>{res.status(error.status===404?404:503).json({error:{code:error.status===404?'NOT_FOUND':'PREVIEW_UNAVAILABLE'}});});
  app.locals.compatibilityBlockers=compatibilityBlockers;
  return app;
}
