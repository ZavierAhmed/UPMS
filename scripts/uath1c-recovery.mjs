// Authenticated encrypted recovery exercise in a positively identified synthetic engine only.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {extensionHelper} from './uath1c-workspace.mjs';
await verifyUatEngine();
const binding=JSON.parse(await readFile('tmp/php-runtime/uath1c-latest.json','utf8'));
assert.match(binding.directory,/uath1c-\d+$/);
for(const name of ['owner-uat-binding','uath1-owner-binding']) {
 const owner=JSON.parse(await readFile('tmp/php-runtime/'+name+'.json','utf8'));assert.notEqual(binding.schema,owner.schema);
}
const result=await extensionHelper(binding,'recovery');
assert.equal(result.passed,true);assert.equal(result.tables,38);assert.equal(result.guards.totalGuards,103);
await writeFile('docs/uat-h1c/evidence/recovery.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:true,tables:38,guards:103,rows:result.rows,negativeTests:result.negativeTests,authenticatedDecryptionVerified:result.authenticatedDecryptionVerified}));
