// Observational views of the existing authorized Simple V1 reads; no stored totals.
export const pakistanToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function moneyCents(value){if(!/^-?\d+\.\d{2}$/.test(String(value)))throw Error('Invalid monetary evidence');const negative=value.startsWith('-'),[whole,fraction]=value.replace('-','').split('.');return (BigInt(whole)*100n+BigInt(fraction))*(negative?-1n:1n);}
export function moneyText(value){const sign=value<0n?'-':'';const n=value<0n?-value:value;return sign+(n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');}
export const documentLabels={STOCK_OPENING:'Stock openings',CLIENT_OPENING:'Client openings',VENDOR_OPENING:'Vendor openings',PRODUCTION:'Production',PURCHASE:'Purchases',CHALLAN:'Delivery challans',CHALLAN_RETURN:'Challan returns',CLIENT_PAYMENT:'Client receipts',VENDOR_PAYMENT:'Vendor payments',PAYMENT_REVERSAL:'Payment reversals',STOCK_CORRECTION:'Stock corrections',OPENING_CORRECTION:'Opening corrections',EXPENSE:'Paid expenses'};
export function dashboardAnalytics(data,days=30,today=pakistanToday()){
 if(![7,30,90].includes(days))throw Error('Unsupported range');
 const end=new Date(today+'T00:00:00Z'),dates=Array.from({length:days},(_,i)=>new Date(+end-(days-1-i)*86400000).toISOString().slice(0,10));
 const daily=dates.map(date=>({date,sales:0n,returns:0n,net:0n})),byDate=new Map(daily.map(d=>[d.date,d])),byId=new Map(data.docs.map(d=>[String(d.id),d]));
 const counts={},totals={sales:0n,returns:0n,clientReceipts:0n,vendorPayments:0n,expenses:0n},statuses={POSTED:0,DRAFT:0,CANCELLED:0};let unknownReversals=0;
 for(const d of data.docs){if(d.date<dates[0]||d.date>today)continue;if(d.status in statuses)statuses[d.status]++;if(d.status!=='POSTED')continue;counts[d.kind]=(counts[d.kind]||0)+1;const n=moneyCents(d.total),day=byDate.get(d.date);
  if(d.kind==='CHALLAN'){totals.sales+=n;day.sales+=n;}if(d.kind==='CHALLAN_RETURN'){totals.returns+=n;day.returns+=n;}if(d.kind==='CLIENT_PAYMENT')totals.clientReceipts+=n;if(d.kind==='VENDOR_PAYMENT'||(d.kind==='PURCHASE'&&d.payload?.paidImmediately===true))totals.vendorPayments+=n;if(d.kind==='EXPENSE')totals.expenses+=n;
  if(d.kind==='PAYMENT_REVERSAL'){const source=byId.get(String(d.payload?.correctsId));if(source?.kind==='CLIENT_PAYMENT')totals.clientReceipts-=n;else if(source?.kind==='VENDOR_PAYMENT')totals.vendorPayments-=n;else unknownReversals++;}
 }
 for(const d of daily)d.net=d.sales-d.returns;
 const verified=data.items.filter(i=>Boolean(i.active)&&Boolean(i.verified)).map(i=>({...i,bottles:BigInt(i.quantity)})).sort((a,b)=>a.bottles===b.bottles?String(a.code).localeCompare(String(b.code)):a.bottles>b.bottles?-1:1);
 return {from:dates[0],to:today,daily,totals:{...totals,net:totals.sales-totals.returns},counts,statuses,unknownReversals,inventory:verified.slice(0,8),unverifiedItems:data.items.filter(i=>Boolean(i.active)&&!i.verified),unverifiedParties:[...data.clients,...data.vendors].filter(p=>!p.opening_verified),drafts:data.docs.filter(d=>d.status==='DRAFT'),recent:[...data.docs].sort((a,b)=>b.date.localeCompare(a.date)|| (BigInt(a.id)>BigInt(b.id)?-1:1)).slice(0,8)};
}
