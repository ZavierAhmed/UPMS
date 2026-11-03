// Presentation only. Immutable official numbers, IDs and payload references remain canonical.
export function challanDisplayNumber(document) {
  if(document.kind==='CHALLAN'&&document.payload?.customChallanNumber) return document.payload.customChallanNumber.trim().toUpperCase();
  return document.official_number||`${document.status==='POSTED'?'Entry':'Draft'} ${document.id??document.document_id??''}`;
}
export function sourceChallanDisplayNumber(document, documents=[]) {
  const source=documents.find(d=>String(d.id)===String(document.payload?.originalId)&&d.kind==='CHALLAN');
  return source?challanDisplayNumber(source):document.originalDisplayNumber||document.payload?.originalReference||'Original challan';
}
export function documentReference(document) {
  return document.kind==='CHALLAN'?challanDisplayNumber(document):document.official_number||document.payload?.reference||`${document.status==='POSTED'?'Entry':'Draft'} ${document.id}`;
}
export const reportReference=row=>row.displayReference||row.reference;
export const reportParticulars=row=>row.displayParticulars||row.particulars;
