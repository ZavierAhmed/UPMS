import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {runDeployment,validateDeployment} from '../../diagnostics/godaddy-db/deployment-runner.mjs';
import {claimRun} from '../../diagnostics/godaddy-db/run-state.mjs';
const sha='a'.repeat(40),password='PRIVATE_DEPLOYMENT_CANARY_DO_NOT_LOG';
const valid={NODE_ENV:'production',DB_HOST:'db.fixture.test',DB_PORT:'3306',DB_NAME:'fixture_schema',DB_USER:'fixture_user',DB_PASSWORD:password,
 UPMS_DIAGNOSTIC_MODE:'read-only-once',UPMS_DIAGNOSTIC_LIFECYCLE:'provider-confirmed-one-shot-no-restart',UPMS_DIAGNOSTIC_PERSISTENCE:'private-persistent-exclusive',UPMS_DIAGNOSTIC_SHARED_DATABASE_ACK:'same-app-preview-publish-share-database',
 UPMS_DIAGNOSTIC_RELEASE_SHA:sha,UPMS_DIAGNOSTIC_RUN_ID:'00000000-0000-4000-8000-000000000001',UPMS_DIAGNOSTIC_APP_ID:'fixture-app-identity',UPMS_DIAGNOSTIC_PURPOSE:'existing-readonly-assessment',UPMS_DIAGNOSTIC_REVIEW_REFERENCE:'fixture-review',UPMS_DIAGNOSTIC_STATE_DIR:'/private/state',UPMS_DIAGNOSTIC_EXPECTED_HOST:'db.fixture.test',UPMS_DIAGNOSTIC_EXPECTED_PORT:'3306'};
