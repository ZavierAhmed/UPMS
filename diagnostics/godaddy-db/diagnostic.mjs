// Standalone diagnostic. No operational app imports, pool, HTTP server or SQL writes.
import {isIP} from 'node:net';
import {checkServerIdentity,createSecureContext} from 'node:tls';

export const limits=Object.freeze({connectMs:3000,queryMs:2000,totalMs:15000});
const stop=code=>{const error=new Error(code);error.diagnosticCode=code;throw error;};
const codes=new Set(['MISSING_CREDENTIALS','EXPECTED_ENDPOINT_REQUIRED','INVALID_ENDPOINT','WRONG_HOST','WRONG_PORT','DNS_TLS_HOST_REQUIRED','UNSAFE_TLS_ENVIRONMENT','TLS_CA_INVALID','CONNECT_TIMEOUT','QUERY_TIMEOUT','TOTAL_TIMEOUT','TLS_UNVERIFIED','TLS_UNAVAILABLE','TLS_VERIFICATION_FAILED','CONNECT_FAILED','ENGINE_MISMATCH','IDENTITY_UNAVAILABLE','SCHEMA_MISMATCH','ACCOUNT_MISMATCH','METADATA_UNAVAILABLE','GRANTS_UNAVAILABLE']);
export function safeCode(error,fallback='CONNECT_FAILED'){
 if(codes.has(error?.diagnosticCode))return error.diagnosticCode;
 if(['ETIMEDOUT','PROTOCOL_SEQUENCE_TIMEOUT'].includes(error?.code))return fallback==='CONNECT_FAILED'?'CONNECT_TIMEOUT':'QUERY_TIMEOUT';
 if(error?.code==='HANDSHAKE_NO_SSL_SUPPORT')return 'TLS_UNAVAILABLE';
 if(['HANDSHAKE_SSL_ERROR','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(error?.code))return 'TLS_VERIFICATION_FAILED';
 return fallback;
}
export function redact(value,password){
 let text=String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ');
 for(const secret of [password,password?encodeURIComponent(password):''].filter(Boolean))text=text.replaceAll(secret,'[REDACTED]');
 return text.replace(/mysql(?:2)?:\/\/[^\s]+/gi,'[REDACTED_CONNECTION]').slice(0,250);
}
export function connectionOptions(env,ca){
 if(['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD'].some(key=>typeof env[key]!=='string'||!env[key].length))stop('MISSING_CREDENTIALS');
 if(!env.UPMS_DIAGNOSTIC_EXPECTED_HOST||!env.UPMS_DIAGNOSTIC_EXPECTED_PORT)stop('EXPECTED_ENDPOINT_REQUIRED');
 const host=env.DB_HOST,port=Number(env.DB_PORT);
 if(host!==env.UPMS_DIAGNOSTIC_EXPECTED_HOST)stop('WRONG_HOST');
 if(env.DB_PORT!==env.UPMS_DIAGNOSTIC_EXPECTED_PORT)stop('WRONG_PORT');
 if(isIP(host))stop('DNS_TLS_HOST_REQUIRED');
 if(host.length>253||host!==host.toLowerCase()||!host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||!/^[1-9]\d{0,4}$/.test(env.DB_PORT)||port<1||port>65535||!/^[a-zA-Z0-9_$-]{1,64}$/.test(env.DB_NAME)||!/^[a-zA-Z0-9_$.-]{1,128}$/.test(env.DB_USER))stop('INVALID_ENDPOINT');
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==='0')stop('UNSAFE_TLS_ENVIRONMENT');
 if(ca!==undefined){try{if(typeof ca!=='string'||ca.length>262144||!ca.includes('-----BEGIN CERTIFICATE-----')||!ca.includes('-----END CERTIFICATE-----'))stop('TLS_CA_INVALID');createSecureContext({ca});}catch{stop('TLS_CA_INVALID');}}
 return {host,port,database:env.DB_NAME,user:env.DB_USER,password:env.DB_PASSWORD,connectTimeout:limits.connectMs,
  ssl:{rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2',...(ca?{ca}:{})},
  flags:['-LOCAL_FILES','-MULTI_STATEMENTS'],multipleStatements:false,enableKeepAlive:false,debug:false,trace:false,supportBigNumbers:true,bigNumberStrings:true,dateStrings:true};
}
export function authenticatedTls(connection,host){
 const stream=connection?.connection?.stream;
 try{
  if(!stream?.encrypted||stream.authorized!==true||!['TLSv1.2','TLSv1.3'].includes(stream.getProtocol?.())||checkServerIdentity(host,stream.getPeerCertificate?.()))stop('TLS_UNVERIFIED');
  const cipher=stream.getCipher?.()?.name;if(!cipher||!/^[A-Za-z0-9_-]{1,100}$/.test(cipher))stop('TLS_UNVERIFIED');
  return {authenticated:true,certificateChainVerified:true,hostnameVerified:true,protocol:stream.getProtocol(),cipher};
 }catch{stop('TLS_UNVERIFIED');}
}
const privileges=new Set(['USAGE','SELECT','INSERT','UPDATE','DELETE','CREATE','DROP','ALTER','INDEX','REFERENCES','TRIGGER','EVENT','EXECUTE','SHOW VIEW','CREATE VIEW','CREATE ROUTINE','ALTER ROUTINE','CREATE TEMPORARY TABLES','LOCK TABLES','PROCESS','FILE','SUPER','RELOAD','SHUTDOWN','REPLICATION CLIENT','REPLICATION SLAVE','CREATE USER','CREATE TABLESPACE','ALL PRIVILEGES']);
const ddl=new Set(['CREATE','DROP','ALTER','INDEX','TRIGGER','EVENT','CREATE VIEW','CREATE ROUTINE','ALTER ROUTINE','CREATE TEMPORARY TABLES','CREATE USER','CREATE TABLESPACE','ALL PRIVILEGES']);
const knownTables=new Set(['identity_guard','users','roles','permissions','user_roles','role_permissions','sessions','login_attempts','identity_audit_events','v1_control','v1_items','v1_parties','v1_stock','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands','production_control','upms_production_migrations','upms_production_migrations_lock']);
const immutable=new Set(['v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands','identity_audit_events']);
export function redactedGrants(rows,schema){
 return rows.map(row=>{
  const raw=Object.values(row).join(' '),match=/^GRANT ([A-Z ,]+) ON (`[^`]+`|[A-Za-z0-9_$*-]+)\.(`[^`]+`|[A-Za-z0-9_$*-]+) TO /i.exec(raw);
  if(!match)return {syntax:'UNRECOGNIZED_REDACTED',noBroadOrDestructiveRightsDetected:false};
  const rights=match[1].toUpperCase().split(',').map(p=>p.trim());if(!rights.every(p=>privileges.has(p)))return {syntax:'UNRECOGNIZED_REDACTED',noBroadOrDestructiveRightsDetected:false};
  const db=match[2].replaceAll('`',''),table=match[3].replaceAll('`',''),scope=db==='*'?'GLOBAL':db===schema?'CURRENT_SCHEMA':'OTHER_SCHEMA';
  const globalRights=scope==='GLOBAL'&&rights.some(p=>p!=='USAGE'),wildcard=table==='*'&&!(scope==='GLOBAL'&&rights.length===1&&rights[0]==='USAGE');
  const runtimeDdl=rights.some(p=>ddl.has(p)),grantOption=/WITH GRANT OPTION/i.test(raw),immutableMutation=immutable.has(table)&&rights.some(p=>['UPDATE','DELETE','ALL PRIVILEGES'].includes(p));
  return {privileges:rights,scope,table:table==='*'?'*':knownTables.has(table)?table:'[REDACTED_TABLE]',grantOption,globalRights,runtimeDdl,immutableMutation,
   noBroadOrDestructiveRightsDetected:!globalRights&&!wildcard&&!runtimeDdl&&!grantOption&&!immutableMutation&&scope!=='OTHER_SCHEMA'};
 });
}
export const sql=Object.freeze({
 engine:'SELECT VERSION() AS version, @@version_comment AS engine_comment',
 identity:'SELECT DATABASE() AS schema_name, CURRENT_USER() AS account, @@server_id AS server_id, @@port AS port, @@read_only AS read_only',
 uuid:'SELECT @@server_uuid AS server_uuid',
 tables:"SELECT COUNT(*) AS table_count, SUM(TABLE_NAME = 'upms_production_migrations') AS production_migrations, SUM(TABLE_NAME = 'upms_identity_migrations') AS identity_migrations FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
 grants:'SHOW GRANTS FOR CURRENT_USER()'
});
async function bounded(promise,ms,code){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new Error(code);error.diagnosticCode=code;reject(error);},ms);})]);}finally{clearTimeout(timer);}}
function engineCompatible(version,comment){const parts=/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);return Boolean(parts&&!/mariadb/i.test(version)&&/mysql/i.test(comment)&&(Number(parts[1])>8||Number(parts[1])===8&&(Number(parts[2])>0||Number(parts[3])>=16)));}

