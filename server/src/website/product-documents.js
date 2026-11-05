import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
// A narrow allowlist: source brochures and arbitrary uploaded files are never served.
export function productDocuments(root) {
 const manifestPath=resolve(root,'product-documents.json');
 if(!existsSync(manifestPath)) return new Map(); // Compatibility with earlier releases.
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 const ids=['buckets','cans','containers','stickers','cartons'];
 if(manifest.version!==1||Object.keys(manifest.documents||{}).sort().join()!==[...ids].sort().join())throw Error('Invalid product document manifest');
 return new Map(ids.map(id=>{
  const doc=manifest.documents[id],filename=`unique-plastic-${id}-product-information.pdf`;
  if(doc.filename!==filename||doc.url!==`/downloads/products/v1/${filename}`||doc.mime!=='application/pdf'||!Number.isSafeInteger(doc.bytes)||!/^[a-f0-9]{64}$/.test(doc.sha256))throw Error('Invalid product document entry');
  const file=resolve(root,'downloads/products/v1',filename),bytes=readFileSync(file);
  if(bytes.length!==doc.bytes||bytes.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(bytes).digest('hex')!==doc.sha256)throw Error('Product PDF integrity check failed');
  return [doc.url,{...doc,file}];
 }));
}
export function productDownloadHeaders(doc) {
 return {'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${doc.filename}"`,'Content-Length':String(doc.bytes),'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'};
}
