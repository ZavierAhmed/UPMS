import {query} from '../identity/database.js';
import {parseExact as cents,formatExact as money} from '../purchases/amounts.js';
export const receiptScope=(customerId,ledgerType,currency)=>({customer_id:customerId,ledger_type:ledgerType,currency});
export async function position(trx,customerId,ledgerType,currency,issued){
 const row=await query(trx('customer_receipt_totals').where(receiptScope(customerId,ledgerType,currency)).first());
 const received=cents(row?.received||'0.00'),applied=cents(row?.applied||'0.00'),gross=cents(issued)-applied;
 return {ledgerType,currency,issued:money(cents(issued)),received:money(received),applied:money(applied),grossUnpaid:money(gross),unapplied:money(received-applied),netPosition:money(cents(issued)-received)};
}
export async function receiptHistory(trx,id,ledgerType){
 return {receipts:await query(trx('customer_receipt_posts as p').join('customer_receipt_remaining as r','r.receipt_id','p.document_id').join('business_documents as d','d.id','p.document_id').join('business_number_issues as n','n.document_id','d.id').where({'p.customer_id':id,'p.ledger_type':ledgerType}).select('p.document_id','p.ledger_type','p.currency','p.amount','p.initial_applied','p.initial_unapplied','r.remaining','d.business_date','n.official_number').orderBy('p.document_id','desc').limit(100)),allocations:await query(trx('customer_receipt_allocations').where({customer_id:id,ledger_type:ledgerType}).orderBy('id','desc').limit(100))};
}
