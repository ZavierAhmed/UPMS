export function laborCoverage(block,report){
 const state=block.coverageState||(block.verified?'FULL':'UNVERIFIED');
 if(state==='FULL')return 'FULL coverage · Verified labor opening from '+block.coverageDate+'. Balances verified through '+report.to+'.';
 if(state==='PARTIAL')return 'PARTIAL coverage · Beginning-of-period payable is unknown. Verified labor coverage begins '+block.coverageDate+'. Closing payable verified as of '+(block.closingAsOf||report.to)+'. Recorded period activity is shown separately.';
 return 'UNVERIFIED coverage · Opening payable is unverified for this period. Historical unallocated labor is not assumed to be zero. Closing payable is not verified.';
}
const display=n=>n===null?'UNVERIFIED':n;
export function employeeHaftaWorkbook(report){
 const columns=['Employee','Date','Description','Quantity','Labor Rate · PKR','Earned · PKR','Paid · PKR'];
 const rows=report.blocks.flatMap(b=>[[b.names.join(' / '),report.from+' to '+report.to,'Opening payable: '+display(b.opening)],[b.names.join(' / '),'',laborCoverage(b,report)],...b.records.map(r=>[r.employeeName,r.date,r.description,r.quantity,r.laborRate,r.earned,r.paid]),[b.names.join(' / '),'','Period totals','','',b.earned,b.paid],...(b.allocatedPaid!==undefined?[[b.names.join(' / '),'','Direct Hafta payments: '+b.directPaid],[b.names.join(' / '),'','Existing payments applied (noncash classification): '+b.allocatedPaid]]:[]),[b.names.join(' / '),'','Closing payable: '+display(b.closing)+(b.coverageState==='PARTIAL'?' · verified as of '+b.closingAsOf:'')],[]]);
 return {columns,rows,metadata:['Unique Plastic Industry · Employee Hafta · PKR',report.from+' — '+report.to,'Selection coverage: '+(report.coverageState||'UNVERIFIED'),'Overall opening payable: '+display(report.totals?.opening??null),'Overall closing payable: '+display(report.totals?.closing??null)+(report.coverageState==='PARTIAL'?' - verified as of '+report.closingAsOf:''),'Piecework labor only. Ordinary employee-associated business expenses are not deducted. Explicit existing-payment allocations reduce payable without new cash. No advances.',...report.blocks.map(b=>b.names.join(' / ')+': '+laborCoverage(b,report))]};
}
