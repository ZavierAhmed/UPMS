import {createPublicApp} from './public-app.js';
import {assertSupportedRuntime} from './production/runtime.js';
const stopping=new AbortController();
try{
 assertSupportedRuntime();
 if(process.env.MANAGEMENT_ENABLED==='true'||process.env.UPMS_DATABASE_PROFILE||process.env.UPMS_PRODUCTION_PROFILE)throw Error('Public website cannot select a management database profile');
 const port=Number(process.env.PORT||3000);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid public listener port');
 const host=process.env.LISTEN_HOST||'127.0.0.1';
 if(!['127.0.0.1','::1','0.0.0.0'].includes(host))throw Error('Invalid public listener address');
 const app=createPublicApp({shutdownSignal:stopping.signal,log:event=>console.info(JSON.stringify(event))});
 const server=app.listen(port,host,()=>console.info('UPMS public website listening'));
 server.requestTimeout=35000;server.headersTimeout=10000;
 server.on('error',()=>{console.error('Public website listener failed');process.exitCode=1;});
 let closing=false;
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
  if(closing)return;closing=true;stopping.abort();
  server.close(()=>{process.exitCode=0;});server.closeIdleConnections();
  setTimeout(()=>server.closeAllConnections(),5000).unref();
 });
}catch{
 console.error('Public website startup rejected. Verify runtime, public host/origin, disabled management and release files.');process.exitCode=1;
}
