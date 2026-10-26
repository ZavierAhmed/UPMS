import net from 'node:net';
import tls from 'node:tls';
import {readFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';

export const remoteProfile = 'remote-cpanel-development';
export function failure(code) { return Object.assign(new Error(code), {code}); }
export function remoteTarget(env) {
  if (env.UPMS_DATABASE_PROFILE !== remoteProfile || env.NODE_ENV !== 'development' ||
      env.DB_HOST !== '184.168.100.110' || env.DB_PORT !== '3306' ||
      env.DB_NAME !== 'upms' || env.DB_USER !== 'upms_user' ||
      env.UPMS_SIMPLE_V1 !== 'remote-development-v1' || Object.keys(env).some(k=>k.startsWith('UPMS_PRODUCTION_')&&env[k]) ||
      env.UPMS_SIMPLE_V1_SYNTHETIC) throw failure('REMOTE_TARGET_REJECTED');
  return {host:env.DB_HOST, port:3306, database:env.DB_NAME, user:env.DB_USER};
}
export function remoteEngine(version) {
  if (!/^10\.11\.\d+-MariaDB(?:[-+].*)?$/i.test(version)) throw failure('REMOTE_ENGINE_REJECTED');
}
export function safeError(error) {
  const codes = ['REMOTE_TARGET_REJECTED','REMOTE_ENGINE_REJECTED','TLS_NOT_ADVERTISED',
    'TLS_VERIFICATION_FAILED','CONNECTION_TIMEOUT','CONNECTION_UNAVAILABLE','MISSING_CREDENTIALS',
    'TLS_CONFIGURATION_REQUIRED','REMOTE_SCHEMA_REJECTED','REMOTE_WRITES_AWAIT_OWNER_REVIEW',
    'SUPPORTED_NODE_REQUIRED','ER_ACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR','ER_BAD_DB_ERROR'];
  const mapped={ETIMEDOUT:'CONNECTION_TIMEOUT',PROTOCOL_SEQUENCE_TIMEOUT:'CONNECTION_TIMEOUT',
    ECONNREFUSED:'CONNECTION_UNAVAILABLE',ECONNRESET:'CONNECTION_UNAVAILABLE',PROTOCOL_CONNECTION_LOST:'CONNECTION_UNAVAILABLE',
    ERR_TLS_CERT_ALTNAME_INVALID:'TLS_VERIFICATION_FAILED',UNABLE_TO_VERIFY_LEAF_SIGNATURE:'TLS_VERIFICATION_FAILED',
    DEPTH_ZERO_SELF_SIGNED_CERT:'TLS_VERIFICATION_FAILED',CERT_HAS_EXPIRED:'TLS_VERIFICATION_FAILED'};
  return {ok:false, code:codes.includes(error?.code)?error.code:(mapped[error?.code]||'REMOTE_CHECK_FAILED'), operationalWrites:false};
}

// Only the unauthenticated greeting is read. No username, password or SQL is sent.
export function advertisedTls(target, timeout=3000) {
  return new Promise((resolve,reject) => {
    const socket=net.connect({host:target.host,port:target.port});
    let data=Buffer.alloc(0), settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;socket.destroy();error?reject(error):resolve(value);};
    socket.setTimeout(timeout,()=>finish(failure('CONNECTION_TIMEOUT')));
    socket.on('error',()=>finish(failure('CONNECTION_UNAVAILABLE')));
    socket.on('end',()=>finish(failure('CONNECTION_UNAVAILABLE')));
    socket.on('data',chunk=>{
      data=Buffer.concat([data,chunk]);
      if(data.length>65536)return finish(failure('CONNECTION_UNAVAILABLE'));
      if(data.length<4)return;
      const size=data.readUIntLE(0,3);
      if(data.length<size+4)return;
      const p=data.subarray(4,size+4), end=p.indexOf(0,1);
      if(p[0]!==10||end<2||p.length<end+16)return finish(failure('CONNECTION_UNAVAILABLE'));
      const capabilities=p.readUInt16LE(end+14);
      finish(null,{tlsAdvertised:Boolean(capabilities&0x800),advertisedVersion:p.subarray(1,end).toString('ascii').replace(/[^\w.+-]/g,'').slice(0,128),authenticated:false});
    });
  });
}

