import {cents,integer,money,fail} from './exact.js';
import {fieldError} from './entry.js';

export function returnNumber(id){if(!/^[1-9][0-9]{0,19}$/.test(String(id))||BigInt(id)>18446744073709551615n)fail('INVALID_RETURN_IDENTITY');return 'DCR-'+BigInt(id).toString().padStart(4,'0');}

// Allocate the original net bill in immutable line order, then allocate each line's
// cents over its cumulative returned units. Floors telescope: every full return
// equals the original debit, independently of how many partial returns were made.
export function returnCredits(sourceLines,net,previous,requested){
 const gross=sourceLines.reduce((n,l)=>n+cents(l.amount,{zero:true}),0n);
 const netCents=cents(net,{zero:true});if(netCents>gross)fail('RETURN_SOURCE_INVALID');
 let prefix=0n;
 const budgets=new Map(sourceLines.map(l=>{const before=prefix;prefix+=cents(l.amount,{zero:true});return [String(l.id),gross?netCents*prefix/gross-netCents*before/gross:0n];}));
 return requested.map((l,index)=>{
  const source=sourceLines.find(s=>String(s.id)===l.originalLineId&&String(s.item_id)===l.itemId);
  if(!source)fieldError(`lines.${index}.itemId`,'Choose a line from the original posted challan.','RETURN_LINE_MISMATCH');
  let q;try{q=integer(l.quantity);}catch{fieldError(`lines.${index}.quantity`,'Enter a positive whole bottle quantity.','INVALID_BOTTLE_QUANTITY');}
  const delivered=integer(source.quantity),old=previous.get(String(source.id))||0n;
  if(old+q>delivered)fieldError(`lines.${index}.quantity`,`Only ${delivered-old} bottles remain returnable.`,'RETURN_QUANTITY_EXCEEDED');
  const budget=budgets.get(String(source.id)),credit=budget*(old+q)/delivered-budget*old/delivered;
  return {...l,quantity:q.toString(),rate:source.rate,snapshot:JSON.parse(source.snapshot),credit:money(credit)};
 });
}

export async function returnContext(t,originalId){
 const source=await t('v1_documents').where({id:originalId}).forUpdate().first();
 if(!source||source.kind!=='CHALLAN'||source.status!=='POSTED')fail('RETURN_POSTED_CHALLAN_REQUIRED',400);
 const lines=await t('v1_lines').where({document_id:source.id}).orderBy('line_no');
 const returns=(await t('v1_documents').where({kind:'CHALLAN_RETURN'}).orderBy('id')).map(d=>({...d,payload:JSON.parse(d.payload)})).filter(d=>d.payload.originalId===String(source.id));
 const previous=new Map();for(const d of returns.filter(d=>d.status==='POSTED'))for(const l of d.payload.lines)previous.set(l.originalLineId,(previous.get(l.originalLineId)||0n)+BigInt(l.quantity));
 return {source,lines,returns,previous};
}

export async function prepareReturn(t,p){
 if(!p.originalId)fieldError('originalId','Select an original posted delivery challan.','RETURN_POSTED_CHALLAN_REQUIRED');
 const ctx=await returnContext(t,p.originalId);
 if(p.partyId!==String(ctx.source.party_id))fieldError('partyId','The return must use the original challan client.','RETURN_CLIENT_MISMATCH');
 if(p.date<ctx.source.date)fieldError('date','Return date cannot precede the original challan.','RETURN_DATE_INVALID');
 if(p.reason.length<3)fieldError('reason','Enter a return reason of at least three characters.','RETURN_REASON_REQUIRED');
 if(!p.lines.length)fieldError('lines','Select at least one returned item.','BOTTLE_LINES_REQUIRED');
 if(new Set(p.lines.map(l=>l.originalLineId)).size!==p.lines.length)fail('RETURN_DUPLICATE_LINE',400);
 for(const [i,l]of p.lines.entries()){const source=ctx.lines.find(s=>String(s.id)===l.originalLineId);if(!source||cents(l.rate,{zero:true})!==cents(source.rate,{zero:true}))fieldError(`lines.${i}.rate`,'The original posted rate is required.','RETURN_RATE_IMMUTABLE');}
 const lines=returnCredits(ctx.lines,ctx.source.total,ctx.previous,p.lines);
 return {...p,lines,originalReference:ctx.source.official_number,originalDate:ctx.source.date,partySnapshot:JSON.parse(ctx.source.payload).partySnapshot,returnCredit:money(lines.reduce((n,l)=>n+cents(l.credit,{zero:true}),0n))};
}

export async function postReturn(t,u,d){
 const p=await prepareReturn(t,d.payload),total=cents(p.returnCredit,{zero:true});
 for(const l of [...p.lines].sort((a,b)=>BigInt(a.itemId)<BigInt(b.itemId)?-1:1)){
  const stock=await t('v1_stock').where({item_id:l.itemId}).forUpdate().first();if(!stock?.verified)fail('STOCK_OPENING_UNVERIFIED');
  const rows=await t('v1_stock_journal').where({item_id:l.itemId});if(rows.reduce((n,j)=>n+BigInt(j.delta),0n)!==BigInt(stock.quantity))fail('STOCK_RECONCILIATION_REQUIRED');
  const next=integer((BigInt(stock.quantity)+BigInt(l.quantity)).toString(),{zero:true});
  await t('v1_stock').where({item_id:l.itemId}).update({quantity:next.toString()});
  await t('v1_stock_journal').insert({document_id:d.id,item_id:l.itemId,delta:l.quantity});
 }
 await t('v1_lines').insert(p.lines.map((l,i)=>({document_id:d.id,line_no:i+1,item_id:l.itemId,snapshot:JSON.stringify(l.snapshot),quantity:l.quantity,rate:l.rate,amount:l.credit})));
 await t('v1_party_journal').insert({document_id:d.id,party_id:p.partyId,debit:'0.00',credit:money(total),particulars:'DELIVERY CHALLAN RETURN · '+p.originalReference});
 const number=returnNumber(d.id);
 await t('v1_documents').where({id:d.id,status:'DRAFT',version:d.version}).update({status:'POSTED',official_number:number,total:money(total),payload:JSON.stringify(p)});
 await t('v1_audit').insert({actor_id:u.id,action:'document.posted',reference:number,reason:p.reason,created_at:new Date()});
 return {id:String(d.id),status:'POSTED',official_number:number,total:money(total)};
}
