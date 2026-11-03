// Two-phase owner-UAT-only operation. Never infer authorization from a passed preflight.
import {readFile,writeFile,open,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ownerWorkspace,ownerHelper,h1dRoot} from './uath1d-workspace.mjs';
import {atomicJson} from './uath1-workspace.mjs';
import {phpBridge} from './uath1-preview.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex');

export async function applyOwnerUpgrade({ownerAuthorized=false,preflightSha256,approvalReference}={}) {
 if(ownerAuthorized!==true||!/^[a-f0-9]{64}$/.test(preflightSha256||'')||typeof approvalReference!=='string'||approvalReference.trim().length<10)throw Error('H1D_SEPARATE_EXPLICIT_OWNER_AUTHORIZATION_REQUIRED');
 const workspace=await ownerWorkspace(),path=resolve(h1dRoot,'preflight.json'),bytes=await readFile(path),proof=JSON.parse(bytes);
 if(sha(bytes)!==preflightSha256||proof.passed!==true||proof.sourceDatabase!==workspace.binding.schema||proof.ownerDatabaseMigrated!==false)throw Error('H1D_TARGET_BOUND_PREFLIGHT_REQUIRED');
 if(sha(await readFile(workspace.bindingPath))!==proof.bindingFileSha256||sha(await readFile(workspace.envPath))!==proof.environmentFileSha256)throw Error('H1D_FIXED_BINDING_OR_CONFIGURATION_CHANGED');
 if(sha(await readFile(proof.archive))!==proof.archiveSha256)throw Error('H1D_BACKUP_CHECKSUM_REQUIRED');
 await readFile(resolve(h1dRoot,'environment-before.dpapi'));
 const lockPath=resolve(h1dRoot,'upgrade.lock'),lock=await open(lockPath,'wx'),markerPath=resolve(workspace.directory,'uath1d-maintenance.json');let markerWritten=false,completed=false;
 try {
  // Never silently retry an interrupted DDL operation.
  try{const old=JSON.parse(await readFile(markerPath,'utf8'));if(old.status!=='COMPLETE')throw Error('H1D_INTERRUPTED_MIGRATION_REVIEW_REQUIRED');throw Error('H1D_ALREADY_UPGRADED_VERIFY_ONLY');}catch(e){if(e.code!=='ENOENT')throw e;}
  const ready=await fetch('http://127.0.0.1:5180/setup/status').then(r=>r.json());
  if(ready.state!=='READY'||ready.readinessVerified!==true||typeof ready.inFlightWrites!=='number')throw Error('H1D_CURRENT_COMPATIBLE_OWNER_LISTENER_REQUIRED');
  await atomicJson(markerPath,{status:'INSTALLING',preflightSha256,approvalReference,startedUtc:new Date().toISOString()});markerWritten=true;
  for(let round=0;round<2;round++) {
   const status=await fetch('http://127.0.0.1:5180/setup/status').then(r=>r.json());
   if(status.maintenance?.active!==true||status.inFlightWrites!==0)throw Error('H1D_IN_FLIGHT_WRITES_MAINTENANCE_REQUIRED');
   await new Promise(r=>setTimeout(r,150));
  }
  const installed=await ownerHelper('upgrade',{ownerAuthorized:true,approvalReference,preflightSha256});
  const guardPath=resolve(workspace.directory,'h1d-extension-guards.json');await atomicJson(guardPath,installed.guards);
  let env=await readFile(workspace.envPath,'utf8');
  for(const [key,value] of Object.entries({UPMS_LABOR_CLASSIFICATION_ENABLED:'true',UPMS_LABOR_EXTENSION_GUARD_EVIDENCE:'"'+guardPath.replaceAll('\\','/')+'"'})) {
   const matches=env.match(new RegExp('^'+key+'=.*$','gm'))||[];if(matches.length>1)throw Error('H1D_DUPLICATE_FEATURE_CONFIG_REJECTED');
   env=matches.length?env.replace(new RegExp('^'+key+'=.*$','m'),key+'='+value):env.replace(/\s*$/,'\n')+key+'='+value+'\n';
  }
  await atomicJson(markerPath,{status:'VERIFYING',preflightSha256,approvalReference});
  // Exact existing path and credentials remain; only these two UAT flags change.
  const next=workspace.envPath+'.h1d-next';await writeFile(next,env);const {rename}=await import('node:fs/promises');await rename(next,workspace.envPath);
  const native=await ownerHelper('inspect');
  const readyPhp=await phpBridge(workspace.envPath,{method:'GET',path:'/readyz'});
  if(native.tableCount!==38||native.guards.totalGuards!==103||!native.reconciliation.matched||readyPhp.status!==200)throw Error('H1D_POST_UPGRADE_READINESS_FAILED');
  await atomicJson(markerPath,{status:'COMPLETE',preflightSha256,approvalReference,completedUtc:new Date().toISOString()});
  const live=await fetch('http://127.0.0.1:5180/setup/status').then(r=>r.json());if(live.state!=='READY'||live.readinessVerified!==true)throw Error('H1D_LIVE_LISTENER_NOT_READY');
  const result={...installed,after:native,live,ownerDatabaseMigrated:true,originalBindingChanged:false,credentialsReset:false,openingOrExpenseAutomaticallyPosted:false,completedUtc:new Date().toISOString()};
  await atomicJson(resolve(h1dRoot,'upgrade-result.json'),result);await atomicJson('docs/uat-h1d/evidence/upgrade-result.json',result);completed=true;return result;
 }catch(error){if(markerWritten)await atomicJson(markerPath,{status:'FAILED',preflightSha256,approvalReference,code:/^[A-Z_]+$/.test(error.message)?error.message:'H1D_UPGRADE_FAILED_REVIEW_REQUIRED',failedUtc:new Date().toISOString()});throw error;}
 finally {await lock.close();if(completed||!markerWritten)await unlink(lockPath);}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const value=name=>process.argv.find(s=>s.startsWith('--'+name+'='))?.slice(name.length+3);
 const result=await applyOwnerUpgrade({ownerAuthorized:process.argv.includes('--owner-authorized'),preflightSha256:value('preflight-sha256'),approvalReference:value('approval-reference')});
 console.log(JSON.stringify({passed:result.passed,database:result.database,tables:result.after.tableCount,guards:result.after.guards.totalGuards,originalRowsPreserved:result.preservedOriginalRows,manualOwnerAcceptanceRequired:true}));
}
