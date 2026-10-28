import {returnCredits,returnNumber} from './challan-returns.js';
import {inspectIntegrity} from './integrity.js';
import {discount} from './entry.js';
import {canonical} from '../business/transactions.js';
import {cents,integer,money,dcNumber,paymentNumber} from './exact.js';
export async function reconcileV1(t){
 const mismatches=[],docs=await t('v1_documents').orderBy('id'),lines=await t('v1_lines'),stock=await t('v1_stock'),movements=await t('v1_stock_journal'),journal=await t('v1_party_journal'),audit=await t('v1_audit'),partyBalances=new Map();
 const {findings:integrityFindings,invalid,payloads}=inspectIntegrity(docs,await t('v1_commands').orderBy('key'),await t('users').select('id'),await t('v1_items').select('id','code'),await t('v1_parties').select('id'),audit);
 mismatches.push(...integrityFindings.filter(f=>f.severity==='error').map(f=>`Integrity ${f.code} ${f.entity}/${f.id} ${f.field}`));
 for(const s of stock){const expected=movements.filter(j=>String(j.item_id)===String(s.item_id)).reduce((n,j)=>n+integer(j.delta,{signed:true}),0n);if(expected!==BigInt(s.quantity)||expected<0n)mismatches.push('Stock projection '+s.item_id);}
 for(const d of docs){if(invalid.has(String(d.id)))continue;const p=payloads.get(String(d.id)),ls=lines.filter(l=>String(l.document_id)===String(d.id)),ss=movements.filter(j=>String(j.document_id)===String(d.id)),js=journal.filter(j=>String(j.document_id)===String(d.id));if(d.status!=='POSTED'){if(ls.length||ss.length||js.length||d.official_number)mismatches.push('Unposted effects '+d.id);continue;}
  let debit=0n,credit=0n,total=0n;const expectedStock=new Map();
  try{
  if(['STOCK_OPENING','PRODUCTION','PURCHASE','CHALLAN','STOCK_CORRECTION'].includes(d.kind)){
   if(ls.length!==p.lines.length)mismatches.push('Line count '+d.id);
   for(const [i,l]of p.lines.entries()){const quantity=integer(l.quantity,{signed:d.kind==='STOCK_CORRECTION',zero:d.kind==='STOCK_OPENING'}),rate=['CHALLAN','PURCHASE'].includes(d.kind)?cents(l.rate,{zero:true}):0n,amount=quantity*rate;total+=amount;expectedStock.set(String(l.itemId),(expectedStock.get(String(l.itemId))||0n)+(d.kind==='CHALLAN'?-quantity:quantity));const saved=ls.find(r=>r.line_no===i+1);if(!saved||String(saved.item_id)!==l.itemId||saved.quantity!==quantity.toString()||saved.rate!==money(rate)||saved.amount!==money(amount)||l.snapshot&&canonical(JSON.parse(saved.snapshot))!==canonical(l.snapshot))mismatches.push('Immutable line '+d.id+'/'+(i+1));}
   if(ss.length!==expectedStock.size||ss.some(j=>expectedStock.get(String(j.item_id))!==BigInt(j.delta)))mismatches.push('Stock source '+d.id);
  }else if(d.kind==='CHALLAN_RETURN'){
   try{
    const source=docs.find(s=>String(s.id)===p.originalId&&s.kind==='CHALLAN'&&s.status==='POSTED');
    if(!source||String(source.party_id)!==String(d.party_id)||p.date<source.date)throw Error('source');
    const previous=new Map();for(const earlier of docs.filter(x=>x.kind==='CHALLAN_RETURN'&&x.status==='POSTED'&&journal.some(j=>String(j.document_id)===String(x.id)&&js[0]&&BigInt(j.id)<BigInt(js[0].id)))){const prior=JSON.parse(earlier.payload);if(prior.originalId===p.originalId)for(const line of prior.lines)previous.set(line.originalLineId,(previous.get(line.originalLineId)||0n)+BigInt(line.quantity));}const computed=returnCredits(lines.filter(l=>String(l.document_id)===p.originalId).sort((a,b)=>a.line_no-b.line_no),source.total,previous,p.lines);
    total=computed.reduce((n,l)=>n+cents(l.credit,{zero:true}),0n);credit=total;
    if(d.official_number!==returnNumber(d.id)||ls.length!==computed.length||ss.length!==computed.length||p.returnCredit!==money(total))throw Error('identity');
    for(const [i,l]of computed.entries()){
     const saved=ls.find(s=>s.line_no===i+1),movement=ss.find(s=>String(s.item_id)===l.itemId);
     if(!saved||String(saved.item_id)!==l.itemId||saved.quantity!==l.quantity||saved.rate!==l.rate||saved.amount!==l.credit||canonical(JSON.parse(saved.snapshot))!==canonical(l.snapshot)||!movement||movement.delta!==l.quantity)throw Error('effects');
     previous.set(l.originalLineId,(previous.get(l.originalLineId)||0n)+BigInt(l.quantity));
    }
   }catch{mismatches.push('Return evidence '+d.id);}
  }else if(ss.length||ls.length)mismatches.push('Unexpected stock effects '+d.id);
  if(['CLIENT_OPENING','VENDOR_OPENING'].includes(d.kind)){total=cents(p.amount,{zero:true});if(p.direction==='OWED_TO_COMPANY')debit=total;else credit=total;}
  else if(d.kind==='CHALLAN'){if(p.entryVersion===2){try{const computed=discount(total,p.discountMode,p.discountValue);if(canonical(computed)!==canonical(p.discountSummary)||d.sale_subtotal!==computed.subtotal||d.discount_mode!==computed.mode||d.discount_value!==computed.value||d.discount_amount!==computed.amount)mismatches.push('Discount evidence '+d.id);total=cents(computed.total);}catch{mismatches.push('Invalid discount '+d.id);}}debit=total;if(d.official_number!==dcNumber(d.sequence))mismatches.push('Number '+d.id);}
  else if(d.kind==='PURCHASE'){credit=total;if(p.paidImmediately)debit=total;}
  else if(d.kind==='CLIENT_PAYMENT'){total=cents(p.amount);credit=total;}
  else if(d.kind==='VENDOR_PAYMENT'){total=cents(p.amount);debit=total;}
  else if(d.kind==='EXPENSE'){total=cents(p.amount);if(p.paymentStatus!=='PAID'||!p.category||!p.description||!p.payee||!p.reference||!['CASH','BANK_TRANSFER'].includes(p.method)||d.party_id)mismatches.push('Paid expense evidence '+d.id);}
  else if(d.kind==='PAYMENT_REVERSAL'){const source=docs.find(x=>String(x.id)===p.correctsId&&x.status==='POSTED');if(!source)mismatches.push('Missing reversal source '+d.id);else{total=cents(source.total);if(source.kind==='CLIENT_PAYMENT')debit=total;else credit=total;}}
  else if(d.kind==='OPENING_CORRECTION'){total=cents(p.amount,{zero:true});const desired=p.direction==='OWED_TO_COMPANY'?total:-total,delta=desired-(partyBalances.get(String(d.party_id))||0n);if(delta>0n)debit=delta;else credit=-delta;}
  if(['CLIENT_PAYMENT','VENDOR_PAYMENT'].includes(d.kind)&&d.official_number&&d.official_number!==paymentNumber(d.kind,d.id))mismatches.push('Payment identity '+d.id);
  if(d.total!==money(total))mismatches.push('Document total '+d.id);
  if(d.party_id){if(js.length!==1||js[0].debit!==money(debit)||js[0].credit!==money(credit)||String(js[0].party_id)!==String(d.party_id))mismatches.push('Ledger source '+d.id);partyBalances.set(String(d.party_id),(partyBalances.get(String(d.party_id))||0n)+debit-credit);}else if(js.length)mismatches.push('Unexpected party effects '+d.id);
  if(!audit.some(a=>a.action==='document.posted'&&a.reference===(d.official_number||String(d.id))))mismatches.push('Missing audit '+d.id);
  }catch{integrityFindings.push({code:'DOCUMENT_CALCULATION_INVALID',entity:'document',id:String(d.id),field:'payload',message:'Saved evidence cannot be evaluated under the exact calculation policy.',severity:'error'});mismatches.push('Integrity DOCUMENT_CALCULATION_INVALID document/'+d.id+' payload');}
 }
 return {matched:!mismatches.length,mismatches,repairPerformed:false,documents:docs.filter(d=>d.status==='POSTED').length,sourceLines:lines.length,stockEntries:movements.length,ledgerEntries:journal.length,integrityFindings,reviewRequired:integrityFindings.some(f=>f.severity==='warning'),authenticityVerified:false};
}
