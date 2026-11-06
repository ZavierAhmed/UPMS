// Public website only. No imports of Node identity, database or financial modules.
import express from 'express';
import compression from 'compression';
import {loadConfig} from './config/index.js';
import {security} from './middleware/security.js';
import {createDelivery} from './inquiries/delivery.js';
import {createSubmissions} from './inquiries/submissions.js';
import {inquiryApi} from './inquiries/api.js';
import {website} from './website/index.js';

export function createPublicApp({config=loadConfig(),delivery=createDelivery(config),log=()=>{},now,shutdownSignal}={}){
 const app=express();app.disable('x-powered-by');app.disable('etag');app.set('trust proxy',false);
 app.use(security(config));
 app.use((req,res,next)=>{
  if(/^\/(?:management|admin)(?:\/|$)/i.test(req.path)||/^\/api\/v1\/management(?:\/|$)/i.test(req.path))return res.status(404).end();
  next();
 });
 app.get('/healthz',(req,res)=>res.set('Cache-Control','no-store').json({status:'ok',surface:'public-website',managementEnabled:false}));
 const deliver=config.mode==='Disabled'?async()=> 'Unavailable':delivery;
 app.use(inquiryApi(config,createSubmissions(config,deliver,{now,log,shutdownSignal}),now));
 app.use(compression({filter:(req,res)=>!/^\/api(?:\/|$)/i.test(req.path)&&compression.filter(req,res)}));
 app.use(website(config));
 app.use((error,req,res,next)=>{
  if(res.headersSent)return next(error);
  res.status(error.status===400?400:500).type('text').send('The request could not be completed.');
 });
 return app;
}
