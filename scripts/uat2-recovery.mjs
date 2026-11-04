import {readFile,writeFile} from 'node:fs/promises';
import {chequeHelper} from './uat2-workspace.mjs';
const p=JSON.parse(await readFile('tmp/php-runtime/uat2-current.json','utf8')),binding=JSON.parse(await readFile(p.bindingPath,'utf8'));
const result=await chequeHelper(binding,'recovery');
await writeFile('docs/uat-2/evidence/recovery.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,tables:result.tables,guards:result.guards.totalGuards,negativeTests:Object.keys(result.negativeTests).length,authenticatedDecryptionVerified:result.authenticatedDecryptionVerified}));
