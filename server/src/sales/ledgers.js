import {query} from '../identity/database.js';
import {IdentityError} from '../identity/passwords.js';
import {businessAudit} from '../business/transactions.js';
import {parseExact,totalAmounts} from '../purchases/amounts.js';
import {exact} from '../inventory/quantity.js';
import {stockReconciliation} from '../inventory/stock.js';
export async function noLegacyCustomer(trx,id){
 for(const table of ['customer_balances','customer_tracking','customer_receivable_journal','sales_challan_balances'])if(await query(trx(table).where({customer_id:id}).first()))throw new IdentityError(409,'LEGACY_CUSTOMER_RECONCILIATION_REQUIRED');
}
export async function activateLedger(trx,actor,id,input){
 await noLegacyCustomer(trx,id);
 const scope={customer_id:id,ledger_type:input.ledgerType,currency:input.currency};
 if(await query(trx('customer_ledger_tracking').where({customer_id:id,ledger_type:input.ledgerType}).first())||input.version!==1)throw new IdentityError(409,'INITIAL_STATE_ALREADY_AUTHORIZED');
 await query(trx('customer_ledger_tracking').insert({...scope,state:'NEW_OPERATIONAL',version:2,activated_by:actor.id,reason:input.reason,created_at:new Date()}));
 await query(trx('customer_ledger_balances').insert({...scope,balance:'0.00',version:1,updated_at:new Date()}));
 await businessAudit(trx,actor,'customer.classified.new.authorized','customers',id,2,{...input,historicalOpening:false});
 return {id,ledgerType:input.ledgerType,state:'NEW_OPERATIONAL'};
}
export async function customerLedgers(trx,id){
 const tracking=await query(trx('customer_ledger_tracking').where({customer_id:id})),balances=await query(trx('customer_ledger_balances').where({customer_id:id}));
 return ['GST','NON_GST'].map(ledgerType=>{const state=tracking.find(t=>t.ledger_type===ledgerType),balance=balances.find(b=>b.ledger_type===ledgerType&&b.currency===state?.currency);return {ledgerType,state:state?.state||'UNVERIFIED',trackingVersion:state?.version||1,currency:state?.currency||null,balance:balance?.balance??null};});
}
export async function ledgerPage(trx,id,f){
 if(!f.ledgerType)throw new IdentityError(400,'LEDGER_CLASSIFICATION_REQUIRED');
 const customer=await query(trx('business_customers').where({id}).first());if(!customer)throw new IdentityError(404,'NOT_FOUND');
 const states=await customerLedgers(trx,id),state=states.find(s=>s.ledgerType===f.ledgerType);
 let q=trx('customer_classified_journal as j').join('business_documents as d','d.id','j.document_id').join('business_number_issues as n','n.document_id','d.id').join('sales_classified_balances as b','b.document_id','d.id').where({'j.customer_id':id,'j.ledger_type':f.ledgerType}).select('j.id','j.document_id','j.customer_id','j.ledger_type','j.delta','j.currency','j.created_at','j.actor_id','d.business_date','n.official_number','b.base_subtotal','b.gst_amount','b.original_amount','b.outstanding');
 if(f.cursor)q=q.where('j.id','<',f.cursor);if(f.from)q=q.where('d.business_date','>=',f.from);if(f.to)q=q.where('d.business_date','<=',f.to);if(f.reference)q=q.where(sub=>sub.where('n.official_number','like',`%${f.reference}%`).orWhere('d.payload','like',`%${f.reference}%`));
 const rows=await query(q.orderBy('j.id','desc').limit(f.limit+1));
 return {customer:{id:String(id),name:customer.name},ledgerType:f.ledgerType,state:state.state,balance:state.balance===null?null:{ledger_type:f.ledgerType,currency:state.currency,balance:state.balance},records:rows.slice(0,f.limit),nextCursor:rows.length>f.limit?String(rows[f.limit-1].id):null,limit:f.limit,receiptsEnabled:false};
}
export async function reconcileLedgers(trx){
 const stock=await stockReconciliation(trx),mismatches=[];
 if(!stock.matched)mismatches.push({kind:'stock',details:stock.mismatches});
 const [balances,journal,challans,movements,effects,batches,tracking]=await Promise.all(['customer_ledger_balances','customer_classified_journal','sales_classified_balances','sales_stock_movements','business_effect_claims','business_posting_batches','customer_ledger_tracking'].map(t=>query(trx(t))));
 const scope=r=>`${r.customer_id}:${r.ledger_type}:${r.currency}`;
 for(const b of balances){const sum=journal.filter(j=>scope(j)===scope(b)).reduce((s,j)=>s+parseExact(j.delta),0n);if(sum!==parseExact(b.balance)||!tracking.some(t=>scope(t)===scope(b)&&['NEW_OPERATIONAL','HISTORY'].includes(t.state)))mismatches.push({kind:'classified-customer',scope:scope(b)});}
 for(const t of tracking)if(['NEW_OPERATIONAL','HISTORY'].includes(t.state)&&!balances.some(b=>scope(b)===scope(t)))mismatches.push({kind:'missing-balance',scope:scope(t)});
 for(const c of challans){const doc=await query(trx('business_documents').where({id:c.document_id}).first()),rev=await query(trx('sales_classified_revisions').where({document_id:c.document_id,document_version:c.document_version}).first()),lines=await query(trx('sales_lines').where({document_id:c.document_id,document_version:c.document_version})),entries=journal.filter(j=>String(j.document_id)===String(c.document_id));
  if(!doc||doc.status!=='POSTED'||doc.version!==c.document_version||!rev||rev.ledger_type!==c.ledger_type||rev.base_subtotal!==c.base_subtotal||rev.gst_amount!==c.gst_amount||rev.receivable_total!==c.original_amount||entries.length!==1||scope(entries[0])!==scope(c)||entries[0].delta!==c.original_amount||c.outstanding!==c.original_amount||totalAmounts(lines.map(l=>l.amount))!==c.base_subtotal||totalAmounts([c.base_subtotal,c.gst_amount])!==c.original_amount)mismatches.push({kind:'classified-challan',id:String(c.document_id)});
  for(const l of lines){const m=movements.find(m=>String(m.line_id)===String(l.id));if(!m||exact(m.delta,6,{signed:true})!==-exact(l.quantity)||String(m.item_id)!==String(l.item_id))mismatches.push({kind:'dispatch',id:String(l.id)});}
 }
 for(const r of journal)if(!balances.some(b=>scope(b)===scope(r))||!challans.some(c=>String(c.document_id)===String(r.document_id)&&scope(c)===scope(r)))mismatches.push({kind:'missing-classified-projection',id:String(r.id)});
 for(const r of [...journal,...movements])if(!effects.some(e=>String(e.batch_id)===String(r.batch_id)&&e.effect_key===r.effect_key)||!batches.some(b=>String(b.id)===String(r.batch_id)&&String(b.document_id)===String(r.document_id)))mismatches.push({kind:'source',id:String(r.id)});
 const legacy={};for(const t of ['customer_balances','customer_receivable_journal','sales_challan_balances','customer_tracking']){legacy[t]=Number((await query(trx(t).count('* as n')))[0].n);if(legacy[t])mismatches.push({kind:'legacy-reconciliation-required',table:t});}
 const unclassified=await query(trx('sales_documents as s').join('business_documents as d','d.id','s.document_id').leftJoin('sales_classified_revisions as r',function(){this.on('r.document_id','=','d.id').andOn('r.document_version','=','d.version');}).where({'s.kind':'CHALLAN','d.status':'POSTED'}).whereNull('r.document_id').select('d.id'));
 for(const row of unclassified)mismatches.push({kind:'unclassified-posted',id:String(row.id)});
 return {matched:!mismatches.length,mismatches,stock,legacy,ledgers:['GST','NON_GST'],repairPerformed:false};
}
