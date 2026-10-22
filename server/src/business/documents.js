import { query } from '../identity/database.js';
import { authorize } from '../identity/service.js';
import { IdentityError } from '../identity/passwords.js';
import { payloadHash,businessAudit } from './transactions.js';
export const pakistanDate=instant=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);
const now=()=>new Date();
async function document(trx,id){const row=await query(trx('business_documents').where({id}).forUpdate().first());if(!row)throw new IdentityError(404,'NOT_FOUND');return row;}
async function event(trx,actor,row,action,reason){
  await query(trx('business_document_events').insert({document_id:row.id,version:row.version,event:action,actor_id:actor.id,reason,created_at:now()}));
  await businessAudit(trx,actor,`document.${action.toLowerCase()}`,'documents',row.id,row.version,{reason});
}
function justification(reason){if(typeof reason!=='string'||reason.trim().length<3||reason.length>500)throw new IdentityError(400,'JUSTIFICATION_REQUIRED');}
export function approvalPolicy(actor,creator,reason){
  if(!actor.permissions.includes('business.approve'))throw new IdentityError(403,'ACCESS_DENIED');
  justification(reason);
  if(String(actor.id)===String(creator)&&!actor.roles.includes('administrator'))throw new IdentityError(403,'STAFF_SELF_APPROVAL_FORBIDDEN');
}
// Internal foundation services only; no financial-document creation/posting routes.
// Caller must use coordinate() and the declared global lock order.
export async function createDraft(trx,actor,{typeId,businessDate,payload,reason}){
  justification(reason);
  const type=await query(trx('business_document_types').where({id:typeId,active:true}).first());if(!type)throw new IdentityError(400,'INVALID_DOCUMENT_TYPE');
  const [id]=await query(trx('business_documents').insert({type_id:typeId,business_date:businessDate,created_by:actor.id,payload:JSON.stringify(payload),payload_hash:payloadHash(payload),created_at:now(),updated_at:now()}));
  const row={id,version:1};await event(trx,actor,row,'DRAFT',reason);return {id:String(id),version:1};
}
export async function reviseDraft(trx,actor,{id,version,payload,reason}){
  justification(reason);const row=await document(trx,id);
  if(row.status==='POSTED')throw new IdentityError(409,'POSTED_DOCUMENT_IMMUTABLE');
  if(row.version!==version)throw new IdentityError(409,'STALE_VERSION');
  await query(trx('business_approvals').where({document_id:id,valid:true}).update({valid:false}));
  await query(trx('business_documents').where({id}).update({version:version+1,status:'DRAFT',payload:JSON.stringify(payload),payload_hash:payloadHash(payload),updated_at:now()}));
  await event(trx,actor,{id,version:version+1},'REVISED',reason);return {id:String(id),version:version+1};
}
export async function submitDraft(trx,actor,{id,version,reason}){
  justification(reason);const row=await document(trx,id);
  if(row.version!==version)throw new IdentityError(409,'STALE_VERSION');
  if(!['DRAFT','REJECTED'].includes(row.status))throw new IdentityError(409,'INVALID_DOCUMENT_STATE');
  await query(trx('business_documents').where({id}).update({status:'SUBMITTED',updated_at:now()}));
  await event(trx,actor,row,'SUBMITTED',reason);return {id:String(id),version};
}
export async function decideApproval(trx,session,{id,version,hash,decision,reason}){
  const actor=await authorize(trx,session,'business.approve'),row=await document(trx,id);
  approvalPolicy(actor,row.created_by,reason);
  if(row.version!==version||row.payload_hash!==hash)throw new IdentityError(409,'STALE_APPROVAL');
  if(row.status!=='SUBMITTED'||!['APPROVED','REJECTED'].includes(decision))throw new IdentityError(409,'INVALID_DOCUMENT_STATE');
  await query(trx('business_approvals').insert({document_id:id,document_version:version,payload_hash:hash,decision,approver_id:actor.id,justification:reason,valid:true,decided_at:now()}));
  await query(trx('business_documents').where({id}).update({status:decision,updated_at:now()}));
  await event(trx,actor,row,decision,reason);return {id:String(id),version,decision};
}
export async function validateApproval(trx,session,id){
  await authorize(trx,session,'business.approve');
  const row=await document(trx,id);
  const approval=await query(trx('business_approvals').where({document_id:id,document_version:row.version,payload_hash:row.payload_hash,valid:true,decision:'APPROVED'}).orderBy('id','desc').first());
  if(!approval||row.status!=='APPROVED')throw new IdentityError(409,'APPROVAL_REQUIRED');
  // Revalidate the original approver's current account and action authority.
  const user=await query(trx('users').where({id:approval.approver_id,enabled:true}).first());
  const grants=await query(trx('user_roles as ur').join('role_permissions as rp','rp.role_code','ur.role_code').where({'ur.user_id':approval.approver_id,'rp.permission_code':'business.approve'}).first());
  if(!user||!grants)throw new IdentityError(409,'APPROVAL_AUTHORITY_REVOKED');
  return approval;
}
export async function issueNumber(trx,actor,{documentId,instant=now(),businessDate,policyId}){
  const row=await document(trx,documentId);
  // Future posting modules must set POSTED in this same outer transaction after
  // validating all effects. There is no posting endpoint/service in P2.2.
  if(row.status!=='POSTED')throw new IdentityError(409,'NUMBER_REQUIRES_POSTING_TRANSACTION');
  if(row.business_date!==businessDate)throw new IdentityError(409,'DOCUMENT_DATE_MISMATCH');
  const existing=await query(trx('business_number_issues').where({document_id:documentId}).first());if(existing)return {number:existing.official_number};
  const date=pakistanDate(instant),year=Number(date.slice(0,4));
  if(businessDate!==date)throw new IdentityError(409,'BACKDATING_POLICY_UNRESOLVED');
  const policy=await query(policyId?trx('business_policy_versions').where({id:policyId}).first():trx('business_policy_versions').orderBy('id','desc').first());
  if(!policy||policy.status!=='APPROVED'||!policy.proposed_cutoff)throw new IdentityError(409,'CUTOVER_UNCONFIGURED');
  if(policy.numbering_rule!=='CURRENT_PAKISTAN_DATE_ONLY')throw new IdentityError(409,'NUMBERING_POLICY_UNCONFIRMED');
  if(businessDate<policy.proposed_cutoff)throw new IdentityError(409,'PRE_CUTOFF_FORBIDDEN');
  const periods=await query(trx('business_periods').where('start_date','<=',businessDate).where('end_date','>=',businessDate));
  if(periods.length!==1||periods[0].status!=='OPEN')throw new IdentityError(409,'PERIOD_NOT_OPEN');
  const type=await query(trx('business_document_types').where({id:row.type_id,active:true}).first());
  if(!type?.prefix_approved||!type.prefix)throw new IdentityError(409,'PREFIX_UNAPPROVED');
  const scope={type_id:row.type_id,calendar_year:year};
  await query(trx('business_sequences').insert({...scope,last_value:0}).onConflict(['type_id','calendar_year']).ignore());
  const sequence=await query(trx('business_sequences').where(scope).forUpdate().first());
  const serial=BigInt(sequence.last_value)+1n;
  if(serial>999999999999n)throw new IdentityError(409,'SEQUENCE_EXHAUSTED');
  const number=`${type.prefix}-${year}-${serial.toString().padStart(6,'0')}`;
  await query(trx('business_sequences').where(scope).update({last_value:serial.toString()}));
  await query(trx('business_number_issues').insert({document_id:documentId,...scope,serial:serial.toString(),official_number:number,issued_at:instant}));
  await businessAudit(trx,actor,'number.issued','documents',documentId,row.version,{number,policyVersion:String(policy.id)});
  return {number};
}
export async function linkCorrection(trx,actor,{id,originalId,reason}){
  justification(reason);if(String(id)===String(originalId))throw new IdentityError(400,'INVALID_LINK');
  for(const key of [id,originalId].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1))await document(trx,key);
  const row=await document(trx,id);if(row.status==='POSTED')throw new IdentityError(409,'POSTED_DOCUMENT_IMMUTABLE');
  if(row.status!=='DRAFT')throw new IdentityError(409,'INVALID_DOCUMENT_STATE');
  if((await document(trx,originalId)).status!=='POSTED')throw new IdentityError(409,'INVALID_ORIGINAL_STATE');
  await query(trx('business_document_links').insert({document_id:id,original_id:originalId,relation:'CORRECTION'}));
  await businessAudit(trx,actor,'document.linked','documents',id,row.version,{originalId:String(originalId),reason});return {id:String(id)};
}
