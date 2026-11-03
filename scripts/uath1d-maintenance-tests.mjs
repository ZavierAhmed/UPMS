import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {provisionClassifiedWorkspace} from './uath1c-workspace.mjs';
import {startEmployeeLauncher} from './uath1-launcher.mjs';
import {applyOwnerUpgrade} from './uath1d-upgrade.mjs';

await assert.rejects(()=>applyOwnerUpgrade(),/SEPARATE_EXPLICIT_OWNER_AUTHORIZATION_REQUIRED/);
const fixture=await provisionClassifiedWorkspace({publishLatest:false}),{binding,bindingPath}=fixture;
const app=await startEmployeeLauncher({port:5194,bindingPath,directory:binding.directory});let cookie='',csrf='';
const origin='http://127.0.0.1:5194';
async function call(path,method='GET',body,headers={}) {
 const response=await fetch(origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json','x-csrf-token':csrf,'idempotency-key':randomUUID()}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const data=await response.json();if(data.csrfToken)csrf=data.csrfToken;return {status:response.status,data};
}
const marker=resolve(binding.directory,'uath1d-maintenance.json');
try {
 await call('/api/v1/management/session/csrf');assert.equal((await call('/api/v1/management/session/login','POST',{username:'php-admin',password:fixture.password})).status,200);fixture.password='';
 const directory=()=>call('/api/v1/management/simple-v1/expense-directory');const before=(await directory()).data;
 assert.equal((await call('/api/v1/management/simple-v1/expense-masters/employees','POST',{name:'Must not be created'},{'x-csrf-token':'invalid'})).status,403);
 const ready=(await call('/setup/status')).data;assert.equal(ready.readinessVerified,true);assert.equal(ready.inFlightWrites,0);
 for(const status of ['INSTALLING','FAILED','VERIFYING']) {
  await writeFile(marker,JSON.stringify({status}));const state=(await call('/setup/status')).data;assert.equal(state.state,'FAILED');assert.equal(state.maintenance.active,true);assert.equal(state.inFlightWrites,0);
  const result=await call('/api/v1/management/simple-v1/expense-masters/employees','POST',{name:'Must not be created'});assert.equal(result.status,503);assert.equal(result.data.error.code,'OWNER_UAT_UPGRADE_MAINTENANCE');
  assert.equal((await fetch(origin+'/api/v1/management/session/login',{method:'POST',headers:{Origin:'http://attacker.test','Content-Type':'application/json'},body:'{}'})).status,403);
 }
 await writeFile(marker,'{invalid');assert.equal((await call('/setup/status')).data.maintenance.code,'OWNER_UAT_MAINTENANCE_EVIDENCE_INVALID');
 await writeFile(marker,JSON.stringify({status:'COMPLETE'}));assert.equal((await call('/setup/status')).data.readinessVerified,true);assert.deepEqual((await directory()).data,before);
 await mkdir('docs/uat-h1d/evidence',{recursive:true});await writeFile('docs/uat-h1d/evidence/maintenance-tests.json',JSON.stringify({passed:true,syntheticOnly:true,checks:['Missing owner authorization rejected before connecting','Actual native readiness and in-flight write metrics','INSTALLING/FAILED/VERIFYING block authenticated writes','Wrong origin still rejected','Malformed maintenance evidence fails closed','Completed marker restores verified native readiness','No employee created during blocked operations'],ownerDatabaseModified:false},null,2));
 console.log(JSON.stringify({passed:true,checks:7,ownerDatabaseModified:false}));
}finally{fixture.password='';app.server.closeAllConnections();await new Promise(r=>app.server.close(r));}