export async function diagnose(env,{connect,ca,connectMs=limits.connectMs,queryMs=limits.queryMs,totalMs=limits.totalMs}={}){
 const report={formatVersion:1,mode:'READ_ONLY_DIAGNOSTIC',status:'BLOCKED',code:null,tls:{authenticated:false},identityQueriesAttempted:false,operationalManagementEnabled:false,
  compatibility:{verdict:'NOT_APPROVED',previewPublishIsolation:'BLOCKED_OWNER_CONFIRMED_SHARED_DATABASE',productionInitializationAllowed:false}};
 let connection,pending,stage='CONNECT_FAILED',closed=false;
 const destroy=()=>{closed=true;try{connection?.destroy();}catch{}};
 const run=async()=>{
  const options=connectionOptions(env,ca);
  pending=Promise.resolve().then(()=>connect(options)).then(c=>{if(closed){try{c.destroy();}catch{}}return c;});
  connection=await bounded(pending,connectMs,'CONNECT_TIMEOUT');if(closed)stop('TOTAL_TIMEOUT');
  report.tls=authenticatedTls(connection,options.host);
  const query=async statement=>{if(closed)stop('TOTAL_TIMEOUT');const [rows]=await bounded(connection.query({sql:statement,timeout:queryMs}),queryMs,'QUERY_TIMEOUT');if(closed)stop('TOTAL_TIMEOUT');return rows;};
  stage='IDENTITY_UNAVAILABLE';report.identityQueriesAttempted=true;
  const [engine]=await query(sql.engine);report.engine={product:/mariadb/i.test(String(engine.version))?'MariaDB':/mysql/i.test(String(engine.engine_comment))?'Oracle MySQL':'UNVERIFIED_MYSQL_COMPATIBLE',version:redact(engine.version,env.DB_PASSWORD),comment:redact(engine.engine_comment,env.DB_PASSWORD),compatible:engineCompatible(String(engine.version),String(engine.engine_comment))};
  if(!report.engine.compatible)stop('ENGINE_MISMATCH');
  const [identity]=await query(sql.identity);
  if(identity.schema_name!==env.DB_NAME)stop('SCHEMA_MISMATCH');
  if(String(identity.account).split('@')[0]!==env.DB_USER)stop('ACCOUNT_MISMATCH');
  report.database={schema:redact(identity.schema_name,env.DB_PASSWORD),currentUser:redact(identity.account,env.DB_PASSWORD),serverId:redact(identity.server_id,env.DB_PASSWORD),port:Number(identity.port),readOnly:Number(identity.read_only)===1,serverUuid:null,serverUuidSupported:false};
  try{const [uuid]=await query(sql.uuid);report.database.serverUuid=redact(uuid.server_uuid,env.DB_PASSWORD);report.database.serverUuidSupported=true;}catch(error){if(error?.code!=='ER_UNKNOWN_SYSTEM_VARIABLE')throw error;}
  stage='METADATA_UNAVAILABLE';const [tables]=await query(sql.tables);report.schema={tableCount:Number(tables.table_count),productionMigrationsPresent:Number(tables.production_migrations)>0,identityMigrationsPresent:Number(tables.identity_migrations)>0,contentsRead:false};
  stage='GRANTS_UNAVAILABLE';report.grants=redactedGrants(await query(sql.grants),env.DB_NAME);
  report.compatibility.broadDestructiveOrUnrecognizedGrantsDetected=report.grants.some(g=>!g.noBroadOrDestructiveRightsDetected);
  report.compatibility.fullRuntimeAllowlistVerified=false;
  report.status='COLLECTED';report.code='READ_ONLY_OBSERVATIONS_COLLECTED';
 };
 try{await bounded(run(),totalMs,'TOTAL_TIMEOUT');}catch(error){report.code=safeCode(error,stage);}finally{destroy();}
 // Whitelisted observations only; raw errors, SQL/grant strings, endpoint and credentials never leave this module.
 return redactReport(report,env.DB_PASSWORD);
}
function redactReport(value,password){if(typeof value==='string')return redact(value,password);if(Array.isArray(value))return value.map(v=>redactReport(v,password));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,redactReport(v,password)]));return value;}
