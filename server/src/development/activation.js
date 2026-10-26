import {transaction} from '../identity/database.js';
import {identity} from '../identity/service.js';
import {failure,remoteTarget} from './remote.js';

export async function activateRemoteManagement(db,env,{target,operatorId}={}){
  remoteTarget(env);
  if(target!=='184.168.100.110:3306/upms'||operatorId!=='1'||!db.upmsRemoteDevelopment)throw failure('REMOTE_TARGET_REJECTED');
  return transaction(db,async trx=>{
    const user=await identity(trx,operatorId),control=await trx('v1_control').where({id:1}).forUpdate().first();
    if(!user.roles.includes('administrator')||Number(control?.entry_version)!==2||
       !['PENDING','READY'].includes(control?.state)||control.operator_id&&String(control.operator_id)!==operatorId)
      throw failure('REMOTE_SCHEMA_REJECTED');
    if(control.state==='READY'&&String(control.operator_id)===operatorId)return {activated:true,alreadyActive:true,operatorId};
    await trx('v1_control').where({id:1}).update({operator_id:operatorId,state:'READY',
      cutover_evidence:'Owner explicitly approved full Simple V1 remote-development use over plaintext. No business records seeded.'});
    await trx('v1_audit').insert({actor_id:operatorId,action:'remote-development.activated',reference:'owner-approved',
      reason:'Enable existing Simple V1 features at the owner request; no opening balances or sample business records created.',created_at:new Date()});
    return {activated:true,alreadyActive:false,operatorId,passwordChangeRequired:Boolean(user.passwordChangeRequired)};
  });
}
