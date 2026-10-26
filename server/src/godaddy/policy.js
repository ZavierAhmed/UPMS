import {checkServerIdentity} from 'node:tls';
import {isIP} from 'node:net';
import {validateEngine} from '../identity/engine.js';
import {productionRuntimePrivileges,summarizeGrant} from '../identity/grants.js';
import {remoteProfile,remoteTarget} from '../development/remote.js';

export const previewHostname='2idp3wfsef.preview.c35.airoapp.ai';
export const compatibilityBlockers=Object.freeze([
  'NODE_PATCH_UNVERIFIED','MYSQL_ENGINE_UNVERIFIED','DATABASE_ENDPOINT_UNVERIFIED',
  'DATABASE_TLS_UNVERIFIED','PREVIEW_PUBLISH_ISOLATION_UNVERIFIED',
  'RESTRICTED_ACCOUNTS_UNVERIFIED','BACKUP_RESTORE_UNVERIFIED',
  'PRIVATE_STORAGE_UNVERIFIED','PROXY_PEERS_UNVERIFIED',
]);
export function blocked(){const error=new Error('GoDaddy managed database compatibility is unverified; database operations are blocked.');error.code='GODADDY_COMPATIBILITY_BLOCKED';return error;}
// No provider endpoint has been approved. Environment variables are not acceptance evidence.
export function assertDatabaseProfile(env=process.env){
  if(env.UPMS_DATABASE_PROFILE===remoteProfile){remoteTarget(env);return;}
  if(env.UPMS_DATABASE_PROFILE&&env.UPMS_DATABASE_PROFILE!=='local-mysql'){
    if(['godaddy-managed','godaddy-cpanel'].includes(env.UPMS_DATABASE_PROFILE))throw blocked();
    throw new Error('Unknown database profile');
  }
}

// Assessment building blocks only: not an activation path and not wired to a live pool.
// A future reviewed provider acceptance must supply independently collected observations.
export function assessIsolation(preview,publish){
  if(!preview||!publish||!preview.controlPlaneReference||!publish.controlPlaneReference||
    !preview.databaseId||!publish.databaseId||preview.databaseId===publish.databaseId||
    !preview.schema||!publish.schema||!preview.serverUuid||!publish.serverUuid||
    preview.serverUuid===publish.serverUuid&&preview.schema===publish.schema||
    !preview.user||!publish.user||preview.user===publish.user||
    preview.crossDatabaseAccessDenied!==true||publish.crossDatabaseAccessDenied!==true||
    preview.secretScope!=='preview-only'||publish.secretScope!=='publish-only')throw blocked();
  return {isolated:true,productionPostingAllowed:false};
}
export function verifiedTlsOptions(host,approvedHost,ca){
  if(host!==approvedHost||!host||isIP(host)||host!==host.toLowerCase()||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/.test(host)||
    /(^|\.)(localhost|invalid|local)$/.test(host)||typeof ca!=='string'||
    !ca.includes('-----BEGIN CERTIFICATE-----')||!ca.includes('-----END CERTIFICATE-----'))throw blocked();
  return {ca,rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2'};
}
export function assertTlsSession(stream,host){
  if(!stream?.encrypted||stream.authorized!==true||!stream.getPeerCertificate||
    !['TLSv1.2','TLSv1.3'].includes(stream.getProtocol?.())||
    checkServerIdentity(host,stream.getPeerCertificate()))throw blocked();
}
export function verifyManagedRuntimeGrants(rows,schema,account,expectedAccount){
  if(!schema||!expectedAccount||account!==expectedAccount||!account.includes('@')||
    /^root@/i.test(account))throw blocked();
  const found=new Map();
  for(const row of rows){
    const grant=summarizeGrant(row);
    if(grant.unsupported)throw blocked();
    if(grant.scope==='*.*'&&grant.privileges.length===1&&grant.privileges[0]==='USAGE')continue;
    const [database,table,extra]=grant.scope.split('.');
    if(database!==schema||extra||!productionRuntimePrivileges[table]||
      grant.privileges.some(p=>!productionRuntimePrivileges[table].includes(p)))throw blocked();
    const rights=found.get(table)||new Set();grant.privileges.forEach(p=>rights.add(p));found.set(table,rights);
  }
  for(const [table,rights]of Object.entries(productionRuntimePrivileges))
    if(!rights.every(p=>found.get(table)?.has(p)))throw blocked();
  return {verified:true,productionPostingAllowed:false};
}
export function verifyManagedIdentity(actual,expected){
  if(!expected?.serverUuid||!expected.schema||!expected.account||!expected.version||
    actual.serverUuid!==expected.serverUuid||actual.schema!==expected.schema||
    actual.account!==expected.account||actual.version!==expected.version||
    String(actual.serverId)!==String(expected.serverId)||!expected.serverId||
    Number(actual.port)!==Number(expected.port)||!expected.port||
    Number(actual.forceRecovery)!==0||Number(actual.readOnly)!==0||!actual.sslCipher)throw blocked();
  validateEngine(actual.version,{NODE_ENV:'production'});
  return {verified:true,productionPostingAllowed:false};
}
