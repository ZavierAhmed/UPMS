import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {remoteTarget,remoteEngine,remoteProfile,advertisedTls,readonlyPreflight,safeError,verifySession} from '../src/development/remote.js';
import {databaseConfig,identityConfig} from '../src/identity/config.js';
import {createDatabase} from '../src/identity/database.js';
import {productionProfile} from '../src/production/profile.js';
import {syntheticV1} from '../src/simple-v1/catalog.js';
import {initializeIsolated,initializeReviewedRemote,migrationPlan} from '../src/development/initialize.js';

const env={NODE_ENV:'development',UPMS_DATABASE_PROFILE:remoteProfile,UPMS_SIMPLE_V1:'remote-development-v1',
  DB_HOST:'184.168.100.110',DB_PORT:'3306',DB_NAME:'upms',DB_USER:'upms_user',DB_PASSWORD:'never-log-this-password',
  REMOTE_DB_TLS_HOSTNAME:'database.example.com',MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',
  MANAGEMENT_ORIGIN:'http://127.0.0.1:3000',SESSION_SECRET:'x'.repeat(48)};
const stream={encrypted:true,authorized:true,getProtocol:()=> 'TLSv1.3',getCipher:()=>({name:'TLS_AES_256_GCM_SHA384'}),
  getPeerCertificate:()=>({subjectaltname:'DNS:database.example.com'})};
function mock(overrides={}){
  const calls=[];let destroyed=false;
  const connection={connection:{stream},destroy(){destroyed=true;},async query({sql}){
    calls.push(sql);
    if(sql.startsWith('SELECT VERSION'))return [[{version:'10.11.19-MariaDB-cll-lve',schema_name:'upms',account:'upms_user@client',port:3306,read_only:0,force_recovery:0,...overrides.identity}]];
    if(sql.includes('information_schema.TABLES'))return [[{TABLE_NAME:'v1_control',ENGINE:'InnoDB'}]];
    if(sql.includes('information_schema.ENGINES'))return [[{ENGINE:'InnoDB',SUPPORT:'DEFAULT',TRANSACTIONS:'YES'}]];
    return [[{grant:"GRANT ALL PRIVILEGES ON `upms`.* TO `upms_user`@`%` IDENTIFIED BY PASSWORD 'secret-hash'"}]];
  }};
  if(overrides.stream)connection.connection.stream=overrides.stream;
  return {calls,connection,get destroyed(){return destroyed;},dependencies:{advertisedTls:async()=>({tlsAdvertised:true}),connect:async config=>{assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.verifyIdentity,true);assert.equal(config.host,env.REMOTE_DB_TLS_HOSTNAME);return connection;}}};
}
test('remote selection is independent of production and synthetic',()=>{
  assert.equal(remoteTarget(env).host,env.DB_HOST);assert.equal(productionProfile(env),null);assert.equal(syntheticV1(env),false);
  const c=identityConfig(env);assert.equal(c.simpleV1,true);assert.equal(c.productionV1,false);assert.equal(c.remoteDevelopment,true);
});
for(const [key,value]of Object.entries({NODE_ENV:'production',DB_HOST:'127.0.0.1',DB_PORT:'3309',DB_NAME:'upms_dev',DB_USER:'root',UPMS_SIMPLE_V1:'synthetic-v1',UPMS_PRODUCTION_POSTING:'owner-approved'}))
  test(`reject changed remote target ${key}`,()=>assert.throws(()=>remoteTarget({...env,[key]:value}),/REMOTE_TARGET_REJECTED/));
