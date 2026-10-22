import { createHash } from 'node:crypto';
import { guard,query } from '../identity/database.js';
import { authorize } from '../identity/service.js';
import { IdentityError } from '../identity/passwords.js';
export function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  if(value===undefined||typeof value==='number'&&!Number.isSafeInteger(value))throw new IdentityError(400,'INVALID_EXACT_VALUE');
  return JSON.stringify(value);
}
export const payloadHash=value=>createHash('sha256').update(canonical(value)).digest('hex');
export async function businessAudit(trx,actor,action,resource,recordKey,version,details={}){
  await query(trx('business_audit_events').insert({actor_id:actor.id,action,resource,record_key:String(recordKey),version:version||null,details:JSON.stringify(details),created_at:new Date()}));
}
export async function coordinate(db,{session,permission,additionalPermissions=[],operation,commandKey,payload,onRetry=()=>{}},work){
  if(!/^[a-zA-Z0-9._:-]{8,128}$/.test(commandKey||'')||!/^[-a-zA-Z0-9._:]{1,64}$/.test(operation||''))throw new IdentityError(400,'IDEMPOTENCY_KEY_REQUIRED');
  const hash=payloadHash(payload);
  for(let attempt=0;attempt<3;attempt++){
    try{return await db.transaction(async trx=>{
      // Coarse foundation ordering: identity -> business -> command -> resources -> sequence.
      // All exposed writes use this guard; future modules must preserve this ordering.
      await guard(trx);
      const actor=await authorize(trx,session,permission);
      for(const required of additionalPermissions)await authorize(trx,session,required);
      const locked=await query(trx('business_guard').where({id:1}).forUpdate().first());
      if(!locked)throw new IdentityError(503,'BUSINESS_FOUNDATION_UNAVAILABLE');
      const owner={actor_id:actor.id,operation,command_key:commandKey};
      const previous=await query(trx('business_idempotency').where(owner).first());
      if(previous){
        if(previous.payload_hash!==hash)throw new IdentityError(409,'IDEMPOTENCY_CONFLICT');
        if(previous.status!=='COMPLETED')throw new IdentityError(409,'COMMAND_IN_PROGRESS');
        return JSON.parse(previous.result);
      }
      await query(trx('business_idempotency').insert({...owner,payload_hash:hash,status:'PENDING',created_at:new Date()}));
      const result=await work(trx,actor);
      await query(trx('business_idempotency').where(owner).update({status:'COMPLETED',result:JSON.stringify(result)}));
      return result;
    });}catch(error){
      if(['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)&&attempt<2){
        onRetry(error.code,attempt+1);
        await new Promise(resolve=>setTimeout(resolve,20+Math.floor(Math.random()*30)));continue;
      }
      // Never automatically replay a potentially acknowledged COMMIT on connection loss.
      if(['PROTOCOL_CONNECTION_LOST','ECONNRESET','ETIMEDOUT','PROTOCOL_SEQUENCE_TIMEOUT'].includes(error.code))throw new IdentityError(503,'COMMAND_OUTCOME_UNKNOWN');
      throw error;
    }
  }
}
