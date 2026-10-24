import {cents,money} from './exact.js';

export const eventTypes={STOCK_OPENING:['Stock opening','Opening balance'],PRODUCTION:['Production stock in','Inventory-only movement'],PURCHASE:['Bottle purchase','Financial obligation'],CHALLAN:['Delivery challan sale','Sales revenue / receivable'],CLIENT_OPENING:['Client opening','Opening balance'],VENDOR_OPENING:['Vendor opening','Opening balance'],CLIENT_PAYMENT:['Client receipt','Payment received'],VENDOR_PAYMENT:['Vendor payment','Payment made'],PAYMENT_REVERSAL:['Payment reversal','Correction / reversal'],STOCK_CORRECTION:['Stock correction','Inventory-only correction'],OPENING_CORRECTION:['Opening correction','Correction / reversal'],EXPENSE:['Business expense paid','Expense recorded and paid']};

export function transactionRegister(documents,parties,journals,filters={}){
  const totals={sales:0n,purchases:0n,clientReceipts:0n,vendorPayments:0n,expensesRecorded:0n,expensesPaid:0n},balances=new Map();let production=0n;
  const records=documents.filter(d=>d.status==='POSTED').map(d=>{
    const p=typeof d.payload==='string'?JSON.parse(d.payload):d.payload;
    const party=p.partySnapshot?.name||parties.find(r=>String(r.id)===String(d.party_id))?.name||p.payee||'';
    const [type,effect]=eventTypes[d.kind]||['Unknown event','Review required'];
    return {id:String(d.id),date:d.date,reference:d.official_number||p.reference||'Entry '+d.id,externalReference:p.reference||'',chequeReference:p.chequeReference||'',kind:d.kind,type,party,partyId:d.party_id?String(d.party_id):'',particulars:p.description||p.remarks||type,amount:d.total,effect:d.kind==='PURCHASE'&&p.paidImmediately?'Purchase recorded and paid':effect,method:d.kind==='PURCHASE'&&!p.paidImmediately?'':p.method||'',quantity:(p.lines||[]).reduce((n,l)=>n+BigInt(l.quantity),0n).toString(),payload:p};
  }).filter(r=>(!filters.from||r.date>=filters.from)&&(!filters.to||r.date<=filters.to)&&(!filters.type||r.kind===filters.type)&&(!filters.party||r.party.toLowerCase().includes(filters.party.toLowerCase()))&&(!filters.reference||[r.reference,r.externalReference,r.chequeReference].join(' ').toLowerCase().includes(filters.reference.toLowerCase()))).sort((a,b)=>a.date.localeCompare(b.date)||(BigInt(a.id)<BigInt(b.id)?-1:1));
  for(const r of records){const n=cents(r.amount,{zero:true});if(r.kind==='CHALLAN')totals.sales+=n;if(r.kind==='PURCHASE'){totals.purchases+=n;if(r.payload.paidImmediately)totals.vendorPayments+=n;}if(r.kind==='CLIENT_PAYMENT')totals.clientReceipts+=n;if(r.kind==='VENDOR_PAYMENT')totals.vendorPayments+=n;if(r.kind==='EXPENSE'){totals.expensesRecorded+=n;totals.expensesPaid+=n;}if(r.kind==='PRODUCTION')production+=BigInt(r.quantity);}
  // Balances are authoritative journal balances as of the end date, independent
  // of event/reference filters. Advances never offset another party's debt.
  for(const j of journals){if(filters.to&&j.date>filters.to)continue;const id=String(j.party_id);balances.set(id,(balances.get(id)||0n)+cents(j.debit,{zero:true})-cents(j.credit,{zero:true}));}
  let receivables=0n,payables=0n;for(const p of parties){if(!p.opening_verified)continue;const n=balances.get(String(p.id))||0n;if(p.kind==='CLIENT'&&n>0n)receivables+=n;if(p.kind==='VENDOR'&&n<0n)payables-=n;}
  return {records:records.map(({payload,...r})=>r),totals:Object.fromEntries(Object.entries(totals).map(([k,n])=>[k,money(n)])),clientReceivables:money(receivables),vendorPayables:money(payables),productionBottles:production.toString(),balanceCoverage:'Verified party balances as of To date (or present), across all parties; advances excluded. Event totals follow all filters.',unverifiedParties:parties.filter(p=>!p.opening_verified).length};
}
