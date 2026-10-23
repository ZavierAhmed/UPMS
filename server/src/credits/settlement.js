import {query} from '../identity/database.js';
import {IdentityError} from '../identity/passwords.js';
import {parseExact as cents,formatExact as money} from '../purchases/amounts.js';
export const settlementValues=(original,credits,allocations)=>{const net=original-credits-allocations;return {outstanding:net>0n?net:0n,surplus:net<0n?-net:0n,netSales:original-credits};};
export async function settlement(trx,id,{lock=false,verify=true}={}){
 const original=await query(trx('sales_classified_balances').where({document_id:id}).first()),q=trx('customer_challan_outstanding').where({challan_id:id}),current=await query((lock?q.forUpdate():q).first());if(!original||!current)throw new IdentityError(409,'CHALLAN_SETTLEMENT_MISSING');
 const credits=await query(trx('customer_credit_journal').where({challan_id:id})),allocations=await query(trx('customer_receipt_allocations').where({challan_id:id})),reversals=allocations.length?await query(trx('cheque_allocation_reversals').whereIn('allocation_id',allocations.map(a=>a.id))):[];
 const credit=credits.reduce((n,c)=>n+cents(c.total_credit),0n),applied=allocations.reduce((n,a)=>n+cents(a.amount),0n)-reversals.reduce((n,a)=>n+cents(a.amount),0n),values=settlementValues(cents(original.original_amount),credit,applied);
 if(credit>cents(original.original_amount)||applied<0n||applied>cents(original.original_amount)||[...credits,...allocations].some(r=>String(r.customer_id)!==String(original.customer_id)||r.ledger_type!==original.ledger_type||r.currency!==original.currency)||current.original_amount!==original.original_amount||String(current.customer_id)!==String(original.customer_id)||current.ledger_type!==original.ledger_type||current.currency!==original.currency||(verify&&cents(current.outstanding)!==values.outstanding))throw new IdentityError(409,'CHALLAN_SETTLEMENT_EVIDENCE_MISMATCH');
 return {original,current,credits,allocations,reversals,credit,applied,...values};
}
export async function projectSettlement(trx,id,current){const s=await settlement(trx,id,{verify:false});if(await query(trx('customer_challan_outstanding').where({challan_id:id,version:current.version,outstanding:current.outstanding}).update({outstanding:money(s.outstanding),version:(BigInt(current.version)+1n).toString()}))!==1)throw new IdentityError(409,'STALE_CHALLAN_OUTSTANDING');return s;}
