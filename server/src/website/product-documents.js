import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
// A narrow allowlist: source brochures and arbitrary uploaded files are never served.
export function productDocuments(root) {
 const manifestPath=resolve(root,'product-documents.json');
 if(!existsSync(manifestPath)) return new Map(); // Compatibility with earlier releases.
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 const ids=['buckets','cans','containers','stickers','cartons'];
 if(![1,2].includes(manifest.version)||Object.keys(manifest.documents||{}).sort().join()!==[...ids].sort().join())throw Error('Invalid product document manifest');
 const retained=Object.entries(manifest.retainedDocuments||{});
 if(retained.some(([id])=>!['buckets','cans','containers'].includes(id)))throw Error('Invalid retained product document');
 return new Map([...ids.map(id=>[id,manifest.documents[id],false]),...retained.map(([id,doc])=>[id,doc,true])].map(([id,doc,legacy])=>{
  const original=`unique-plastic-${id}-product-information.pdf`;
  const supplied=id==='buckets'?['/downloads/products/v2/Bucket.pdf','Bucket.pdf']:['/downloads/products/v2/Company_Profile_New_HD_Bottles.pdf','Company_Profile_New_HD_Bottles (1).pdf'];
  const generated=doc.filename===original&&doc.url===`/downloads/products/v1/${original}`;
  const catalog=!legacy&&['buckets','cans','containers'].includes(id)&&doc.url===supplied[0]&&doc.filename===supplied[1];
  if(!(generated||catalog)||doc.mime!=='application/pdf'||!Number.isSafeInteger(doc.bytes)||!/^[a-f0-9]{64}$/.test(doc.sha256))throw Error('Invalid product document entry');
  const file=resolve(root,doc.url.slice(1)),bytes=readFileSync(file);
  if(bytes.length!==doc.bytes||bytes.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(bytes).digest('hex')!==doc.sha256)throw Error('Product PDF integrity check failed');
  return [doc.url,{...doc,file}];
 }));
}
export function productDownloadHeaders(doc) {
 return {'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${doc.filename}"`,'Content-Length':String(doc.bytes),'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'};
}
