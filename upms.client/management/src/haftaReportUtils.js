export function weekRange(date = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Karachi', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date())) {
  const d = new Date(date+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay()+6)%7);
  const from = d.toISOString().slice(0,10);
  d.setUTCDate(d.getUTCDate()+6);
  return {from, to:d.toISOString().slice(0,10)};
}
export function haftaWorkbook(report) {
  const columns = ['Party / section','Date','Type / reference','Description','Quantity','Rate · PKR','Amount · PKR'];
  const rows = report.blocks.flatMap(b => [
    [b.partyName, report.from+' to '+report.to, b.partyKind, b.classification],
    ...b.rows.map(r => ['',r.date,r.kind+' / '+r.reference,r.description+(r.attributes?' / '+r.attributes:''),r.quantity,r.rate,r.amount]),
    ...[['Gross sales',b.grossSales],['Discounts',b.discounts],['Returns credit',b.returns],['TOTAL · net weekly sales',b.total],['Client receipts (not advances)',b.receipts],['Receipt reversals',b.receiptReversals],['Opening entries / corrections in range',b.openingEntries],['Opening',b.opening??'UNVERIFIED'],['ADVANCE','Not separately classified'],['Recorded movement',b.movement],['BALANCE',b.balance??'UNVERIFIED']].map(([label,value])=>[b.partyName,'','',label,'','',value]),
    ...b.warnings.map(w=>[b.partyName,'','WARNING',w]), []
  ]);
  return {columns, rows, metadata:['Unique Plastic Industry · HAFTA · PKR', report.from+' to '+report.to, 'TOTAL = gross sales - bill discounts - return credits. Return amounts are recorded net credits at historical rates.', 'BALANCE = verified opening + signed journal movements. Receipts are not classified as advances.', ...report.sourceLimitations]};
}
