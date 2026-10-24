import {fail} from '../simple-v1/exact.js';
export async function productionGate(t,profile,operation,input,control){
 if(!profile)return;
 const row=await t('production_control').where({id:1}).first();
 if(!row||row.instance_id!==profile.instance||row.schema_name!==profile.schema||row.purpose!==profile.purpose||row.runtime_user!==profile.user||String(row.server_id)!==profile.serverId||String(row.operator_id)!==String(control.operator_id))fail('PRODUCTION_IDENTITY_MISMATCH',503);
 if(!row.cutoff_date||!row.review_reference)fail('OPENING_REVIEW_REQUIRED');
 const isOpening=operation.startsWith('item.save:')||operation.startsWith('party.save:')||operation.startsWith('document.draft:')&&['STOCK_OPENING','CLIENT_OPENING','VENDOR_OPENING'].includes(input.kind);
 let postingOpening=false,effectiveDate=input.date;
 if(operation.startsWith('document.post:')){const doc=await t('v1_documents').where({id:operation.split(':')[1]}).first();postingOpening=doc&&['STOCK_OPENING','CLIENT_OPENING','VENDOR_OPENING'].includes(doc.kind);effectiveDate=doc?.date;}
 if(row.phase==='OPENING'&&!(isOpening||postingOpening))fail('PRODUCTION_POSTING_DISABLED');
 if(row.phase!=='OPENING'&&(row.phase!=='LIVE'||!profile.posting||!row.opening_fingerprint||!row.backup_fingerprint))fail('PRODUCTION_POSTING_DISABLED');
 if(effectiveDate&&effectiveDate<row.cutoff_date)fail('DATE_PRECEDES_BUSINESS_CUTOFF',400);
 if(row.phase==='OPENING'&&effectiveDate&&effectiveDate!==row.cutoff_date)fail('OPENING_DATE_MUST_MATCH_CUTOFF',400);
}
