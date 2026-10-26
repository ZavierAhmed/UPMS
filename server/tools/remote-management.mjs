import express from 'express';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createManagementDatabase,managementHttpAllowed} from '../src/development/login.js';
import {activateRemoteManagement} from '../src/development/activation.js';
import {identityConfig} from '../src/identity/config.js';
import {managementRouter} from '../src/identity/router.js';
import {security} from '../src/middleware/security.js';
import {loadConfig} from '../src/config/index.js';
import {assertSupportedRuntime} from '../src/production/runtime.js';
import {safeError,failure} from '../src/development/remote.js';
let db;
try{
  assertSupportedRuntime();
  const env={...parseEnv(await readFile('.env.remote-development.local','utf8')),...process.env};
  const management=identityConfig(env),action=process.argv[2];
  if(!management?.remoteDevelopment||!['start','activate'].includes(action))throw failure('REMOTE_TARGET_REJECTED');
  db=createManagementDatabase(env,{plaintext:process.argv.includes('--allow-plaintext-management')});
  await db.raw('SELECT 1');
  if(action==='activate'){
    const target=process.argv.find(a=>a.startsWith('--confirm-target='))?.slice('--confirm-target='.length);
    console.log(JSON.stringify(await activateRemoteManagement(db,env,{target,operatorId:'1'})));
    await db.destroy();
  }else{
    const control=await db('v1_control').where({id:1}).first();
    if(control?.state!=='READY'||String(control.operator_id)!=='1')throw failure('REMOTE_SCHEMA_REJECTED');
    const app=express();app.disable('x-powered-by');app.set('trust proxy',false);
    app.use(security(loadConfig({NODE_ENV:'development',ALLOWED_HOSTS:'127.0.0.1',INQUIRY_MODE:'Disabled'})));
    app.use((req,res,next)=>{
      if(req.method==='GET'&&req.path==='/healthz')return res.json({status:'ok',mode:'remote-simple-v1-development',businessWrites:true});
      const asset=['GET','HEAD'].includes(req.method)&&/^\/management(?:\/|$)/.test(req.path);
      if(!asset&&!managementHttpAllowed(req.method,req.path))return res.status(403).set('Cache-Control','no-store').json({error:{code:'SIMPLE_V1_ONLY'}});
      next();
    });
    app.use(managementRouter(db,management));
    const server=app.listen(3000,'127.0.0.1',()=>console.log('UPMS Simple V1 remote development: 127.0.0.1:3000; business features enabled.'));
    server.requestTimeout=15000;server.headersTimeout=10000;
    server.on('error',async()=>{console.error(JSON.stringify({code:'LOCAL_LISTENER_FAILED'}));await db.destroy();process.exitCode=1;});
    for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await db.destroy();process.exitCode=0;}));
  }
}catch(error){await db?.destroy();console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
