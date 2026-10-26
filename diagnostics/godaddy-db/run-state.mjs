// Private filesystem marker only: no database writes, credentials or observations.
import {lstat,realpath,open} from 'node:fs/promises';
import {isAbsolute,resolve,relative,sep,join} from 'node:path';
import {createHash} from 'node:crypto';
const stop=code=>{const e=new Error(code);e.diagnosticCode=code;throw e;};
export async function claimRun({directory,root,appId,runId,release}){
 let file;
 try{
  if(!directory||!root||!isAbsolute(directory))stop('PRIVATE_STATE_UNSAFE');
  const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink()||process.platform!=='win32'&&(info.mode&0o077)!==0)stop('PRIVATE_STATE_UNSAFE');
  const state=await realpath(directory),application=await realpath(root),inside=relative(application,state);
  if(inside===''||!inside.startsWith('..'+sep)&&inside!=='..'&&!isAbsolute(inside)||/(?:^|[\\/])(?:public|assets|static|dist|_site|wwwroot|www|htdocs|public_html)(?:[\\/]|$)/i.test(state))stop('PRIVATE_STATE_UNSAFE');
  if(resolve(directory)!==state)stop('PRIVATE_STATE_UNSAFE');
  const key=createHash('sha256').update(JSON.stringify([appId,runId,release])).digest('hex');
  file=await open(join(state,'upms-readonly-'+key+'.consumed'),'wx',0o600);
  await file.writeFile('READ_ONLY_RUN_CONSUMED\n');await file.sync();
 }catch(error){if(error.diagnosticCode)throw error;if(error.code==='EEXIST')stop('DIAGNOSTIC_RUN_ALREADY_CONSUMED');stop('PRIVATE_STATE_UNAVAILABLE');}
 finally{await file?.close();}
}