test('HTTP is strictly loopback and exact origin',()=>assert.throws(()=>identityConfig({...env,MANAGEMENT_ORIGIN:'http://0.0.0.0:3000'})));
test('remote writable pools cannot be enabled by environment flags',()=>{
  assert.throws(()=>databaseConfig(env),/REMOTE_WRITES_AWAIT_OWNER_REVIEW/);
  assert.throws(()=>createDatabase({...env,REMOTE_WRITES_ENABLED:'true'}),/REMOTE_WRITES_AWAIT_OWNER_REVIEW/);
});
test('legacy local and GoDaddy production restrictions remain',()=>{
  assert.throws(()=>databaseConfig({...env,UPMS_DATABASE_PROFILE:'local-mysql'}),/local DB_HOST/);
  for(const profile of ['godaddy-cpanel','godaddy-managed'])assert.throws(()=>databaseConfig({...env,UPMS_DATABASE_PROFILE:profile}),/blocked/);
});
test('generic public startup rejects remote profile even with management disabled',()=>{
  const result=spawnSync(process.execPath,['server/src/index.js'],{env:{...process.env,...env,MANAGEMENT_ENABLED:'false'},
    encoding:'utf8',timeout:5000,windowsHide:true});
  assert.equal(result.status,1);assert.ok(!result.stdout.includes('listening'));assert.ok(!result.stderr.includes(env.DB_PASSWORD));
});
test('MariaDB target line only; no Oracle or old MariaDB acceptance',()=>{
  remoteEngine('10.11.19-MariaDB-cll-lve');
  for(const v of ['8.4.13','10.4.32-MariaDB','11.4.9-MariaDB','10.11.19'])assert.throws(()=>remoteEngine(v));
});
test('missing TLS advertisement never authenticates',async()=>{
  let connected=false;
  await assert.rejects(readonlyPreflight(env,{advertisedTls:async()=>({tlsAdvertised:false}),connect:async()=>{connected=true;}}),/TLS_NOT_ADVERTISED/);
  assert.equal(connected,false);
});
test('missing credentials and missing approved hostname fail before authentication',async()=>{
  const m=mock();await assert.rejects(readonlyPreflight({...env,DB_PASSWORD:''},m.dependencies),/MISSING_CREDENTIALS/);
  await assert.rejects(readonlyPreflight({...env,REMOTE_DB_TLS_HOSTNAME:''},m.dependencies),/TLS_CONFIGURATION_REQUIRED/);assert.equal(m.calls.length,0);
});
test('encrypted but unauthorized or wrong-name TLS never queries identity',async()=>{
  for(const changed of [{authorized:false},{encrypted:false},{getProtocol:()=> 'TLSv1.1'},{getPeerCertificate:()=>({subjectaltname:'DNS:other.example.com'})}]){
    const m=mock({stream:{...stream,...changed}});await assert.rejects(readonlyPreflight(env,m.dependencies),/TLS_VERIFICATION_FAILED/);
    assert.equal(m.calls.length,0);assert.equal(m.destroyed,true);
  }
  verifySession(stream,'database.example.com');
});
test('safe successful read-only simulation redacts grant authentication material',async()=>{
  const m=mock(), result=await readonlyPreflight(env,m.dependencies),output=JSON.stringify(result);
  assert.equal(result.operationalWrites,false);assert.equal(result.tls.authenticated,true);assert.equal(m.destroyed,true);
  assert.ok(m.calls.every(sql=>/^(SELECT|SHOW) /.test(sql)));
  for(const secret of [env.DB_PASSWORD,'secret-hash','IDENTIFIED BY','GRANT ALL'])assert.ok(!output.includes(secret));
});
test('wrong schema, account and engine close connection',async()=>{
  for(const identity of [{schema_name:'other'},{account:'root@host'},{version:'8.4.13'}]){
    const m=mock({identity});await assert.rejects(readonlyPreflight(env,m.dependencies));assert.equal(m.destroyed,true);
  }
});
test('authentication, timeout and disconnect errors are sanitized',async()=>{
  for(const code of ['ER_ACCESS_DENIED_ERROR','ETIMEDOUT','ECONNRESET','PROTOCOL_CONNECTION_LOST']){
    const m=mock();m.dependencies.connect=async()=>{throw Object.assign(Error(env.DB_PASSWORD),{code});};
    try{await readonlyPreflight(env,m.dependencies);assert.fail();}catch(e){assert.ok(!JSON.stringify(safeError(e)).includes(env.DB_PASSWORD));}
  }
  const m=mock();m.dependencies.connect=()=>new Promise(()=>{});m.dependencies.timeout=10;
  await assert.rejects(readonlyPreflight(env,m.dependencies),/CONNECTION_TIMEOUT/);
});
test('untrusted errors never enter logs',()=>{
  assert.deepEqual(safeError({code:'SELECT password secret-hash',message:env.DB_PASSWORD,sql:'private SQL'}),{ok:false,code:'REMOTE_CHECK_FAILED',operationalWrites:false});
});
test('initializer rejects real remote target before SQL or migrations',async()=>{
  const db={client:{connectionSettings:{host:env.DB_HOST,port:3306,database:'upms'}},raw(){assert.fail('must not query');}};
  await assert.rejects(initializeIsolated(db,{...env,DB_CONFIRM_NAME:'upms'}),/REMOTE_WRITES_AWAIT_OWNER_REVIEW/);
  assert.equal(migrationPlan.length,3);
});
test('one-time remote initialization requires exact explicit endpoint and account confirmations',async()=>{
  const db={client:{connectionSettings:{host:env.DB_HOST,port:3306,database:'upms',user:'upms_user'}},raw(){assert.fail('must reject before SQL');}};
  const confirmation={target:'184.168.100.110:3306/upms',serverId:'1',account:'upms_user@103.244.178.33',plaintext:true};
  for(const changed of [{target:'localhost:3306/upms'},{serverId:'2'},{account:'root@host'},{plaintext:false}])
    await assert.rejects(initializeReviewedRemote(db,env,{...confirmation,...changed}),/REMOTE_TARGET_REJECTED/);
  await assert.rejects(initializeReviewedRemote(db,env),/REMOTE_TARGET_REJECTED/);
});
test('actual TCP greeting parser handles fragmented packets and timeout without client writes',async()=>{
  let bytes=0;
  const server=net.createServer(s=>{s.on('data',b=>{bytes+=b.length;});const version=Buffer.from('10.11.19-MariaDB\0');
    const p=Buffer.alloc(1+version.length+20);p[0]=10;version.copy(p,1);p.writeUInt16LE(0x800,version.length+14);
    const packet=Buffer.alloc(4+p.length);packet.writeUIntLE(p.length,0,3);p.copy(packet,4);s.write(packet.subarray(0,5));setTimeout(()=>s.end(packet.subarray(5)),5);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{assert.equal((await advertisedTls({host:'127.0.0.1',port:server.address().port})).tlsAdvertised,true);assert.equal(bytes,0);}finally{await new Promise(r=>server.close(r));}
  const stalled=net.createServer(()=>{});await new Promise(r=>stalled.listen(0,'127.0.0.1',r));
  try{await assert.rejects(advertisedTls({host:'127.0.0.1',port:stalled.address().port},10),/CONNECTION_TIMEOUT/);}finally{stalled.close();}
});
