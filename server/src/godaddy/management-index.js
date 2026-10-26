// Persistent disabled-management server. No database, migrations or diagnostic imports.
import {access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createManagementDisabledPreview} from './preview.js';
import {assertSupportedRuntime} from '../production/runtime.js';

export function platformPort(value){
 if(!/^[1-9][0-9]{0,4}$/.test(value||'')||Number(value)>65535)throw Error('Invalid platform PORT');
 return Number(value);
}
export async function startManagementPreview(env=process.env){
 if(assertSupportedRuntime()!==22)throw Error('Node 22 required');
 const port=platformPort(env.PORT),app=createManagementDisabledPreview(env);
 await access(resolve('upms.client/dist/management/index.html'));
 const server=app.listen(port,'0.0.0.0');server.requestTimeout=35000;server.headersTimeout=10000;
 let stopping=false,forced;
 const stop=()=>{if(stopping)return;stopping=true;server.close();server.closeIdleConnections();forced=setTimeout(()=>server.closeAllConnections(),5000);forced.unref();};
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,stop);
 server.once('listening',()=>console.info(JSON.stringify({service:'upms-management-disabled-preview',event:'listening',node:process.versions.node,port,database:'unconnected',operational:false})));
 server.once('error',()=>{console.error('UPMS_MANAGEMENT_LISTENER_UNAVAILABLE');process.exitCode=1;});
 server.once('close',()=>{clearTimeout(forced);for(const signal of ['SIGTERM','SIGINT'])process.removeListener(signal,stop);console.info(JSON.stringify({service:'upms-management-disabled-preview',event:'stopped',operational:false}));});
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await startManagementPreview();}catch{console.error('UPMS_MANAGEMENT_PREVIEW_BLOCKED: verify Node 22, PORT, exact HTTPS origins, proxy peers and packaged build. No database connection attempted.');process.exitCode=1;}
}
