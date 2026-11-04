export function laborCoverage(block,report){
 const state=report.reconciliation?.matched===false?'UNVERIFIED':block.coverageState||(block.verified?'FULL':'UNVERIFIED');
 if(state==='FULL')return 'FULL coverage · Verified labor opening from '+block.coverageDate+'. Balances verified through '+report.to+'.';
 if(state==='PARTIAL')return 'PARTIAL coverage · Beginning-of-period payable is unknown. Verified labor coverage begins '+block.coverageDate+'. Closing payable verified as of '+(block.closingAsOf||report.to)+'. Recorded period activity is shown separately.';
 return 'UNVERIFIED coverage · Opening payable is unverified for this period. Historical unallocated labor is not assumed to be zero. Closing payable is not verified.';
}
export const displayLaborMoney=n=>n===null||n===undefined?'UNVERIFIED':n;
const cents=n=>{if(typeof n!=='string'||!/^\d+\.\d{2}$/.test(n))return null;return BigInt(n.replace('.',''));};
const money=n=>n===null?null:String(n/100n)+'.'+String(n%100n).padStart(2,'0');
const add=(a,b)=>a===null||b===null?null:money(cents(a)+cents(b));
// Presentation only: source values, closing and coverage remain authoritative PHP results.
export function employeeHaftaStatement(block,report){
 const state=report.reconciliation?.matched===false?'UNVERIFIED':block.coverageState||(block.verified?'FULL':'UNVERIFIED');
 const opening=block.existingOpening,known=state==='FULL'||state==='PARTIAL';
 const start=state==='FULL'?block.opening:state==='PARTIAL'&&opening?.verified&&opening.date>=report.from&&opening.date<=report.to?opening.amount:null;
 const validStart=known&&cents(start)!==null?start:null;
 const startDate=known?(state==='PARTIAL'?opening?.date:report.from):null;
 const carried=Boolean(validStart!==null&&opening?.date<report.from);
 const startLabel=!known?'Opening balance (unverified)':carried?'Carried opening balance': 'Verified opening';
 const openingRow=validStart!==null?{id:opening?.id||block.employeeId,type:'OPENING',date:startDate,description:carried?'Carried opening balance':'Verified employee opening',employeeName:opening?.employeeName||block.names.join(' / '),quantity:'',laborRate:'',earned:'',paid:'',openingBalance:validStart,openingId:opening?.id,carried}:null;
 const direct=block.directPaid??block.paid,allocated=block.allocatedPaid??'0.00';
 const available=validStart!==null&&cents(block.earned)!==null?add(validStart,block.earned):null;
 const closing=known&&block.closingVerified!==false&&cents(block.closing)!==null?block.closing:null;
 return {state,start:validStart,startDate,carried,openingRow,records:[...(openingRow?[openingRow]:[]),...block.records],earned:block.earned,direct,allocated,deductions:block.paid,available,closing,summary:[
  {key:'opening',label:startLabel+(startDate?' - '+startDate:''),amount:validStart},
  {key:'earned',label:'Total labor earned'+(state==='PARTIAL'?' during covered period':''),amount:block.earned},
  {key:'available',label:'Total available before payment',amount:available},
  {key:'direct',label:'Direct Hafta payments',amount:direct},
  {key:'allocated',label:'Existing expenses applied to Hafta',amount:allocated},
  {key:'deductions',label:'Total payments/deductions',amount:block.paid},
  {key:'closing',label:'Closing payable / Amount owed to employee'+(state==='PARTIAL'?' - verified as of '+(block.closingAsOf||report.to):''),amount:closing},
 ]};
}
export function employeeHaftaAggregate(report){
 const statements=report.blocks.map(b=>employeeHaftaStatement(b,report));
 const sum=key=>!statements.length||statements.some(s=>cents(s[key])===null)?null:money(statements.reduce((n,s)=>n+cents(s[key]),0n));
 const totals=report.totals??{earned:sum('earned'),paid:sum('deductions'),closing:sum('closing')};
 return {start:sum('start'),earned:totals.earned,available:sum('available'),direct:totals.directPaid??sum('direct'),allocated:totals.allocatedPaid??sum('allocated'),deductions:totals.paid,closing:sum('closing')};
}
export function employeeHaftaWorkbook(report){
 const columns=['Employee','Date','Description','Quantity','Labor Rate - PKR','Earned - PKR','Paid - PKR','Opening balance - PKR','Payable balance - PKR'];
 const rows=report.blocks.flatMap(b=>{const s=employeeHaftaStatement(b,report);return [
  [b.names.join(' / '),report.from+' to '+report.to,'Opening payable: '+displayLaborMoney(b.opening)],
  [b.names.join(' / '),'',laborCoverage(b,report)],
  ...s.records.map(r=>[r.employeeName,r.date,r.description,r.quantity,r.laborRate,r.earned,r.paid,r.openingBalance??'','']),
  [b.names.join(' / '),'','Period totals','','',b.earned,b.paid,'',''],
  ...s.summary.map(r=>[b.names.join(' / '),'',r.label,'','','','','',displayLaborMoney(r.amount)]),
  []
 ];});
 const total=employeeHaftaAggregate(report);
 return {columns,rows,metadata:['Unique Plastic Industry - Employee Hafta - PKR',report.from+' to '+report.to,'Selection coverage: '+(report.coverageState||'UNVERIFIED'),'Overall selected-period opening payable: '+displayLaborMoney(report.totals?.opening),'Overall verified/carried starting balances: '+displayLaborMoney(total.start),'Overall available before payment: '+displayLaborMoney(total.available),'Overall closing payable: '+displayLaborMoney(total.closing),'Opening balance rows are evidence or carryforward, not newly earned labor, cash receipts or postings. Summary values restate the transactions; do not add summaries to activity.','Only explicitly approved existing-payment allocations reduce Hafta. Ordinary employee-associated business expenses are not deducted. No new cash.',...report.blocks.map(b=>b.names.join(' / ')+': '+laborCoverage(b,report))]};
}
