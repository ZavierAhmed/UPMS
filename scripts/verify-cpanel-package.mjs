import {readFile,writeFile} from 'node:fs/promises';
import {inflateRawSync,crc32} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const path='artifacts/upms-godaddy-cpanel-node22.zip',bytes=await readFile(path),hash=b=>createHash('sha256').update(b).digest('hex'),files=new Map();
assert.equal(hash(bytes),(await readFile(path+'.sha256','utf8')).split(' ')[0]);
let offset=0;while(bytes.readUInt32LE(offset)===0x04034b50){
 const h=bytes.subarray(offset,offset+30),size=h.readUInt32LE(18),length=h.readUInt16LE(26),extra=h.readUInt16LE(28),name=bytes.subarray(offset+30,offset+30+length).toString();
 assert.equal(h.readUInt16LE(8),8);assert.ok(!files.has(name));assert.ok(!name.startsWith('/')&&!name.includes('..')&&!name.includes('\\'));
 const start=offset+30+length+extra,data=inflateRawSync(bytes.subarray(start,start+size));assert.equal(crc32(data),h.readUInt32LE(14));assert.equal(data.length,h.readUInt32LE(22));files.set(name,data);offset=start+size;
}
const manifest=JSON.parse(files.get('deployment-manifest.json')),pkg=JSON.parse(files.get('package.json'));
assert.equal(manifest.kind,'godaddy-cpanel-private-preview-blocked');assert.equal(manifest.providerAccepted,false);assert.equal(manifest.databaseOperationsEnabled,false);
assert.equal(pkg.engines.node,'^22.23.4');assert.equal(pkg.scripts.start,'node server/src/godaddy/index.js');assert.equal(pkg.scripts.build,'node scripts/check-deployment.mjs');
assert.equal(files.size,Object.keys(manifest.files).length+1);for(const [name,digest]of Object.entries(manifest.files))assert.equal(hash(files.get(name)),digest,name);
for(const name of files.keys())assert.ok(!/(?:^|\/)(?:\.env(?:\.|$)|\.local|node_modules|tests|tmp|\.git)(?:\/|$)|\.sql$|\.clixml$|brochure|za.khan/i.test(name),name);
for(const name of ['server/src/simple-v1/challan-returns.js','GODADDY-CPANEL-DATABASE.md','GODADDY-CPANEL-COMPATIBILITY.md','upms.client/dist/management/index.html'])assert.ok(files.has(name),name);
const receiptPath='artifacts/upms-godaddy-cpanel-release-receipt.json',receipt=JSON.parse(await readFile(receiptPath));assert.equal(receipt.sourceCommit,manifest.sourceCommit);assert.equal(receipt.sha256,hash(bytes));
receipt.verification={passed:true,files:files.size,manifestHashes:true,zipCrcs:true,node22:true,blockedEntryPoint:true,privatePathsExcluded:true};await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.info(JSON.stringify(receipt,null,2));
