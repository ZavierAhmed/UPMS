import {p27cSynthetic} from '../expenses/isolation.js';
import {query} from '../identity/database.js';
import {payloadHash} from '../business/transactions.js';
import {pakistanDate} from '../business/documents.js';
import {parseExact as cents,formatExact as money,totalAmounts} from '../purchases/amounts.js';
import {exact,decimal} from '../inventory/quantity.js';
import {source,fail,same} from '../returns/core.js';
import {returnReconciliation} from '../returns/reconciliation.js';
import {settlement} from './settlement.js';
import {policyInput} from './validation.js';
export {fail,same};
export const referenceKey=value=>value.trim().replace(/\s+/g,' ').toUpperCase();
export async function creditTestDatabase(trx){const [r]=await trx.raw('SELECT DATABASE() name');if(!/^upms_test_p27b_(?:credits|returns|cheques|receipts|sales|classification|inventory|purchasing|regression)_20261023_0[1-8]$/.test(r[0].name)&&!p27cSynthetic(r[0].name))fail('REAL_CREDIT_ACTIVATION_PENDING');}
export async function accepted(trx,date){await creditTestDatabase(trx);const p=await query(trx('credit_policies').orderBy('id','desc').first());if(!p)fail('CREDIT_POLICY_PENDING');const terms=policyInput.parse(JSON.parse(p.contract));if(payloadHash(terms)!==p.contract_hash)fail('CREDIT_POLICY_EVIDENCE_MISMATCH');if(date){if(date!==pakistanDate(new Date()))fail('BACKDATING_POLICY_UNRESOLVED');if(date<terms.cutoff)fail('PRE_CUTOFF_FORBIDDEN');const periods=await query(trx('business_periods').where('start_date','<=',date).where('end_date','>=',date));if(periods.length!==1||periods[0].status!=='OPEN'||!same(periods[0].id,terms.periodId))fail('PERIOD_NOT_OPEN');}return {...p,terms};}
export async function load(trx,id){const d=await query(trx('credit_documents as c').join('business_documents as d','d.id','c.document_id').where('d.id',id).select('d.*','c.kind','c.challan_id','c.sales_line_id','c.customer_id','c.ledger_type','c.currency','c.return_disposition_id','c.source_version','c.source_hash').first());if(!d)fail('NOT_FOUND',404);return d;}
export async function evidence(trx,input,doc=null){
 const policy=await accepted(trx,input.businessDate),original=await source(trx,input.challanId),s=await settlement(trx,input.challanId,{lock:true});
 if(!same(original.customer_id,input.customerId)||original.ledger_type!==input.ledgerType||s.original.currency!==input.currency||policy.terms.currency!==input.currency)fail('CREDIT_SOURCE_SCOPE_MISMATCH');
 if(doc&&(original.version!==doc.source_version||original.payload_hash!==doc.source_hash))fail('STALE_ORIGINAL_REFERENCE');
 const line=await query(trx('sales_lines').where({id:input.salesLineId,document_id:original.id,document_version:original.version}).first()),dispatch=await query(trx('sales_stock_movements').where({line_id:input.salesLineId,document_id:original.id}).first());if(!line||!dispatch||exact(dispatch.delta,6,{signed:true})!==-exact(line.quantity))fail('CREDIT_LINE_SOURCE_MISMATCH');
 const base=cents(input.baseCredit),gst=cents(input.gstCredit),total=cents(totalAmounts([input.baseCredit,input.gstCredit])),quantity=exact(input.quantity);
 if(!total)fail('POSITIVE_CREDIT_REQUIRED',400);if(input.ledgerType==='NON_GST'&&gst)fail('NON_GST_AMOUNT_FORBIDDEN',400);
 const sum=(rows,k)=>rows.reduce((n,r)=>n+cents(r[k]),0n),priorBase=sum(s.credits,'base_credit'),priorGst=sum(s.credits,'gst_credit'),lineBase=sum(s.credits.filter(c=>same(c.sales_line_id,line.id)),'base_credit');
 if(base+priorBase>cents(s.original.base_subtotal)||gst+priorGst>cents(s.original.gst_amount)||base+lineBase>cents(line.amount)||total+s.credit>cents(s.original.original_amount))fail('CREDIT_CAPACITY_EXCEEDED');
 let eligible=0n,claimed=0n,physical=null;
 if(input.kind==='PRICE_ONLY_CREDIT'){if(input.returnDispositionId||quantity)fail('INVALID_PRICE_ONLY_CREDIT',400);}
 else{
  if(!input.returnDispositionId||quantity<=0n)fail('RETURN_CREDIT_EVIDENCE_REQUIRED',400);
  const d=await query(trx('return_dispositions as p').join('return_lines as l','l.id','p.line_id').join('return_documents as r','r.document_id','p.document_id').join('business_documents as b','b.id','r.document_id').where('p.line_id',input.returnDispositionId).select('p.*','l.sales_line_id','r.challan_id','r.customer_id','r.ledger_type','b.status','b.version','b.payload_hash').first());
  if(!d||d.status!=='POSTED'||!same(d.sales_line_id,line.id)||!same(d.challan_id,original.id)||!same(d.customer_id,input.customerId)||d.ledger_type!==input.ledgerType)fail('POSTED_INSPECTION_REQUIRED');
  const reconciliation=await returnReconciliation(trx);if(!reconciliation.matched)fail('RETURN_EVIDENCE_MISMATCH');
  eligible=exact(d.reusable)+(policy.terms.returnEligibility==='REUSABLE_AND_DAMAGED'?exact(d.damaged):0n);claimed=s.credits.filter(c=>same(c.return_disposition_id,d.line_id)).reduce((n,c)=>n+exact(c.quantity),0n);if(quantity+claimed>eligible)fail('RETURN_CREDIT_QUANTITY_EXCEEDED');
  const unit=await query(trx('business_units').where({id:line.unit_id}).first());if(!unit||quantity%(10n**BigInt(6-unit.scale)))fail('INVALID_UNIT_PRECISION',400);
  physical={dispositionId:String(d.line_id),receiptLineId:String(d.receipt_line_id),documentId:String(d.document_id),version:d.version,hash:d.payload_hash,eligible:decimal(eligible),claimed:decimal(claimed)};
 }
 if(Number(s.current.version)!==input.expectedSettlementVersion)fail('STALE_CHALLAN_OUTSTANDING');
 const snapshot={originalVersion:original.version,originalHash:original.payload_hash,policyId:String(policy.id),lineAmount:line.amount,originalBase:s.original.base_subtotal,originalGst:s.original.gst_amount,originalTotal:s.original.original_amount,priorBase:money(priorBase),priorGst:money(priorGst),priorLineBase:money(lineBase),outstanding:money(s.outstanding),surplus:money(s.surplus),applied:money(s.applied),settlementVersion:String(s.current.version),physical};
 return {policy,original,line,s,base:money(base),gst:money(gst),total:money(total),quantity:decimal(quantity),snapshot};
}
