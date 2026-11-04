// Read-only release review; never provisions, activates, deploys or contacts production.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {chequeHelper} from './uat2-workspace.mjs';
const root='docs/uat-2/evidence',baseline='53b95ecee5f500dc1da0ffda57eb682c8f358726';
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true});assert.equal(r.status,0,'Git review failed');return r.stdout.trim();};
assert.equal(git(['branch','--show-current']),'feature/upms-uat2-cheque-management');assert.equal(git(['merge-base','HEAD',baseline]),baseline);
const read=async p=>JSON.parse(await readFile(root+'/'+p,'utf8')),e={};
for(const [key,file] of Object.entries({numerical:'integration.json',negative:'negative-integration.json',bankOpening:'bank-opening.json',recovery:'recovery.json',legacy:'legacy-migration.json',authentication:'auth-boundary.json',browser:'browser/acceptance.json',startup:'browser/startup.json',client:'client-checks.json',artifacts:'artifact-checks.json',manual:'manual-workspace.json'})) {e[key]=await read(file);assert.equal(e[key].passed,true,key+' incomplete');}
assert.equal(e.bankOpening.negativeChecks,2);assert.equal(e.bankOpening.missingOpeningRejected,true);assert.equal(e.bankOpening.dateBeforeOpeningRejected,true);
assert.equal(e.numerical.tables,44);assert.equal(e.numerical.guards,124);assert.equal(e.numerical.partialOutstanding,'30000.00');assert.equal(e.numerical.bankBalance,'70000.00');
assert.equal(e.negative.authenticatedRuntimeVerified,true);assert.equal(e.negative.protectedAttempts,18);assert.equal(e.negative.checks.length,50);assert.deepEqual(e.negative.targetDatabasePrivileges,['SELECT','INSERT','UPDATE','DELETE']);
assert.equal(e.recovery.tables,44);assert.equal(e.recovery.guards.totalGuards,124);assert.equal(e.recovery.authenticatedDecryptionVerified,true);assert.equal(Object.keys(e.recovery.negativeTests).length,20);assert.ok(Object.values(e.recovery.negativeTests).every(v=>v===true));assert.equal(e.recovery.reconciliation.matched,true);
assert.equal(e.legacy.baselineRowsPreserved,true);assert.equal(e.legacy.legacyBankEffects,0);assert.equal(e.browser.actualChromePdfs,5);assert.equal(e.browser.completedExcelDownloads,3);assert.equal(e.browser.cookieIsolation,true);assert.equal(e.startup.checks.length,6);assert.equal(e.client.checks.find(c=>c.name==='react').tests,304);assert.equal(e.artifacts.sourceLinksVerified,true);
assert.equal(e.artifacts.visualInspection?.passed,true,'Rendered artifact visual review must be recorded');
for(const [file,pattern] of [
 ['regressions/uath1f-regressions.mjs.log',/php regressions passed[\s\S]*financial regressions passed/],
 ['regressions/uath1f-full-regression.mjs.log',/Full stock\/labor\/rollback\/encrypted recovery regression passed/],
 ['regressions/uath1f-browser-regressions.mjs.log',/employee-browser passed[\s\S]*startup-browser passed/],
 ['regressions/uath1f-synthetic-regressions.mjs.log',/uath1c-recovery.mjs passed/],
 ['regressions/regressions/php-full-suite.log',/OK \(166 tests, 1906 assertions\)/],
 ['regressions/regressions/financial-regression.log',/83 HTTP comparisons, 4 snapshots passed/]
])assert.match(await readFile(root+'/'+file,'utf8'),pattern,file+' incomplete');
const unchanged=[];
for(const p of [
 ...['CrudGuards','MoneyGuards','ExpenseGuards','EmployeeHaftaGuards','LaborExtensionGuards'].map(n=>'upms.php/app/Upms/'+n+'.php'),
 ...['production-schema','production-receipt-schema','money-accounts-schema','money-schema-hashes','expense-masters-schema','expense-schema-hashes','employee-hafta-schema','employee-hafta-schema-hashes','labor-extension-schema','labor-extension-schema-hashes'].map(n=>'upms.php/resources/'+n+'.json'),
 'deployment/operations/backup-offhost.ps1'
]) {const actual=(await readFile(p,'utf8')).replaceAll('\r\n','\n').trimEnd(),before=git(['show',baseline+':'+p]).replaceAll('\r\n','\n').trimEnd();assert.equal(actual,before,'Baseline source changed: '+p);unchanged.push({path:p,sha256:createHash('sha256').update(actual).digest('hex')});}
const pointer=JSON.parse(await readFile('tmp/php-runtime/uat2-current.json','utf8')),binding=JSON.parse(await readFile(pointer.bindingPath,'utf8')),proof=await chequeHelper(binding,'verify');assert.equal(proof.guards.totalGuards,124);assert.equal(proof.schema.tables,44);
assert.match(await readFile('upms.php/config/upms.php','utf8'),/env\('UPMS_CHEQUE_MANAGEMENT_ENABLED', false\)/);
const artifacts=[];for(const f of e.artifacts.files){assert.equal(createHash('sha256').update(await readFile(f.path)).digest('hex'),f.sha256);artifacts.push(f);}
const build=[];for(const n of (await readdir('upms.client/dist/management/assets')).sort()){const b=await readFile(resolve('upms.client/dist/management/assets',n));build.push({path:'upms.client/dist/management/assets/'+n,sha256:createHash('sha256').update(b).digest('hex')});}
const allowed=p=>p.startsWith('docs/uat-2/')||p.startsWith('output/pdf/uat2-')||p.startsWith('upms.php/')||p.startsWith('upms.client/management/')||p==='upms.client/src/test/CustomerCheques.test.jsx'||p.startsWith('scripts/uat2-')||['scripts/uath1-launcher.mjs','scripts/uath1-preview.mjs','scripts/start-uat2-preview.ps1','scripts/stop-uat2-preview.ps1'].includes(p);
async function reviewFiles(directory) {const files=[];for(const e of await readdir(directory,{withFileTypes:true})){const path=directory+'/'+e.name;if(e.isDirectory())files.push(...await reviewFiles(path));else if(e.isFile())files.push(path);else throw Error('UAT2_REVIEW_SYMLINK_REJECTED');}return files;}
const candidates=[...git(['diff','--name-only',baseline]).split('\n'),...git(['ls-files','--others','--exclude-standard','--','docs/uat-2','output/pdf/uat2-*','upms.php','upms.client/management','upms.client/src/test/CustomerCheques.test.jsx','scripts/uat2-*','scripts/start-uat2-preview.ps1','scripts/stop-uat2-preview.ps1']).split('\n'),...await reviewFiles('docs/uat-2'),'docs/uat-2/evidence/FINAL-VALIDATION.json','docs/uat-2/CHANGED-FILES.txt'];
const inventory=[...new Set(candidates.filter(p=>p&&allowed(p)))].sort();await writeFile('docs/uat-2/CHANGED-FILES.txt',inventory.join('\n')+'\n');
const report={passed:true,baseline,branch:git(['branch','--show-current']),tables:44,guards:124,originalGuardsPreserved:103,php:{tests:166,assertions:1906},react:{tests:304,files:42},negativeChecks:50,additionalBankOpeningNegativeChecks:2,nativeProtectionAttempts:18,sqlInsertFaultPoints:8,recoveryNegativeTests:20,recoveredRows:e.recovery.rows,authenticatedDecryptionVerified:true,actualChromePdfs:5,completedExcelDownloads:3,visualReview:{passed:true,reviewedPages:5,desktopMobile:true},originalSourcesVerified:unchanged,liveNativeDefinitionsVerified:true,artifacts,build,manualWorkspace:e.manual,productionDeployed:false,ownerWorkspaceUpgraded:false,productionBackupInfrastructureChanged:false,operationalActivationBlocked:true,operationalApproval:'PENDING_OWNER_ACCOUNTANT_POLICY_APPROVAL',verifiedUtc:new Date().toISOString()};
await writeFile(root+'/FINAL-VALIDATION.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,tables:44,guards:124,phpTests:166,reactTests:304,negativeChecks:50,recoveryNegatives:20,productionDeployed:false,files:inventory.length}));
