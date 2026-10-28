/** New/posted drafts derive identity from the original payment; posted rows are never rewritten. */
export async function reversalIdentity(t,p){
 if(p.kind!=='PAYMENT_REVERSAL')return p;
 const source=p.correctsId?await t('v1_documents').where({id:p.correctsId,status:'POSTED'}).first():null;
 const result={...p};delete result.partySnapshot;result.partyId=null;
 if(!source||!['CLIENT_PAYMENT','VENDOR_PAYMENT'].includes(source.kind))return result;
 const party=await t('v1_parties').where({id:source.party_id}).first();if(!party)return result;
 const old=JSON.parse(source.payload)?.partySnapshot;
 result.partyId=String(source.party_id);
 result.partySnapshot=old&&typeof old==='object'&&!Array.isArray(old)&&old.id===result.partyId?old:{id:result.partyId,name:party.name,address:party.address,kind:party.kind,version:party.version};
 return result;
}
