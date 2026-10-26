// Explicit localhost authentication service. Business routes and business SQL are denied.
import express from 'express';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createLoginDatabase,loginHttpAllowed} from '../src/development/login.js';
import {identityConfig} from '../src/identity/config.js';
import {managementRouter} from '../src/identity/router.js';
import {security} from '../src/middleware/security.js';
import {loadConfig} from '../src/config/index.js';
import {assertSupportedRuntime} from '../src/production/runtime.js';
import {safeError} from '../src/development/remote.js';
let db;
try{
  assertSupportedRuntime();
  const env={...parseEnv(await readFile('.env.remote-development.local','utf8')),...process.env};
  const management=identityConfig(env);
  if(!management?.remoteDevelopment)throw Error('Remote development configuration required');
  db=createLoginDatabase(env,{plaintext:process.argv.includes('--allow-plaintext-auth-only')});
  await db.raw('SELECT 1');
  const app=express();app.disable('x-powered-by');app.set('trust proxy',false);
  app.use(security(loadConfig({NODE_ENV:'development',ALLOWED_HOSTS:'127.0.0.1',INQUIRY_MODE:'Disabled'})));
  app.use((req,res,next)=>{
    if(req.method==='GET'&&req.path==='/healthz')return res.json({status:'ok',mode:'authentication-only',businessWrites:false});
    if(!loginHttpAllowed(req.method,req.path))return res.status(403).set('Cache-Control','no-store').json({error:{code:'REMOTE_AUTH_ONLY',message:'Only sign-in, sessions and password change are enabled.'}});
    next();
  });
  app.use(managementRouter(db,management));
  const server=app.listen(3000,'127.0.0.1',()=>console.log('Local authentication backend: 127.0.0.1:3000; business writes disabled.'));
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.on('error',async()=>{console.error(JSON.stringify({code:'LOCAL_LISTENER_FAILED'}));await db.destroy();process.exitCode=1;});
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await db.destroy();process.exitCode=0;}));
}catch(error){await db?.destroy();console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
