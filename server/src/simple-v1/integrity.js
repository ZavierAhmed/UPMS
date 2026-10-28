import {cents,today} from './exact.js';

const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&/^[1-9]\d{0,19}$/.test(v)&&BigInt(v)<=18446744073709551615n;
const date=v=>typeof v==='string'&&/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(+new Date(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const uuid=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/** Observational checks only. A valid hash is not proof of the original input. */
export function inspectIntegrity(docs,commands,users,items,parties,audit=[]){
 const findings=[],invalid=new Set(),payloads=new Map(),postedReceipts=new Set(),keys=new Set();
 const add=(code,entity,record,field,message,severity='error')=>{findings.push({code,entity,id:String(record),field,message,severity});if(entity==='document'&&severity==='error')invalid.add(String(record));};
 for(const d of docs){
  let p;try{p=JSON.parse(d.payload);if(!object(p))throw Error();payloads.set(String(d.id),p);}catch{add('DOCUMENT_PAYLOAD_INVALID','document',d.id,'payload','Saved payload must be a JSON object.');continue;}
  if(d.status!=='POSTED')continue;
  if(['STOCK_OPENING','PRODUCTION','PURCHASE','CHALLAN','STOCK_CORRECTION','CHALLAN_RETURN'].includes(d.kind)&&(!Array.isArray(p.lines)||p.lines.some(l=>!object(l))))add('DOCUMENT_LINES_INVALID','document',d.id,'payload.lines','Posted line evidence must be an array of objects.');
  if(!date(d.date)||!date(p.date))add('DOCUMENT_DATE_INVALID','document',d.id,'date','SQL and payload dates must be real YYYY-MM-DD dates.');
  else if(d.date!==p.date)add('DOCUMENT_DATE_MISMATCH','document',d.id,'date','SQL date differs from saved payload date.');
  else if(d.date>today())add('FUTURE_POSTED_DATE_REVIEW','document',d.id,'date','Future posted date requires import/provenance review; no date was changed.','warning');
  if(d.kind==='EXPENSE'&&(!Object.hasOwn(p,'partyId')||p.partyId!==null))add('EXPENSE_PARTY_EVIDENCE','document',d.id,'payload.partyId','Paid expenses require an explicit null payload party identity.');
  if(d.kind==='EXPENSE'&&p.partySnapshot!==undefined&&p.partySnapshot!==null)add('EXPENSE_PARTY_EVIDENCE','document',d.id,'payload.partySnapshot','Paid expenses cannot retain a client or vendor snapshot.');
  function amount(value,field,zero=true,derived=false){
   if(typeof value!=='string'){add('AMOUNT_REPRESENTATION_INVALID','document',d.id,field,'Persisted financial amounts must be strings.');return;}
   try{if(derived){if(!/^(?:0|[1-9]\d{0,13})\.\d{2}$/.test(value))throw Error();}else cents(value,{zero});}catch{add('AMOUNT_VALUE_INVALID','document',d.id,field,'Persisted amount is outside the accepted exact-decimal policy.');}
  }
  if(['CLIENT_OPENING','VENDOR_OPENING','OPENING_CORRECTION','CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE'].includes(d.kind))amount(p.amount,'payload.amount',!['CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE'].includes(d.kind));
  else if(Object.hasOwn(p,'amount')&&typeof p.amount!=='string')add('AMOUNT_REPRESENTATION_INVALID','document',d.id,'payload.amount','Persisted financial amounts must be strings.');
  if(!['PURCHASE','CHALLAN','CHALLAN_RETURN'].includes(d.kind)&&Array.isArray(p.lines))for(const [i,l]of p.lines.entries())if(object(l)&&Object.hasOwn(l,'rate')&&typeof l.rate!=='string')add('AMOUNT_REPRESENTATION_INVALID','document',d.id,`payload.lines.${i}.rate`,'Persisted financial amounts must be strings.');
  if(['PURCHASE','CHALLAN','CHALLAN_RETURN'].includes(d.kind)&&Array.isArray(p.lines))for(const [i,l]of p.lines.entries()){
   amount(l?.rate,`payload.lines.${i}.rate`);if(d.kind==='CHALLAN_RETURN')amount(l?.credit,`payload.lines.${i}.credit`);
  }
  if(d.kind==='CHALLAN_RETURN')amount(p.returnCredit,'payload.returnCredit');
  if(d.kind==='CHALLAN'&&p.entryVersion===2){amount(p.discountValue,'payload.discountValue');for(const field of ['value','subtotal','amount','total'])amount(p.discountSummary?.[field],'payload.discountSummary.'+field,true,true);}
  if(d.kind==='PAYMENT_REVERSAL'){
   const source=docs.find(x=>String(x.id)===p.correctsId&&x.status==='POSTED'&&['CLIENT_PAYMENT','VENDOR_PAYMENT'].includes(x.kind));
   if(!source||String(d.party_id)!==String(source.party_id)||String(d.corrects_id)!==String(source.id)||(p.partyId!==undefined&&p.partyId!==null&&p.partyId!==String(source.party_id))||(p.partySnapshot!==undefined&&p.partySnapshot!==null&&(!object(p.partySnapshot)||p.partySnapshot.id!==String(source.party_id))))add('REVERSAL_SNAPSHOT_IDENTITY','document',d.id,'payload.partySnapshot','Reversal snapshot and posted party must identify the original payment party.');
  }
 }
 for(const c of commands){
  const key=String(c.key),folded=key.toLowerCase();
  if(!uuid.test(key)||keys.has(folded))add('COMMAND_KEY_INVALID','command',key,'key','Command key must be a unique supported UUID.');keys.add(folded);
  if(typeof c.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(c.fingerprint))add('COMMAND_FINGERPRINT_FORMAT','command',key,'fingerprint','Fingerprint must be a lowercase 64-character SHA256 representation; authenticity is not verified.');
  if(!id(String(c.actor_id))||!users.some(u=>String(u.id)===String(c.actor_id)))add('COMMAND_ACTOR_MISSING','command',key,'actor_id','Command actor must identify retained user evidence.');
  let r;try{r=JSON.parse(c.result);if(!object(r)||!id(r.id))throw Error();}catch{add('COMMAND_RESULT_INVALID','command',key,'result','Saved command result must be an object with a canonical string id.');continue;}
  const names=Object.keys(r).sort().join(',');
  if(r.status==='POSTED'){
   if(names!=='id,official_number,status,total'||typeof r.total!=='string'||!/^(?:0|[1-9]\d{0,15})\.\d{2}$/.test(r.total)||!(r.official_number===null||typeof r.official_number==='string')){add('COMMAND_RESULT_INVALID','command',key,'result','Posted receipt must retain id, POSTED status, official_number and exact string total.');continue;}
   const d=docs.find(d=>String(d.id)===r.id);
   if(!d||d.status!=='POSTED'||d.total!==r.total||d.official_number!==r.official_number)add('COMMAND_RESULT_DOCUMENT','command',key,'result','Posted receipt differs from its immutable document evidence.');else {postedReceipts.add(r.id);if(audit.some(a=>a.action==='document.posted'&&a.reference===(d.official_number||String(d.id))&&String(a.actor_id)!==String(c.actor_id)))add('COMMAND_ACTOR_EVIDENCE','command',key,'actor_id','Posted command actor contradicts retained posting audit evidence.');}
  }else if(r.status==='CANCELLED'){
   const d=docs.find(d=>String(d.id)===r.id);if(names!=='id,status'||!d||d.status!=='CANCELLED')add('COMMAND_RESULT_DOCUMENT','command',key,'result','Cancellation receipt must identify a cancelled document.');
  }else if(names==='code,id'){
   if(typeof r.code!=='string'||!items.some(i=>String(i.id)===r.id&&i.code===r.code))add('COMMAND_RESULT_REFERENCE','command',key,'result','Item receipt must identify the retained immutable item code.');
  }else if(names!=='id')add('COMMAND_RESULT_INVALID','command',key,'result','Saved result does not match a supported command receipt shape.');
  else if(![...docs,...items,...parties].some(x=>String(x.id)===r.id))add('COMMAND_RESULT_REFERENCE','command',key,'result.id','Id-only receipt has no possible retained document, item or party.');
 }
 for(const d of docs)if(d.status==='POSTED'&&!postedReceipts.has(String(d.id)))add('COMMAND_COVERAGE_UNVERIFIABLE','document',d.id,'commands','No matching post receipt is retained; historical/import provenance requires review.','warning');
 return {findings,invalid,payloads};
}
