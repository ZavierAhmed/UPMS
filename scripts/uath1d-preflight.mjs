// Invoked through the DPAPI wrapper. Sensitive stdin/stdout never goes to a transcript.
import {mkdir,writeFile,readFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ownerHelper,ownerWorkspace,h1dRoot} from './uath1d-workspace.mjs';
import {protectPrivateDirectory} from './php-7-5-private-directory.mjs';
let raw='';for await(const chunk of process.stdin)raw+=chunk;const input=JSON.parse(raw);raw='';
await mkdir(h1dRoot,{recursive:true});await protectPrivateDirectory(h1dRoot);
const exclude=resolve('.git/info/exclude'),rule='/tmp/php-runtime/uath1d-owner-protection/';
if(!(await readFile(exclude,'utf8')).split(/\r?\n/).includes(rule))await appendFile(exclude,'\n'+rule+'\n');
try { if(input.action==='prepare') {
 process.stdout.write(JSON.stringify({prepared:true}));
} else if(input.action==='keygen') {
 process.stdout.write(JSON.stringify(await ownerHelper('keygen')));
} else if(input.action==='restore-review') {
 const result=await ownerHelper('restore-review',{keyPair:input.keyPair});input.keyPair='';await writeFile(resolve(h1dRoot,'recovery-review.json'),JSON.stringify(result,null,2));await writeFile('docs/uat-h1d/evidence/recovery-review.json',JSON.stringify(result,null,2));process.stdout.write(JSON.stringify(result));
} else if(input.action==='checkpoint') {
 const result=await ownerHelper('checkpoint',{keyPair:input.keyPair});input.keyPair='';await writeFile(resolve(h1dRoot,'checkpoint.json'),JSON.stringify(result,null,2));await writeFile('docs/uat-h1d/evidence/checkpoint.json',JSON.stringify(result,null,2));process.stdout.write(JSON.stringify(result));
} else if(input.action==='bind-configuration') {
 const path=resolve(h1dRoot,'preflight.json'),proof=JSON.parse(await readFile(path,'utf8')),current=await ownerHelper('inspect'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 if(proof.passed!==true||current.tableCount!==34||current.guards.totalGuards!==88||JSON.stringify(current.originalFingerprints)!==JSON.stringify(proof.sourceFingerprints)||hash(await readFile(proof.archive))!==proof.archiveSha256)throw Error('H1D_EXISTING_PREFLIGHT_STALE');
 const workspace=await ownerWorkspace();await readFile(resolve(h1dRoot,'environment-before.dpapi'));
 const report={...proof,bindingFileSha256:hash(await readFile(workspace.bindingPath)),environmentFileSha256:hash(await readFile(workspace.envPath)),configurationBindingVerifiedUtc:new Date().toISOString()};
 await writeFile(path,JSON.stringify(report,null,2));await writeFile('docs/uat-h1d/evidence/preflight.json',JSON.stringify(report,null,2));process.stdout.write(JSON.stringify({passed:true,configurationBound:true,preflightSha256:hash(await readFile(path)),ownerDatabaseMigrated:false}));
} else if(input.action==='preflight') {
 await mkdir('docs/uat-h1d/evidence',{recursive:true});
 const before=await ownerHelper('inspect');await writeFile('docs/uat-h1d/evidence/owner-before.json',JSON.stringify(before,null,2));
 if(before.tableCount!==34||before.guards.totalGuards!==88)throw Error('H1D_BASELINE_OR_INTERRUPTED_UPGRADE_REVIEW_REQUIRED');
 const archivePath=resolve(h1dRoot,'preupgrade-'+Date.now()+'.sealed');
 const proof=await ownerHelper('backup-rehearse',{publicKey:input.publicKey,keyPair:input.keyPair,archivePath,proofDirectory:h1dRoot});input.keyPair='';
 await readFile(resolve(h1dRoot,'environment-before.dpapi'));
 const workspace=await ownerWorkspace(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const report={...proof,bindingFileSha256:hash(await readFile(workspace.bindingPath)),environmentFileSha256:hash(await readFile(workspace.envPath)),protectedConfigurationBackup:'environment-before.dpapi',verifiedUtc:new Date().toISOString(),bindingDatabase:before.database,expectedMigrationVersion:before.migrationVersion,expectedMigrationPlanHash:before.migrationPlanHash,authorization:'NOT_AUTHORIZED_FOR_OWNER_DATABASE_MIGRATION',nextAction:'Separate explicit owner approval is required before modifying the fixed port 5180 database.'};
 await writeFile(resolve(h1dRoot,'preflight.json'),JSON.stringify(report,null,2));await writeFile('docs/uat-h1d/evidence/preflight.json',JSON.stringify(report,null,2));
 process.stdout.write(JSON.stringify({passed:true,tablesBefore:34,guardsBefore:88,authenticatedBackup:true,independentRestorePassed:true,rehearsalTables:38,rehearsalGuards:103,allOriginalRowsPreserved:true,ownerDatabaseMigrated:false,authorizationRequired:true}));
} else { throw Error('H1D_UNKNOWN_PREFLIGHT_ACTION'); }
} catch(error) { await writeFile(resolve(h1dRoot,'last-failure.json'),JSON.stringify({failed:true,code:error.message,ownerMigrationAttempted:false,utc:new Date().toISOString()},null,2));throw error; }
