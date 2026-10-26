// Controlled startup only. Does not import an operational app or an HTTP module.
import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {connectionOptions,diagnose} from './diagnostic.mjs';
import {claimRun} from './run-state.mjs';
import {verifyRelease} from './verify-release.mjs';

const dbKeys=new Set(['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD']);
const diagnosticKeys=new Set(['UPMS_DIAGNOSTIC_MODE','UPMS_DIAGNOSTIC_LIFECYCLE','UPMS_DIAGNOSTIC_PERSISTENCE','UPMS_DIAGNOSTIC_SHARED_DATABASE_ACK','UPMS_DIAGNOSTIC_RELEASE_SHA','UPMS_DIAGNOSTIC_RUN_ID','UPMS_DIAGNOSTIC_APP_ID','UPMS_DIAGNOSTIC_PURPOSE','UPMS_DIAGNOSTIC_REVIEW_REFERENCE','UPMS_DIAGNOSTIC_STATE_DIR','UPMS_DIAGNOSTIC_EXPECTED_HOST','UPMS_DIAGNOSTIC_EXPECTED_PORT','UPMS_DIAGNOSTIC_CA_FILE']);
const forbidden=new Set(['MANAGEMENT_ENABLED','MANAGEMENT_LOCAL_HTTP','UPMS_SIMPLE_V1','UPMS_SIMPLE_V1_SYNTHETIC','UPMS_DATABASE_PROFILE','UPMS_PRODUCTION_POSTING','UPMS_PRODUCTION_PURPOSE','UPMS_PRODUCTION_INSTANCE','UPMS_OPERATION_APPROVAL','UPMS_ADMIN_PASSWORD','SESSION_SECRET','DATABASE_URL','MYSQL_URL','MYSQL_PWD']);
const knownErrors=new Set(['NODE_22_23_4_REQUIRED','PRODUCTION_ENVIRONMENT_REQUIRED','DIAGNOSTIC_MODE_REQUIRED','ONE_SHOT_LIFECYCLE_UNCONFIRMED','PRIVATE_PERSISTENCE_UNCONFIRMED','SHARED_DATABASE_ACK_REQUIRED','DIAGNOSTIC_REVIEW_REQUIRED','UNEXPECTED_DATABASE_ENVIRONMENT','UNEXPECTED_DIAGNOSTIC_ENVIRONMENT','OPERATIONAL_CONFIGURATION_REJECTED','RELEASE_IDENTITY_MISMATCH','RELEASE_INTEGRITY_FAILED','PRIVATE_STATE_UNAVAILABLE','PRIVATE_STATE_UNSAFE','DIAGNOSTIC_RUN_ALREADY_CONSUMED','PRIVATE_CA_UNAVAILABLE']);
const stop=code=>{const e=new Error(code);e.diagnosticCode=code;throw e;};
export function validateDeployment(env,nodeVersion){
 const [major,minor,patch]=nodeVersion.split('.').map(Number);
 if(major!==22||minor<23||minor===23&&patch<4)stop('NODE_22_23_4_REQUIRED');
 if(env.NODE_ENV!=='production')stop('PRODUCTION_ENVIRONMENT_REQUIRED');
 if(env.UPMS_DIAGNOSTIC_MODE!=='read-only-once')stop('DIAGNOSTIC_MODE_REQUIRED');
 if(env.UPMS_DIAGNOSTIC_LIFECYCLE!=='provider-confirmed-one-shot-no-restart')stop('ONE_SHOT_LIFECYCLE_UNCONFIRMED');
 if(env.UPMS_DIAGNOSTIC_PERSISTENCE!=='private-persistent-exclusive')stop('PRIVATE_PERSISTENCE_UNCONFIRMED');
 if(env.UPMS_DIAGNOSTIC_SHARED_DATABASE_ACK!=='same-app-preview-publish-share-database')stop('SHARED_DATABASE_ACK_REQUIRED');
 for(const key of Object.keys(env)){
  if(key.startsWith('DB_')&&!dbKeys.has(key))stop('UNEXPECTED_DATABASE_ENVIRONMENT');
  if(key.startsWith('UPMS_DIAGNOSTIC_')&&!diagnosticKeys.has(key))stop('UNEXPECTED_DIAGNOSTIC_ENVIRONMENT');
  if(forbidden.has(key)||key.startsWith('UPMS_PRODUCTION_'))stop('OPERATIONAL_CONFIGURATION_REJECTED');
 }
 if(!/^[0-9a-f]{40}$/.test(env.UPMS_DIAGNOSTIC_RELEASE_SHA||''))stop('RELEASE_IDENTITY_MISMATCH');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.UPMS_DIAGNOSTIC_RUN_ID||'')||
  !/^[A-Za-z0-9_-]{8,128}$/.test(env.UPMS_DIAGNOSTIC_APP_ID||'')||!/^[A-Za-z0-9_-]{8,128}$/.test(env.UPMS_DIAGNOSTIC_REVIEW_REFERENCE||'')||
  !['existing-readonly-assessment','isolated-synthetic-staging'].includes(env.UPMS_DIAGNOSTIC_PURPOSE))stop('DIAGNOSTIC_REVIEW_REQUIRED');
 // The existing exact endpoint, credential and TLS checks also run before consuming a marker.
 if(!env.UPMS_DIAGNOSTIC_STATE_DIR)stop('PRIVATE_STATE_UNSAFE');
 connectionOptions(env);
}
export async function loadPrivateCa(env){
 if(!env.UPMS_DIAGNOSTIC_CA_FILE)return undefined;
 try{const file=env.UPMS_DIAGNOSTIC_CA_FILE;if((await stat(file)).size>262144)throw Error();const ca=await readFile(file,'utf8');connectionOptions(env,ca);return ca;}catch{stop('PRIVATE_CA_UNAVAILABLE');}
}
export async function runDeployment(env,{connect,root,nodeVersion=process.versions.node,verify=verifyRelease,claim=claimRun,loadCa=loadPrivateCa,assess=diagnose}={}){
 const execution={mode:'CONTROLLED_READ_ONLY_ONE_SHOT',node:nodeVersion,httpListener:false,sharedDatabaseAcknowledged:false,runConsumed:false,appIdentitySource:'OPERATOR_REVIEW_NOT_PROVIDER_ATTESTED'};
 const blocked=code=>({formatVersion:1,status:code==='DIAGNOSTIC_RUN_ALREADY_CONSUMED'?'SKIPPED':'BLOCKED',code,execution,operationalManagementEnabled:false,compatibility:{verdict:'NOT_APPROVED',productionInitializationAllowed:false}});
 try{
  validateDeployment(env,nodeVersion);execution.sharedDatabaseAcknowledged=true;
  await verify(root,env.UPMS_DIAGNOSTIC_RELEASE_SHA);
  const ca=await loadCa(env);
  await claim({directory:env.UPMS_DIAGNOSTIC_STATE_DIR,root,appId:env.UPMS_DIAGNOSTIC_APP_ID,runId:env.UPMS_DIAGNOSTIC_RUN_ID,release:env.UPMS_DIAGNOSTIC_RELEASE_SHA});
  execution.runConsumed=true;execution.release=env.UPMS_DIAGNOSTIC_RELEASE_SHA;execution.runIdentityHash=createHash('sha256').update(JSON.stringify([env.UPMS_DIAGNOSTIC_APP_ID,env.UPMS_DIAGNOSTIC_RUN_ID,env.UPMS_DIAGNOSTIC_RELEASE_SHA])).digest('hex');execution.appIdentityHash=createHash('sha256').update(env.UPMS_DIAGNOSTIC_APP_ID).digest('hex');
  const result=await assess(env,{connect,ca});
  return {...result,execution,staging:{declaredPurpose:env.UPMS_DIAGNOSTIC_PURPOSE,productionIsolation:'UNVERIFIED_REQUIRES_DISTINCT_APP_DATABASE_CREDENTIALS_AND_RECEIPTS'}};
 }catch(error){return blocked(knownErrors.has(error?.diagnosticCode)?error.diagnosticCode:['MISSING_CREDENTIALS','EXPECTED_ENDPOINT_REQUIRED','INVALID_ENDPOINT','WRONG_HOST','WRONG_PORT','DNS_TLS_HOST_REQUIRED','UNSAFE_TLS_ENVIRONMENT'].includes(error?.diagnosticCode)?error.diagnosticCode:'DEPLOYMENT_DIAGNOSTIC_BLOCKED');}
}
