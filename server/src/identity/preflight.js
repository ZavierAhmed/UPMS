import { validateEngine } from './engine.js';
import { verifyRuntimeGrants,runtimePrivileges } from './grants.js';

export const knownMigrations=Object.freeze(['202610210001_identity.js','202610210002_business_foundation.js','202610220003_inventory_operations.js','202610220004_purchasing_accounts.js','202610220005_sales_challans.js']);
function stop(code){const error=new Error(code);error.code=code;throw error;}
export function validatePreflightState(state,env=process.env){
  if(state.database_name!==env.DB_NAME||Number(state.port)!==Number(env.DB_PORT)||!state.account?.startsWith(`${env.DB_USER}@`))stop('DB_PREFLIGHT_WRONG_ENDPOINT');
  validateEngine(state.version,env);
  if(Number(state.force_recovery)!==0)stop('DB_PREFLIGHT_RECOVERY_MODE');
  if(Number(state.read_only)!==0)stop('DB_PREFLIGHT_READ_ONLY');
  if(!state.innodbAvailable)stop('DB_PREFLIGHT_INNODB_UNAVAILABLE');
  if(env.UPMS_EXPECTED_SERVER_ID&&String(state.server_id)!==env.UPMS_EXPECTED_SERVER_ID)stop('DB_PREFLIGHT_WRONG_SERVER');
}

// Necessary fail-fast checks, not a substitute for recovery consistency/backup verification.
// Read-only: never starts XAMPP, restores, creates schemas, migrates or changes settings.
export async function databasePreflight(db,env=process.env,{expectedMigrations,expectedTables,runtime=env.IDENTITY_DB_PURPOSE==='runtime'}={}){
  const [rows]=await db.raw('SELECT DATABASE() AS database_name,VERSION() AS version,CURRENT_USER() AS account,@@port AS port,@@server_id AS server_id,@@innodb_force_recovery AS force_recovery,@@read_only AS read_only');
  const [engines]=await db.raw('SHOW ENGINES');
  const state={...rows[0],innodbAvailable:engines.some(e=>e.Engine==='InnoDB'&&['YES','DEFAULT'].includes(e.Support)&&e.Transactions==='YES')};
  validatePreflightState(state,env);
  const [tables]=await db.raw('SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  if(tables.some(t=>t.engine!=='InnoDB'))stop('DB_PREFLIGHT_UNEXPECTED_ENGINE');
  if(expectedTables!==undefined&&tables.length!==expectedTables)stop('DB_PREFLIGHT_SCHEMA_MISMATCH');
  if(runtime&&tables.length!==Object.keys(runtimePrivileges).length)stop('DB_PREFLIGHT_SCHEMA_MISMATCH');
  let migrations=null;
  if(!runtime){
    const tracking=tables.some(t=>t.name==='upms_identity_migrations'),locking=tables.some(t=>t.name==='upms_identity_migrations_lock');
    if(tracking!==locking||tables.length&&!tracking)stop('DB_PREFLIGHT_PARTIAL_SCHEMA');
    migrations=tracking?await db('upms_identity_migrations').orderBy('id').pluck('name'):[];
    if(migrations.length>knownMigrations.length||migrations.some((name,index)=>name!==knownMigrations[index]))stop('DB_PREFLIGHT_MIGRATION_HISTORY');
    if(tables.length!==[0,11,38,44,59,68][migrations.length])stop('DB_PREFLIGHT_PARTIAL_SCHEMA');
    if(expectedMigrations&&JSON.stringify(migrations)!==JSON.stringify(expectedMigrations))stop('DB_PREFLIGHT_MIGRATION_HISTORY');
    if(locking&&(await db('upms_identity_migrations_lock').where({is_locked:1}).first()))stop('DB_PREFLIGHT_MIGRATION_LOCKED');
  }
  let grants=null;
  if(runtime){const [rows]=await db.raw('SHOW GRANTS FOR CURRENT_USER');try{grants=verifyRuntimeGrants(rows,env.DB_NAME,state.account);}catch{stop('DB_PREFLIGHT_RUNTIME_GRANTS');}}
  return {database:state.database_name,version:state.version,account:state.account,port:Number(state.port),serverId:String(state.server_id),forceRecovery:0,innodb:true,tables:tables.length,migrations,restrictedRuntimeVerified:Boolean(grants),recoveryHealthCertified:false};
}

export function safePreflightDiagnostic(error){
  const code=error?.code;
  if(typeof code==='string'&&code.startsWith('DB_PREFLIGHT_'))return code;
  if(['ECONNREFUSED','EACCES','ENOTFOUND','ETIMEDOUT','PROTOCOL_SEQUENCE_TIMEOUT','ER_ACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR','ER_BAD_DB_ERROR'].includes(code))return code;
  return 'DB_PREFLIGHT_FAILED';
}
