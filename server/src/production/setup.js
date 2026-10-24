import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {createIdentityService} from '../identity/service.js';
import {loginKey,password} from '../identity/validation.js';
import {productionProfile} from './profile.js';
import {reconcileV1} from '../simple-v1/reconcile.js';
import {today,dcNumber} from '../simple-v1/exact.js';

export const openingTables=['v1_control','v1_items','v1_parties','v1_stock','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands'];
export async function openingFingerprint(db){const data={};for(const table of openingTables)data[table]=(await db(table)).map(r=>JSON.stringify(r)).sort();return createHash('sha256').update(JSON.stringify(data)).digest('hex');}
export async function initializeProduction(db,env,input){
 const profile=productionProfile(env);if(!profile)throw Error('Explicit production profile required');
 if(env.DB_USER!==(profile.staging?'upms_migrator_production_stage':'upms_migrator_production'))throw Error('Dedicated migrator required');
 const date=new Date(input.cutoff+'T00:00:00Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==input.cutoff||input.cutoff>today()||!Number.isInteger(input.nextChallan)||input.nextChallan<1||input.nextChallan>10999||typeof input.reviewReference!=='string'||input.reviewReference.length<8)throw Error('Owner-reviewed cutoff, next challan and reference required');
 loginKey.parse(input.username);password.min(16).parse(input.password);if(!input.displayName?.trim())throw Error('Private administrator identity required');
 const [rows]=await db.raw('SELECT DATABASE() n,CURRENT_USER() a,@@server_id s,@@innodb_force_recovery r');
 if(rows[0].n!==profile.schema||rows[0].a!==env.DB_USER+'@localhost'||String(rows[0].s)!==profile.serverId||Number(rows[0].r)!==0)throw Error('Initialization endpoint mismatch');
 const [tables]=await db.raw('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');if(tables.length)throw Error('Preserve existing/partial database; initialization requires a new empty schema');
 await db.migrate.latest({directory:fileURLToPath(new URL('../../production-migrations/',import.meta.url)),tableName:'upms_production_migrations',loadExtensions:['.js'],disableTransactions:true});
 const operator=await createIdentityService(db).bootstrap({username:input.username,displayName:input.displayName,password:input.password,requirePasswordChange:true});
 await db.transaction(async t=>{
  await t('identity_guard').where({id:1}).forUpdate().first();
  await t('v1_control').where({id:1}).update({operator_id:operator,state:'OPENING',next_dc:input.nextChallan,cutover_evidence:'Opening review pending: '+input.reviewReference});
  await t('production_control').insert({id:1,instance_id:profile.instance,schema_name:profile.schema,runtime_user:profile.user,server_id:profile.serverId,purpose:profile.purpose,operator_id:operator,phase:'OPENING',cutoff_date:input.cutoff,review_reference:input.reviewReference});
 });
 return {schema:profile.schema,operatorId:operator,phase:'OPENING',postingEnabled:false,instance:profile.instance,nextChallan:dcNumber(input.nextChallan)};
}
export async function activateReviewedOpening(db,env,evidence){
 const profile=productionProfile(env);if(!profile||env.DB_USER!==(profile.staging?'upms_migrator_production_stage':'upms_migrator_production'))throw Error('Dedicated release operator required');
 if(!profile.staging&&(!env.UPMS_OWNER_RELEASE_APPROVAL||env.UPMS_OWNER_RELEASE_APPROVAL!==evidence.reviewReference))throw Error('Explicit owner release approval required');
 if(!profile.staging&&(evidence.sourceInstance!==profile.instance||evidence.schema!==profile.schema||!/^upms_restore_production_[a-f0-9]{12}$/.test(evidence.restoreSchema||'')))throw Error('Restore evidence must belong to this production instance');
 if(typeof evidence.reviewReference!=='string'||evidence.reviewReference.length<8||!evidence.restoreVerified||!/^[a-f0-9]{64}$/.test(evidence.backupSha256||''))throw Error('Verified backup/restore evidence required');
 return db.transaction(async t=>{
  await t('identity_guard').where({id:1}).forUpdate().first();const row=await t('production_control').where({id:1}).first();
  if(row?.phase!=='OPENING'||row.instance_id!==profile.instance||evidence.openingFingerprint!==await openingFingerprint(t))throw Error('Stale or incompatible opening evidence');
  const items=await t('v1_items').where({active:true}),parties=await t('v1_parties').where({active:true});
  const stock=await t('v1_stock').whereIn('item_id',items.map(i=>i.id));
  if(!items.length||stock.length!==items.length||parties.some(p=>!p.opening_verified)||stock.some(s=>!s.verified))throw Error('Required openings remain unverified');
  if((await t('v1_documents').where({status:'DRAFT'})).length||(await t('v1_documents').where({status:'POSTED'})).some(d=>!['STOCK_OPENING','CLIENT_OPENING','VENDOR_OPENING'].includes(d.kind))||!(await reconcileV1(t)).matched)throw Error('Opening reconciliation or draft review required');
  await t('production_control').where({id:1}).update({phase:'LIVE',opening_fingerprint:evidence.openingFingerprint,backup_fingerprint:evidence.backupSha256,review_reference:evidence.reviewReference});
  await t('v1_control').where({id:1}).update({state:'READY',cutover_evidence:'Reviewed opening: '+evidence.reviewReference});
  await t('v1_audit').insert({actor_id:row.operator_id,action:'production.opening.approved',reference:profile.instance,reason:evidence.reviewReference+'; backup '+evidence.backupSha256,created_at:new Date()});
  return {phase:'LIVE',postingRequiresSeparateEnvironmentApproval:true,reviewId:randomUUID()};
 });
}
