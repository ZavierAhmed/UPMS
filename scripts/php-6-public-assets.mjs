import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(await readFile('docs/php-migration/PHP-5-PUBLIC-ASSETS.json','utf8'));
const hashes={};
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){if(directory==='upms.client/dist'&&entry.name==='management')continue;const path=directory+'/'+entry.name;if(entry.isDirectory())await walk(path);else hashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');}}
await walk('upms.client/dist');assert.equal(Object.keys(hashes).length,111);assert.deepEqual(hashes,baseline.hashes);
await writeFile('docs/php-migration/PHP-6-PUBLIC-ASSETS.json',JSON.stringify({files:111,sha256Identical:true,frontendSourceChanges:false,baseline:'PHP-5-PUBLIC-ASSETS.json',hashes},null,2)+'\n');console.log('111 public files hash-identical');