function harness(){const events=[];return {events,options:{root:'/private/package',nodeVersion:'22.23.4',verify:async()=>events.push('verify'),loadCa:async()=>events.push('ca'),claim:async()=>events.push('claim'),assess:async()=>{events.push('assess');return {status:'COLLECTED',code:'READ_ONLY_OBSERVATIONS_COLLECTED',operationalManagementEnabled:false};},connect:()=>assert.fail('Mock assessment must not contact a database')}};}
const faults=[
 ['mode absent',{UPMS_DIAGNOSTIC_MODE:undefined},'DIAGNOSTIC_MODE_REQUIRED'],['production mode',{UPMS_DIAGNOSTIC_MODE:'production'},'DIAGNOSTIC_MODE_REQUIRED'],
 ['lifecycle unconfirmed',{UPMS_DIAGNOSTIC_LIFECYCLE:'web-service'},'ONE_SHOT_LIFECYCLE_UNCONFIRMED'],['ephemeral storage',{UPMS_DIAGNOSTIC_PERSISTENCE:'ephemeral'},'PRIVATE_PERSISTENCE_UNCONFIRMED'],
 ['sharing unacknowledged',{UPMS_DIAGNOSTIC_SHARED_DATABASE_ACK:''},'SHARED_DATABASE_ACK_REQUIRED'],['missing password',{DB_PASSWORD:''},'MISSING_CREDENTIALS'],['missing private state',{UPMS_DIAGNOSTIC_STATE_DIR:''},'PRIVATE_STATE_UNSAFE'],
 ['wrong host',{DB_HOST:'wrong.fixture.test'},'WRONG_HOST'],['unexpected DB fallback',{DB_FALLBACK_HOST:'private-canary'},'UNEXPECTED_DATABASE_ENVIRONMENT'],
 ['unexpected diagnostic bypass',{UPMS_DIAGNOSTIC_SKIP_TLS:'true'},'UNEXPECTED_DIAGNOSTIC_ENVIRONMENT'],['live posting flag',{UPMS_PRODUCTION_POSTING:'owner-approved'},'OPERATIONAL_CONFIGURATION_REJECTED'],
 ['management flag even false',{MANAGEMENT_ENABLED:'false'},'OPERATIONAL_CONFIGURATION_REJECTED'],['legacy profile',{UPMS_DATABASE_PROFILE:'local-mysql'},'OPERATIONAL_CONFIGURATION_REJECTED'],
 ['alternate URL',{DATABASE_URL:'mysql://secret-user:'+password+'@host/schema'},'OPERATIONAL_CONFIGURATION_REJECTED'],['invalid release',{UPMS_DIAGNOSTIC_RELEASE_SHA:'other'},'RELEASE_IDENTITY_MISMATCH'],
 ['missing review',{UPMS_DIAGNOSTIC_REVIEW_REFERENCE:''},'DIAGNOSTIC_REVIEW_REQUIRED'],['missing app identity',{UPMS_DIAGNOSTIC_APP_ID:''},'DIAGNOSTIC_REVIEW_REQUIRED'],['trust-all',{NODE_TLS_REJECT_UNAUTHORIZED:'0'},'UNSAFE_TLS_ENVIRONMENT']
];
for(const [name,patch,code]of faults)test('controlled startup rejects '+name+' before marker or database access',async()=>{const h=harness(),r=await runDeployment({...valid,...patch},h.options);assert.equal(r.status,'BLOCKED');assert.equal(r.code,code);assert.equal(r.execution.runConsumed,false);assert.deepEqual(h.events,[]);assert.ok(!JSON.stringify(r).includes(password));assert.equal(r.operationalManagementEnabled,false);});
test('actual Node version and unsupported runtime are reported without connecting',async()=>{const h=harness(),r=await runDeployment(valid,{...h.options,nodeVersion:'26.4.0'});assert.equal(r.code,'NODE_22_23_4_REQUIRED');assert.equal(r.execution.node,'26.4.0');assert.deepEqual(h.events,[]);assert.throws(()=>validateDeployment(valid,'22.23.3'));});
test('ordered gates verify release and CA, consume run, then call the existing read-only assessor',async()=>{const h=harness(),r=await runDeployment(valid,h.options);assert.deepEqual(h.events,['verify','ca','claim','assess']);assert.equal(r.status,'COLLECTED');assert.equal(r.execution.runConsumed,true);assert.equal(r.execution.sharedDatabaseAcknowledged,true);assert.equal(r.execution.httpListener,false);assert.equal(r.staging.productionIsolation,'UNVERIFIED_REQUIRES_DISTINCT_APP_DATABASE_CREDENTIALS_AND_RECEIPTS');assert.ok(!JSON.stringify(r).includes(valid.UPMS_DIAGNOSTIC_APP_ID));});
test('release failure and private CA error cannot create marker or reach the database',async()=>{
 for(const [key,code]of [['verify','RELEASE_INTEGRITY_FAILED'],['loadCa','PRIVATE_CA_UNAVAILABLE']]){const h=harness(),r=await runDeployment(valid,{...h.options,[key]:async()=>{throw Object.assign(Error(password),{diagnosticCode:code});}});assert.equal(r.code,code);assert.ok(!h.events.includes('claim'));assert.ok(!h.events.includes('assess'));assert.ok(!JSON.stringify(r).includes(password));}
});
test('already consumed attempt skips without assessor; unknown filesystem errors have no raw log output',async()=>{
 for(const [error,expected]of [[Object.assign(Error(password),{diagnosticCode:'DIAGNOSTIC_RUN_ALREADY_CONSUMED'}),'DIAGNOSTIC_RUN_ALREADY_CONSUMED'],[Error('mysql://user:'+password+'@host/schema'),'DEPLOYMENT_DIAGNOSTIC_BLOCKED']]){const h=harness(),r=await runDeployment(valid,{...h.options,claim:async()=>{throw error;}});assert.equal(r.code,expected);assert.ok(!h.events.includes('assess'));assert.ok(!JSON.stringify(r).includes(password));assert.ok(!JSON.stringify(r).includes('mysql://'));}
});
test('real exclusive marker allows one concurrent claimant and prevents restart replay',async()=>{
 const base=await mkdtemp(join(tmpdir(),'upms-oneshot-')),root=join(base,'app'),directory=join(base,'private-state');await mkdir(root,{mode:0o700});await mkdir(directory,{mode:0o700});
 const input={directory,root,appId:valid.UPMS_DIAGNOSTIC_APP_ID,runId:valid.UPMS_DIAGNOSTIC_RUN_ID,release:sha};
 const results=await Promise.allSettled(Array.from({length:8},()=>claimRun(input)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(results.filter(r=>r.status==='rejected').every(r=>r.reason.diagnosticCode==='DIAGNOSTIC_RUN_ALREADY_CONSUMED'));
 const files=await readdir(directory);assert.equal(files.length,1);const marker=await readFile(join(directory,files[0]),'utf8');assert.equal(marker,'READ_ONLY_RUN_CONSUMED\n');assert.ok(!marker.includes(password));assert.ok(!files[0].includes(valid.UPMS_DIAGNOSTIC_APP_ID));
 await assert.rejects(claimRun(input),e=>e.diagnosticCode==='DIAGNOSTIC_RUN_ALREADY_CONSUMED');if(process.platform!=='win32')assert.equal((await lstat(join(directory,files[0]))).mode&0o777,0o600);
});
test('state directory must exist outside package and public trees; relative and missing paths fail closed',async()=>{
 const base=await mkdtemp(join(tmpdir(),'upms-state-')),root=join(base,'app');await mkdir(root,{mode:0o700});const inside=join(root,'state');await mkdir(inside,{mode:0o700});const outsidePublic=join(base,'public');await mkdir(outsidePublic,{mode:0o700});
 for(const directory of [root,inside,outsidePublic,'relative-state'])await assert.rejects(claimRun({directory,root,appId:'app',runId:'run',release:sha}),e=>e.diagnosticCode==='PRIVATE_STATE_UNSAFE');
 await assert.rejects(claimRun({directory:join(base,'absent'),root,appId:'app',runId:'run',release:sha}),e=>e.diagnosticCode==='PRIVATE_STATE_UNAVAILABLE');
});
test('assessment failure still consumes the one-shot marker; an automatic retry never reconnects',async()=>{
 const base=await mkdtemp(join(tmpdir(),'upms-retry-')),root=join(base,'app'),directory=join(base,'state');await mkdir(root,{mode:0o700});await mkdir(directory,{mode:0o700});const h=harness();let calls=0;
 const options={...h.options,root,claim:claimRun,assess:async()=>{calls++;return {status:'BLOCKED',code:'TLS_VERIFICATION_FAILED',operationalManagementEnabled:false};}};
 const first=await runDeployment({...valid,UPMS_DIAGNOSTIC_STATE_DIR:resolve(directory)},options);assert.equal(first.code,'TLS_VERIFICATION_FAILED');assert.equal(first.execution.runConsumed,true);
 const retry=await runDeployment({...valid,UPMS_DIAGNOSTIC_STATE_DIR:resolve(directory)},options);assert.equal(retry.code,'DIAGNOSTIC_RUN_ALREADY_CONSUMED');assert.equal(retry.status,'SKIPPED');assert.equal(calls,1);
});
