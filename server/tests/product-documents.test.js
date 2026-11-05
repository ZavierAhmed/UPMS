import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fixture} from './helpers.js';
import {productDocuments} from '../src/website/product-documents.js';
const manifest=JSON.parse(readFileSync('upms.client/public/product-documents.json','utf8'));
for(const [id,doc] of Object.entries(manifest.documents))test('verified PDF attachment and category link '+id,async()=>{
 const api=fixture({management:null}).api;
 const r=await api.get(doc.url).set('Host','localhost');
 assert.equal(r.status,200);assert.equal(r.headers['content-type'],'application/pdf');assert.equal(r.headers['content-disposition'],`attachment; filename="${doc.filename}"`);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.equal(r.body.length,doc.bytes);assert.equal(createHash('sha256').update(r.body).digest('hex'),doc.sha256);
 assert.equal((await api.head(doc.url).set('Host','localhost')).status,200);
 assert.equal((await api.post(doc.url).set('Host','localhost')).status,405);
 const page=await api.get('/products/'+id).set('Host','localhost');assert.equal(page.status,200);assert.ok(page.text.includes(doc.url));assert.ok(page.text.includes('Download Product PDF'));
});
test('unknown/private/traversal download paths are not published; foreign Host remains denied',async()=>{
 const api=fixture({management:null}).api;
 for(const path of ['/downloads/products/v1/Bucket.pdf','/product-documents.json','/downloads/products/v1/private.pdf','/downloads/products/v1/%2e%2e/private.pdf','/downloads/products/v1/unique-plastic-stickers-product-information.pdf.bak'])assert.equal((await api.get(path).set('Host','localhost')).status,404);
 assert.equal((await api.get(manifest.documents.buckets.url).set('Host','attacker.invalid')).status,400);
});
test('manifest rejects path substitution, missing files and byte tampering',()=>{
 const root=mkdtempSync(resolve(tmpdir(),'upms-pdf-integrity-'));
 try{
  assert.equal(productDocuments(root).size,0);
  const copy=structuredClone(manifest);copy.documents.buckets.url='/downloads/../../private.pdf';writeFileSync(resolve(root,'product-documents.json'),JSON.stringify(copy));assert.throws(()=>productDocuments(root),/Invalid product document entry/);
  writeFileSync(resolve(root,'product-documents.json'),JSON.stringify(manifest));assert.throws(()=>productDocuments(root),/ENOENT/);
  mkdirSync(resolve(root,'downloads/products/v1'),{recursive:true});
  for(const doc of Object.values(manifest.documents))writeFileSync(resolve(root,'downloads/products/v1',doc.filename),readFileSync('upms.client/public'+doc.url));
  assert.equal(productDocuments(root).size,5);
  writeFileSync(resolve(root,'downloads/products/v1',manifest.documents.buckets.filename),'%PDF-tampered');assert.throws(()=>productDocuments(root),/integrity/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