export async function tlsConfiguration(env) {
  const hostname=env.REMOTE_DB_TLS_HOSTNAME;
  if(!hostname || net.isIP(hostname) || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/.test(hostname))
    throw failure('TLS_CONFIGURATION_REQUIRED');
  // The hostname must be independently supplied by the database provider/owner.
  const ca=env.REMOTE_DB_CA_FILE?await readFile(env.REMOTE_DB_CA_FILE,'utf8'):undefined;
  return {hostname,ssl:{...(ca?{ca}:{}),rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2'}};
}
export function verifySession(stream,hostname) {
  if(!stream?.encrypted || stream.authorized!==true || !['TLSv1.2','TLSv1.3'].includes(stream.getProtocol?.()) ||
      tls.checkServerIdentity(hostname,stream.getPeerCertificate())) throw failure('TLS_VERIFICATION_FAILED');
}
export async function readonlyPreflight(env, dependencies={}) {
  const target=remoteTarget(env);
  const advertised=await (dependencies.advertisedTls||advertisedTls)(target);
  if(!advertised.tlsAdvertised)throw failure('TLS_NOT_ADVERTISED');
  const config=await tlsConfiguration(env);
  if(!env.DB_PASSWORD)throw failure('MISSING_CREDENTIALS');
  let connection, socket, timer, expired=false;
  try {
    // Pin the TCP destination while mysql2 verifies the approved DNS name before authentication.
    connection=await Promise.race([(dependencies.connect||mysql.createConnection)({host:config.hostname,port:target.port,
      stream:()=>{socket=net.connect({host:target.host,port:target.port});return socket;},database:target.database,user:target.user,
      password:env.DB_PASSWORD,ssl:config.ssl,connectTimeout:3000,charset:'utf8mb4',multipleStatements:false})
      .then(value=>{if(expired){value.destroy();throw failure('CONNECTION_TIMEOUT');}return value;}),
      new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;socket?.destroy();reject(failure('CONNECTION_TIMEOUT'));},dependencies.timeout||3500);})]);
    clearTimeout(timer);
    verifySession(connection.connection.stream,config.hostname);
    const query=async sql=>(await connection.query({sql,timeout:3000}))[0];
    const identity=(await query('SELECT VERSION() AS version, DATABASE() AS schema_name, CURRENT_USER() AS account, @@server_id AS server_id, @@port AS port, @@read_only AS read_only, @@innodb_force_recovery AS force_recovery'))[0];
    remoteEngine(identity.version);
    if(identity.schema_name!==target.database || !identity.account.startsWith(`${target.user}@`) || Number(identity.port)!==3306)
      throw failure('REMOTE_SCHEMA_REJECTED');
    const tables=await query('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
    const engines=await query("SELECT ENGINE,SUPPORT,TRANSACTIONS FROM information_schema.ENGINES WHERE ENGINE='InnoDB'");
    const grants=await query('SHOW GRANTS FOR CURRENT_USER');
    const uuid=await query("SHOW VARIABLES LIKE 'server_uuid'");
    const migrationTables=tables.filter(t=>/migration|upms_remote_initialization/i.test(t.TABLE_NAME)).map(t=>t.TABLE_NAME);
    const migrationHistory={};
    for(const name of ['upms_remote_initialization','upms_identity_migrations','upms_production_migrations']){
      if(!migrationTables.includes(name))continue;
      const rows=await query(`SELECT name FROM \`${name}\` LIMIT 512`);
      migrationHistory[name]=rows.map(row=>/^\d{12}_[a-z0-9_]+\.js$/.test(row.name)?row.name:'REDACTED_UNRECOGNIZED_MIGRATION');
    }
    // Never emit raw grants: MariaDB can include authentication hashes in them.
    const known=new Set(['USAGE','ALL PRIVILEGES','SELECT','INSERT','UPDATE','DELETE','CREATE','DROP','ALTER','INDEX',
      'REFERENCES','EXECUTE','CREATE VIEW','SHOW VIEW','TRIGGER','EVENT','CREATE ROUTINE','ALTER ROUTINE','LOCK TABLES','CREATE TEMPORARY TABLES']);
    const privileges=grants.map(row=>{
      const parsed=String(Object.values(row)[0]).match(/^GRANT (.*?) ON /i)?.[1]?.split(',').map(p=>p.trim().toUpperCase());
      const raw=String(Object.values(row)[0]), scope=raw.match(/ ON (.*?) TO /i)?.[1]?.replaceAll('`','');
      return {privileges:parsed?.every(p=>known.has(p))?parsed:['REDACTED_UNRECOGNIZED_GRANT'],
        scope:scope==='*.*'?'global':scope?.startsWith(`${target.database}.`)?'selected-schema':'redacted-other-scope',delegable:/WITH GRANT OPTION/i.test(raw)};
    });
    return {ok:true,identity,tls:{authenticated:true,version:connection.connection.stream.getProtocol(),cipher:connection.connection.stream.getCipher().name},
      serverUuid:uuid[0]?.Value||null,tables,tableCount:tables.length,engines,migrationTables,migrationHistory,privileges,
      operationalWrites:false,writeBlocker:'REMOTE_WRITES_AWAIT_OWNER_REVIEW'};
  } finally {clearTimeout(timer);connection?.destroy();socket?.destroy();}
}
