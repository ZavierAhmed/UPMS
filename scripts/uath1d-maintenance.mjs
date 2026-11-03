import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Missing marker means normal operation. Unreadable/invalid markers fail closed.
export async function workspaceMaintenance(directory) {
 try {
  const marker=JSON.parse(await readFile(resolve(directory,'uath1d-maintenance.json'),'utf8'));
  if(marker.status==='COMPLETE')return null;
  return {active:true,stage:['INSTALLING','FAILED','VERIFYING'].includes(marker.status)?marker.status:'FAILED',code:'OWNER_UAT_UPGRADE_MAINTENANCE'};
 }catch(error){if(error.code==='ENOENT')return null;return {active:true,stage:'FAILED',code:'OWNER_UAT_MAINTENANCE_EVIDENCE_INVALID'};}
}
