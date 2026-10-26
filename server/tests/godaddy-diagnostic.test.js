import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {diagnose,connectionOptions,redactedGrants,sql} from '../../diagnostics/godaddy-db/diagnostic.mjs';
import {databaseConfig} from '../src/identity/config.js';
import mysql from 'mysql2';
import promiseMysql from 'mysql2/promise';
const env={DB_HOST:'db.fixture.test',DB_PORT:'3306',DB_NAME:'fixture_schema',DB_USER:'fixture_user',DB_PASSWORD:'private-canary-DO-NOT-LOG',UPMS_DIAGNOSTIC_EXPECTED_HOST:'db.fixture.test',UPMS_DIAGNOSTIC_EXPECTED_PORT:'3306'};
const stream=()=>({encrypted:true,authorized:true,getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:db.fixture.test'}),getCipher:()=>({name:'TLS_AES_256_GCM_SHA384'})});
function fixture({transport=stream(),override={}}={}){
 const calls=[];let destroyed=0;
 const rows={
  [sql.engine]:[{version:'8.4.13',engine_comment:'MySQL Community Server - GPL'}],
  [sql.identity]:[{schema_name:env.DB_NAME,account:env.DB_USER+'@provider-network',server_id:'123',port:3306,read_only:0}],
  [sql.uuid]:[{server_uuid:'00000000-0000-0000-0000-000000000001'}],
  [sql.tables]:[{table_count:0,production_migrations:0,identity_migrations:null}],
  [sql.grants]:[{grant:"GRANT ALL PRIVILEGES ON `fixture_schema`.* TO 'fixture_user'@'%' IDENTIFIED BY PASSWORD 'private-authentication-hash' WITH GRANT OPTION"}],...override
 };
 const connection={connection:{stream:transport},destroy(){destroyed++;},async query(options){calls.push(options);const row=rows[options.sql];if(row instanceof Error)throw row;if(typeof row==='function')return row();assert.ok(row,'Unknown query');return [row];}};
 return {connection,calls,get destroyed(){return destroyed;}};
}
test('standalone success collects only fixed SELECT/SHOW metadata after authenticated TLS',async()=>{
 const f=fixture(),r=await diagnose(env,{connect:async options=>{assert.equal(options.multipleStatements,false);assert.equal(options.debug,false);assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(options.ssl.verifyIdentity,true);assert.equal(options.ssl.minVersion,'TLSv1.2');return f.connection;}});
 assert.equal(r.status,'COLLECTED');assert.equal(r.tls.authenticated,true);assert.equal(r.database.currentUser,'fixture_user@provider-network');assert.equal(r.engine.version,'8.4.13');assert.equal(r.schema.tableCount,0);assert.equal(r.database.serverUuidSupported,true);assert.equal(r.compatibility.previewPublishIsolation,'BLOCKED_OWNER_CONFIRMED_SHARED_DATABASE');assert.equal(r.compatibility.productionInitializationAllowed,false);
 assert.deepEqual(f.calls.map(c=>c.sql),Object.values(sql));assert.ok(f.calls.every(c=>/^(SELECT|SHOW) /.test(c.sql)&&!/[;]/.test(c.sql)));assert.equal(f.destroyed,1);
 assert.equal(r.grants[0].runtimeDdl,true);assert.equal(r.grants[0].grantOption,true);assert.ok(!JSON.stringify(r).includes('private-authentication-hash'));
});
test('each missing injected credential blocks without connecting or printing its values',async()=>{
 for(const name of ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD']){let connected=false;const r=await diagnose({...env,[name]:''},{connect:async()=>{connected=true;}});assert.equal(r.code,'MISSING_CREDENTIALS');assert.equal(connected,false);assert.equal(r.identityQueriesAttempted,false);assert.ok(!JSON.stringify(r).includes(env.DB_PASSWORD));}
});
test('independent expected endpoint is mandatory; wrong host, wrong port, URI and IP endpoints fail before connection',async()=>{
 for(const [patch,code]of [[{UPMS_DIAGNOSTIC_EXPECTED_HOST:''},'EXPECTED_ENDPOINT_REQUIRED'],[{DB_HOST:'other.fixture.test'},'WRONG_HOST'],[{DB_PORT:'3307'},'WRONG_PORT'],[{DB_HOST:'mysql://bad',UPMS_DIAGNOSTIC_EXPECTED_HOST:'mysql://bad'},'INVALID_ENDPOINT'],[{DB_HOST:'127.0.0.1',UPMS_DIAGNOSTIC_EXPECTED_HOST:'127.0.0.1'},'DNS_TLS_HOST_REQUIRED'],[{DB_PORT:'03306',UPMS_DIAGNOSTIC_EXPECTED_PORT:'03306'},'INVALID_ENDPOINT']]){
  const r=await diagnose({...env,...patch},{connect:()=>assert.fail('Must not connect')});assert.equal(r.code,code);assert.equal(r.identityQueriesAttempted,false);
 }
});
test('system CA defaults remain strict; malformed custom CA and trust-all environment are rejected',()=>{
 const config=connectionOptions(env);assert.equal(config.ssl.ca,undefined);assert.throws(()=>connectionOptions({...env,NODE_TLS_REJECT_UNAUTHORIZED:'0'}),e=>e.diagnosticCode==='UNSAFE_TLS_ENVIRONMENT');assert.throws(()=>connectionOptions(env,'not-a-certificate '+env.DB_PASSWORD),e=>e.diagnosticCode==='TLS_CA_INVALID');
});
for(const [name,patch]of [['plaintext',{encrypted:false}],['encrypted only',{authorized:false}],['old TLS',{getProtocol:()=> 'TLSv1.1'}],['wrong certificate hostname',{getPeerCertificate:()=>({subjectaltname:'DNS:wrong.fixture.test'})}],['missing certificate',{getPeerCertificate:()=>({})}],['missing cipher',{getCipher:()=>({})}]])test(name+' cannot query engine, identity, tables or grants',async()=>{
 const f=fixture({transport:{...stream(),...patch}}),r=await diagnose(env,{connect:async()=>f.connection});assert.equal(r.code,'TLS_UNVERIFIED');assert.equal(r.tls.authenticated,false);assert.equal(r.identityQueriesAttempted,false);assert.equal(f.calls.length,0);assert.equal(f.destroyed,1);
});
test('driver certificate and no-SSL failures stay safe and never fall back to plaintext',async()=>{
 for(const [code,expected]of [['HANDSHAKE_SSL_ERROR','TLS_VERIFICATION_FAILED'],['ERR_TLS_CERT_ALTNAME_INVALID','TLS_VERIFICATION_FAILED'],['HANDSHAKE_NO_SSL_SUPPORT','TLS_UNAVAILABLE']]){let count=0;const r=await diagnose(env,{connect:async()=>{count++;throw Object.assign(Error('mysql://user:'+env.DB_PASSWORD+'@host/schema'),{code});}});assert.equal(r.code,expected);assert.equal(count,1);assert.equal(r.identityQueriesAttempted,false);assert.ok(!JSON.stringify(r).includes(env.DB_PASSWORD));assert.ok(!JSON.stringify(r).includes('mysql://'));}
});
test('short connection deadline destroys a late connection without permitting identity queries',async()=>{
 const f=fixture(),r=await diagnose(env,{connect:()=>new Promise(resolve=>setTimeout(()=>resolve(f.connection),20)),connectMs:2,totalMs:100});assert.equal(r.code,'CONNECT_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,30));assert.equal(f.calls.length,0);assert.equal(f.destroyed,1);
});
test('query and overall deadlines close the connection without continuing to subsequent statements',async()=>{
 for(const [queryMs,totalMs,code]of [[2,100,'QUERY_TIMEOUT'],[100,2,'TOTAL_TIMEOUT']]){const f=fixture({override:{[sql.engine]:()=>new Promise(()=>{})}}),r=await diagnose(env,{connect:async()=>f.connection,queryMs,totalMs});assert.equal(r.code,code);assert.equal(f.calls.length,1);assert.equal(f.destroyed,1);}
});
test('engine mismatch reports full permitted version and stops before schema/account identity',async()=>{
 for(const engine of [{version:'5.7.44-log',engine_comment:'MySQL Community Server'},{version:'10.4.32-MariaDB',engine_comment:'mariadb.org binary distribution'},{version:'8.4.13',engine_comment:'Unverified vendor'}]){const f=fixture({override:{[sql.engine]:[engine]}}),r=await diagnose(env,{connect:async()=>f.connection});assert.equal(r.code,'ENGINE_MISMATCH');assert.equal(r.engine.version,engine.version);assert.equal(f.calls.length,1);assert.equal(r.database,undefined);}
});
test('schema and current account mismatch stop before table metadata and grants',async()=>{
 for(const [patch,code]of [[{schema_name:'other'},'SCHEMA_MISMATCH'],[{account:'root@provider-network'},'ACCOUNT_MISMATCH']]){const f=fixture({override:{[sql.identity]:[{schema_name:env.DB_NAME,account:env.DB_USER+'@host',...patch}]}}),r=await diagnose(env,{connect:async()=>f.connection});assert.equal(r.code,code);assert.equal(f.calls.length,2);}
});
test('unsupported UUID is explicitly reported; denied UUID and grants are not misrepresented as absent',async()=>{
 const f=fixture({override:{[sql.uuid]:Object.assign(Error('unsupported'),{code:'ER_UNKNOWN_SYSTEM_VARIABLE'})}}),r=await diagnose(env,{connect:async()=>f.connection});assert.equal(r.status,'COLLECTED');assert.equal(r.database.serverUuidSupported,false);
 const denied=fixture({override:{[sql.uuid]:Object.assign(Error(env.DB_PASSWORD),{code:'ER_SPECIFIC_ACCESS_DENIED_ERROR'})}});assert.equal((await diagnose(env,{connect:async()=>denied.connection})).code,'IDENTITY_UNAVAILABLE');
 const grants=fixture({override:{[sql.grants]:Error(env.DB_PASSWORD)}});assert.equal((await diagnose(env,{connect:async()=>grants.connection})).code,'GRANTS_UNAVAILABLE');
});
test('grant redaction removes identities, hashes, roles, authentication clauses and unknown scopes',()=>{
 const text=JSON.stringify(redactedGrants([{g:"GRANT SELECT ON `private-other-schema`.`private-table` TO 'secret-account'@'private-host' IDENTIFIED BY 'private-password'"},{g:"GRANT 'private-role'@'private-host' TO 'secret-account'@'%'"},{g:'GRANT UPDATE, DELETE ON fixture_schema.v1_party_journal TO user'},{g:'GRANT SELECT ON *.* TO user'}],env.DB_NAME));
 for(const secret of ['private-other-schema','private-table','secret-account','private-host','private-password','private-role'])assert.ok(!text.includes(secret));assert.ok(text.includes('UNRECOGNIZED_REDACTED'));assert.ok(text.includes('"immutableMutation":true'));assert.ok(text.includes('"globalRights":true'));
});
test('safe reports redact secret canaries and connection URIs even in server-provided metadata',async()=>{
 const f=fixture({override:{[sql.engine]:[{version:'8.4.13',engine_comment:'MySQL '+env.DB_PASSWORD+' mysql://someone:other-secret@remote/schema'}]}}),r=await diagnose(env,{connect:async()=>f.connection}),text=JSON.stringify(r);assert.ok(!text.includes(env.DB_PASSWORD));assert.ok(!text.includes('mysql://'));assert.ok(!text.includes('other-secret'));assert.ok(text.includes('[REDACTED]'));
});
test('operational local and GoDaddy gates retain their original restrictions',()=>{
 assert.throws(()=>databaseConfig({...env,UPMS_DATABASE_PROFILE:'local-mysql'}),/explicit local DB_HOST/);for(const profile of ['godaddy-managed','godaddy-cpanel'])assert.throws(()=>databaseConfig({...env,UPMS_DATABASE_PROFILE:profile}),{code:'GODADDY_COMPATIBILITY_BLOCKED'});
});
test('CLI missing credentials, explicit invocation and non-server start emit only non-secret diagnostics',()=>{
 for(const [args,code]of [[['diagnostics/godaddy-db/cli.mjs'],'EXPLICIT_READ_ONLY_ARGUMENT_REQUIRED'],[['diagnostics/godaddy-db/cli.mjs','--run-read-only'],'MISSING_CREDENTIALS']]){const r=spawnSync(process.execPath,args,{encoding:'utf8',env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,DB_PASSWORD:env.DB_PASSWORD},windowsHide:true});assert.equal(r.status,2);assert.equal(JSON.parse(r.stdout).code,code);assert.ok(!r.stderr.includes(env.DB_PASSWORD));assert.ok(!r.stdout.includes(env.DB_PASSWORD));}
 const r=spawnSync(process.execPath,['diagnostics/godaddy-db/no-server.mjs'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,2);assert.match(r.stderr,/No web server was started/);
});
test('real mysql2 CLI handshake timeout terminates within the fixed deadline and sends no SQL',async()=>{
 const sockets=new Set();let received=0;const server=createServer(socket=>{sockets.add(socket);socket.on('data',b=>received+=b.length);socket.on('error',()=>{});socket.on('close',()=>sockets.delete(socket));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const child=spawn(process.execPath,['diagnostics/godaddy-db/cli.mjs','--run-read-only'],{env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,...env,DB_HOST:'localhost',UPMS_DIAGNOSTIC_EXPECTED_HOST:'localhost',DB_PORT:String(server.address().port),UPMS_DIAGNOSTIC_EXPECTED_PORT:String(server.address().port)},windowsHide:true,stdio:'pipe'});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 try{const [code]=await once(child,'exit');assert.equal(code,2);assert.equal(JSON.parse(stdout).code,'CONNECT_TIMEOUT');assert.equal(received,0);assert.ok(!stdout.includes(env.DB_PASSWORD));assert.ok(!stderr.includes(env.DB_PASSWORD));}finally{child.kill();for(const socket of sockets)socket.destroy();await new Promise(r=>server.close(r));}
});
test('real mysql2 refuses a simulated MySQL server without TLS before sending authentication or SQL',async()=>{
 let authentications=0,queries=0;const connections=new Set();
 const server=mysql.createServer(connection=>{connections.add(connection);connection.on('error',()=>{});connection.on('query',()=>queries++);connection.serverHandshake({protocolVersion:10,serverVersion:'8.4.13-fixture',connectionId:1,statusFlags:2,characterSet:45,capabilityFlags:0x00088201,authCallback:()=>authentications++});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const port=String(server._server.address().port),r=await diagnose({...env,DB_HOST:'localhost',UPMS_DIAGNOSTIC_EXPECTED_HOST:'localhost',DB_PORT:port,UPMS_DIAGNOSTIC_EXPECTED_PORT:port},{connect:options=>promiseMysql.createConnection(options)});assert.equal(r.code,'TLS_UNAVAILABLE');assert.equal(r.identityQueriesAttempted,false);assert.equal(authentications,0);assert.equal(queries,0);}
 finally{for(const connection of connections)connection.destroy();await new Promise(r=>server.close(r));}
});
