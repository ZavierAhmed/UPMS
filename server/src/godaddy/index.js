import {createBlockedPreview} from './preview.js';
import {assertSupportedRuntime} from '../production/runtime.js';
// This ZIP cannot select the public website or an operational database through env changes.
try{
  assertSupportedRuntime();
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
  const app=createBlockedPreview();
  const server=app.listen(port,'0.0.0.0',()=>console.info(JSON.stringify({service:'upms-private-preview',node:process.versions.node,database:'blocked'})));
  server.requestTimeout=35000;server.headersTimeout=10000;
  server.on('error',()=>{console.error('Private preview listener unavailable.');process.exitCode=1;});
  let stopping=false;
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{if(stopping)return;stopping=true;server.close();server.closeIdleConnections();setTimeout(()=>server.closeAllConnections(),5000).unref();});
}catch{console.error('GODADDY_COMPATIBILITY_BLOCKED: verify the exact preview profile and proxy settings. No database connection attempted.');process.exitCode=1;}
