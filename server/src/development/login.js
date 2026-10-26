import knex from 'knex';
import {remoteTarget,remoteEngine,failure} from './remote.js';
import {summarizeGrant} from '../identity/grants.js';
import {migrationPlan,schemaTables} from './initialize.js';
import {v1Privileges} from '../simple-v1/catalog.js';

// Owner-approved authentication only: deny DDL and every business-data mutation.
export function loginSqlAllowed(sql){
  const s=sql.trim();
  if(/^(?:select\s|show\s)/i.test(s))return !/\b(?:outfile|dumpfile|load_file)\b/i.test(s);
  if(/^(?:begin|commit|rollback)\s*;?$/i.test(s))return true;
  if(s==="SET SESSION time_zone = '+00:00', innodb_lock_wait_timeout = 3, sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'")return true;
  if(/^insert into `(sessions|login_attempts|identity_audit_events)`\s/i.test(s))return true;
  if(/^(?:update|delete from) `(sessions|login_attempts)`\s/i.test(s))return true;
  if(/^update `users` set /i.test(s)){
    const set=s.split(/\swhere\s/i)[0].replace(/^update `users` set /i,'');
    return set.split(',').every(part=>/^\s*`(?:password_hash|authorization_version|updated_at)`\s*=\s*\?\s*$/.test(part));
  }
  return false;
}
export function loginHttpAllowed(method,path){
  return method==='GET'&&/^\/api\/v1\/management\/session\/(csrf|current)$/.test(path)||
    method==='POST'&&/^\/api\/v1\/management\/(session\/(login|logout)|profile\/password)$/.test(path);
}
export function managementSqlAllowed(sql){
  if(loginSqlAllowed(sql))return true;
  const match=/^(insert into|update) `([a-z0-9_]+)`\s/i.exec(sql.trim());
  if(!match)return false;
  const rights=v1Privileges[match[2]],operation=match[1].toLowerCase()==='update'?'UPDATE':'INSERT';
  return Boolean(rights?.includes(operation)&&(!/on duplicate key update/i.test(sql)||rights.includes('UPDATE')));
}
export function managementHttpAllowed(method,path){
  return loginHttpAllowed(method,path)||['GET','POST','PATCH'].includes(method)&&/^\/api\/v1\/management\/simple-v1(?:\/|$)/.test(path);
}
export function createLoginDatabase(env,{plaintext=false}={}){
  return createRemotePool(env,{plaintext,management:false});
}
export function createManagementDatabase(env,{plaintext=false}={}){
  return createRemotePool(env,{plaintext,management:true});
}
function createRemotePool(env,{plaintext,management}){
  const target=remoteTarget(env);
  if(!plaintext)throw failure('TLS_CONFIGURATION_REQUIRED');
  if(!env.DB_PASSWORD)throw failure('MISSING_CREDENTIALS');
  const db=knex({client:'mysql2',connection:{...target,password:env.DB_PASSWORD,ssl:false,timezone:'Z',charset:'utf8mb4',
    connectTimeout:3000,multipleStatements:false,supportBigNumbers:true,bigNumberStrings:true,dateStrings:true},
    // Simple V1 serializes transactions on identity_guard. One remote connection avoids
    // network-latency lock contention; a bounded queue accommodates parallel page reads.
    acquireConnectionTimeout:management?30000:5000,pool:{min:0,max:management?1:3,acquireTimeoutMillis:management?30000:5000,createTimeoutMillis:management?8000:5000,
      afterCreate(connection,done){
        const run=connection.query.bind(connection);
        connection.query=(options,...args)=>{
          const sql=typeof options==='string'?options:options.sql,callback=args.at(-1);
          if(!(management?managementSqlAllowed:loginSqlAllowed)(sql)){
            const error=failure('REMOTE_AUTH_ONLY');
            if(typeof callback==='function'){queueMicrotask(()=>callback(error));return;}
            throw error;
          }
          if(typeof callback==='function')args[args.length-1]=(error,...result)=>{
            if(error?.code==='PROTOCOL_SEQUENCE_TIMEOUT')connection.destroy();callback(error,...result);
          };
          return run(typeof options==='string'?{sql,timeout:4000}:{...options,timeout:4000},...args);
        };
        const read=sql=>new Promise((resolve,reject)=>connection.query(sql,(e,r)=>e?reject(e):resolve(r)));
        (async()=>{
          const row=(await read('SELECT VERSION() AS version,DATABASE() AS schema_name,CURRENT_USER() AS account,@@server_id AS server_id,@@port AS port,@@read_only AS read_only,@@innodb_force_recovery AS recovery'))[0];
          remoteEngine(row.version);
          if(row.schema_name!=='upms'||row.account!=='upms_user@103.244.178.33'||String(row.server_id)!=='1'||Number(row.port)!==3306||Number(row.read_only)!==0||Number(row.recovery)!==0)throw failure('REMOTE_SCHEMA_REJECTED');
          let schemaGrant=false;
          for(const raw of await read('SHOW GRANTS FOR CURRENT_USER')){
            const g=summarizeGrant(raw);
            if(g.unsupported)throw failure('REMOTE_SCHEMA_REJECTED');
            if(g.scope==='*.*'&&JSON.stringify(g.privileges)==='["USAGE"]')continue;
            if(g.scope!=='upms.*'||JSON.stringify(g.privileges)!=='["ALL PRIVILEGES"]')throw failure('REMOTE_SCHEMA_REJECTED');
            schemaGrant=true;
          }
          if(!schemaGrant)throw failure('REMOTE_SCHEMA_REJECTED');
          const rows=await read('SELECT name FROM upms_remote_initialization ORDER BY step');
          if(JSON.stringify(rows.map(r=>r.name))!==JSON.stringify(migrationPlan))throw failure('REMOTE_SCHEMA_REJECTED');
          if(management){
            const tables=await read('SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
            if(tables.some(t=>t.engine!=='InnoDB')||JSON.stringify(tables.map(t=>t.name).sort())!==JSON.stringify([...schemaTables,'upms_remote_initialization'].sort()))throw failure('REMOTE_SCHEMA_REJECTED');
            const control=(await read('SELECT version,entry_version FROM v1_control WHERE id=1'))[0];
            if(Number(control?.version)!==1||Number(control?.entry_version)!==2)throw failure('REMOTE_SCHEMA_REJECTED');
          }
          await read("SET SESSION time_zone = '+00:00', innodb_lock_wait_timeout = 3, sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
        })().then(()=>done(null,connection),error=>{connection.destroy();done(error,connection);});
      }},log:{warn(){},error(){},debug(){},deprecate(){}}});
  const acquire=db.client.acquireConnection.bind(db.client);
  db.client.acquireConnection=()=>{if(db.client.pool?.numPendingAcquires()>=20)throw failure('CONNECTION_UNAVAILABLE');return acquire();};
  Object.defineProperty(db,'upmsRemoteDevelopment',{value:true});
  return db;
}
