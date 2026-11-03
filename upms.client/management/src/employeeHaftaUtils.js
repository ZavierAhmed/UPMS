const display=n=>n===null?'UNVERIFIED':n;
export function employeeHaftaWorkbook(report){
 const columns=['Employee','Date','Description','Quantity','Labor Rate · PKR','Earned · PKR','Paid · PKR'];
 const rows=report.blocks.flatMap(b=>[[b.names.join(' / '),report.from+' to '+report.to,'Opening payable: '+display(b.opening)],...b.records.map(r=>[r.employeeName,r.date,r.description,r.quantity,r.laborRate,r.earned,r.paid]),[b.names.join(' / '),'','Period totals','','',b.earned,b.paid],...(b.allocatedPaid!==undefined?[[b.names.join(' / '),'','Direct Hafta payments: '+b.directPaid],[b.names.join(' / '),'','Existing payments applied (noncash classification): '+b.allocatedPaid]]:[]),[b.names.join(' / '),'','Closing payable: '+display(b.closing)],[]]);
 return {columns,rows,metadata:['Unique Plastic Industry · Employee Hafta · PKR',report.from+' — '+report.to,'Piecework labor only. Ordinary employee-associated business expenses are not deducted. Explicit existing-payment allocations reduce payable without new cash. No advances.',...report.blocks.filter(b=>!b.verified).map(b=>b.names.join(' / ')+': unverified opening; historical unallocated labor is not assumed zero.')]};
}
