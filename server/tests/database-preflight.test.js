import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePreflightState,databasePreflight,safePreflightDiagnostic,knownMigrations } from '../src/identity/preflight.js';

const env={DB_NAME:'upms_test_preflight',DB_USER:'upms_runtime_test_preflight',DB_PORT:'3306',DB_ALLOW_MARIADB_COMPATIBILITY:'true'};
const normal={database_name:env.DB_NAME,account:env.DB_USER+'@localhost',port:3306,version:'10.4.32-MariaDB',server_id:1,force_recovery:0,read_only:0,innodbAvailable:true};
test('database preflight refuses wrong endpoints, recovery modes and unavailable engines',()=>{
  validatePreflightState(normal,env);
  for(const change of [{database_name:'upms'},{account:'unexpected@localhost'},{port:3307}])assert.throws(()=>validatePreflightState({...normal,...change},env),e=>e.code==='DB_PREFLIGHT_WRONG_ENDPOINT');
  for(const force_recovery of [1,2,3,4,5,6])assert.throws(()=>validatePreflightState({...normal,force_recovery},env),e=>e.code==='DB_PREFLIGHT_RECOVERY_MODE');
  assert.throws(()=>validatePreflightState({...normal,read_only:1},env),e=>e.code==='DB_PREFLIGHT_READ_ONLY');
  assert.throws(()=>validatePreflightState({...normal,innodbAvailable:false},env),e=>e.code==='DB_PREFLIGHT_INNODB_UNAVAILABLE');
  assert.throws(()=>validatePreflightState(normal,{...env,UPMS_EXPECTED_SERVER_ID:'2'}),e=>e.code==='DB_PREFLIGHT_WRONG_SERVER');
});
// Contract-only unit fixture. This is not real SQL health or recovery acceptance.
function fixture({tables=[],history=[],locked=false}={}){
  const calls=[];
  const db=table=>({orderBy(){return this;},pluck:async()=>history,where(){return this;},first:async()=>locked?{is_locked:1}:undefined});
  db.raw=async sql=>{calls.push(sql);if(sql.startsWith('SELECT DATABASE'))return [[normal]];if(sql==='SHOW ENGINES')return [[{Engine:'InnoDB',Support:'DEFAULT',Transactions:'YES'}]];if(sql.includes('information_schema.TABLES'))return [tables];throw Error('Unexpected statement');};
  return {db,calls};
}
test('preflight reads only and refuses partial schema or unknown migration state',async()=>{
  const fresh=fixture();assert.equal((await databasePreflight(fresh.db,env)).tables,0);assert.ok(fresh.calls.every(sql=>/^(SELECT|SHOW) /.test(sql)));
  const table=name=>({name,engine:'InnoDB'}),tracking=[table('upms_identity_migrations'),table('upms_identity_migrations_lock')];
  await assert.rejects(databasePreflight(fixture({tables:tracking}).db,env),e=>e.code==='DB_PREFLIGHT_PARTIAL_SCHEMA');
  await assert.rejects(databasePreflight(fixture({tables:tracking,history:['unknown.js']}).db,env),e=>e.code==='DB_PREFLIGHT_MIGRATION_HISTORY');
  const complete=[...tracking,...Array.from({length:9},(_,i)=>table('identity_'+i))];
  await assert.rejects(databasePreflight(fixture({tables:complete,history:[knownMigrations[0]],locked:true}).db,env),e=>e.code==='DB_PREFLIGHT_MIGRATION_LOCKED');
});
test('preflight diagnostics withhold raw SQL, credentials and unexpected exception text',()=>{
  assert.equal(safePreflightDiagnostic({code:'ECONNREFUSED'}),'ECONNREFUSED');
  assert.equal(safePreflightDiagnostic(new Error('sensitive SQL text')),'DB_PREFLIGHT_FAILED');
  assert.equal(safePreflightDiagnostic({code:'unsafe message'}),'DB_PREFLIGHT_FAILED');
});
