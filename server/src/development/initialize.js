import {up as identity} from '../../migrations/202610210001_identity.js';
import {up as simple} from '../../simple-v1-migrations/202610240001_simple_v1.js';
import {up as entry} from '../../simple-v1-migrations/202610240002_entry_fixes.js';
import {failure,remoteTarget,remoteEngine} from './remote.js';

export const migrationPlan=Object.freeze([
  '202610210001_identity.js','202610240001_simple_v1.js','202610240002_entry_fixes.js',
]);
export const schemaTables=Object.freeze(['identity_guard','users','roles','permissions','user_roles','role_permissions',
  'sessions','identity_audit_events','login_attempts','v1_control','v1_items','v1_parties','v1_stock',
  'v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands']);

// Rehearsal keeps its independent synthetic endpoint restrictions.
export async function initializeIsolated(db,env){
  const c=db.client.connectionSettings;
  if(env.NODE_ENV!=='development'||env.DB_CONFIRM_NAME!=='upms_test_remote_rehearsal_20261026' ||
    c.database!==env.DB_CONFIRM_NAME||c.host!=='127.0.0.1'||Number(c.port)!==3317)
    throw failure('REMOTE_WRITES_AWAIT_OWNER_REVIEW');
  const [[state]]=await db.raw('SELECT DATABASE() AS schema_name,@@server_id AS server_id,@@innodb_force_recovery AS recovery,VERSION() AS version');
  if(state.schema_name!==c.database||Number(state.server_id)!==331726||Number(state.recovery)!==0||!/MariaDB/.test(state.version))
    throw failure('REMOTE_WRITES_AWAIT_OWNER_REVIEW');
  return initializeSchema(db);
}

// One-time migrations only, following the owner's explicit approval in this session.
// This does not open or activate an operational application database pool.
export async function initializeReviewedRemote(db,env,confirmation){
  remoteTarget(env);
  const c=db.client.connectionSettings;
  if(confirmation?.target!=='184.168.100.110:3306/upms'||confirmation?.serverId!=='1'||
    confirmation?.account!=='upms_user@103.244.178.33'||confirmation?.plaintext!==true||
    c.host!==env.DB_HOST||Number(c.port)!==3306||c.database!=='upms'||c.user!=='upms_user')
    throw failure('REMOTE_TARGET_REJECTED');
  const [[row]]=await db.raw('SELECT VERSION() AS version,DATABASE() AS schema_name,CURRENT_USER() AS account,@@server_id AS server_id,@@port AS port,@@read_only AS read_only,@@innodb_force_recovery AS force_recovery');
  remoteEngine(row.version);
  if(row.schema_name!=='upms'||row.account!==confirmation.account||String(row.server_id)!=='1'||
    Number(row.port)!==3306||Number(row.read_only)!==0||Number(row.force_recovery)!==0)throw failure('REMOTE_SCHEMA_REJECTED');
  const [engines]=await db.raw("SELECT SUPPORT,TRANSACTIONS FROM information_schema.ENGINES WHERE ENGINE='InnoDB'");
  if(!engines.some(e=>['YES','DEFAULT'].includes(e.SUPPORT)&&e.TRANSACTIONS==='YES'))throw failure('REMOTE_SCHEMA_REJECTED');
  return initializeSchema(db);
}

async function initializeSchema(db){
  // Advisory lock serializes rehearsals, but never automatically repairs partial MySQL DDL.
  const conn=await db.client.acquireConnection();
  const run=sql=>new Promise((resolve,reject)=>conn.query({sql,timeout:3000},(e,r)=>e?reject(e):resolve(r)));
  try{
    if(Number((await run("SELECT GET_LOCK('upms_remote_initialization',0) AS locked"))[0].locked)!==1)throw Error('Initialization locked');
    const [tables]=await db.raw('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    if(tables.length){
      const names=tables.map(t=>t.name).sort();
      if(JSON.stringify(names)!==JSON.stringify([...schemaTables,'upms_remote_initialization'].sort()))throw Error('Existing/partial schema: preserve and review');
      const rows=await db('upms_remote_initialization').orderBy('step').select('name');
      if(JSON.stringify(rows.map(r=>r.name))!==JSON.stringify(migrationPlan))throw Error('Migration history mismatch');
      if(!await db.schema.hasColumn('v1_control','entry_version')||!await db.schema.hasColumn('v1_documents','discount_amount'))throw Error('Schema mismatch');
      return {alreadyInitialized:true,migrations:migrationPlan};
    }
    await db.schema.createTable('upms_remote_initialization',t=>{t.engine('InnoDB');t.charset('utf8mb4');t.integer('step').primary();t.string('name',100).notNullable();});
    for(const [step,up]of [identity,simple,entry].entries()){
      await up(db);await db('upms_remote_initialization').insert({step:step+1,name:migrationPlan[step]});
    }
    return {alreadyInitialized:false,migrations:migrationPlan};
  }finally{
    try{await run("SELECT RELEASE_LOCK('upms_remote_initialization')");}finally{await db.client.releaseConnection(conn);}
  }
}
