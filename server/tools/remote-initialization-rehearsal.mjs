// Writes ONLY a fresh synthetic schema on the dedicated loopback test instance.
import knex from 'knex';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {initializeIsolated,schemaTables} from '../src/development/initialize.js';
import {transaction} from '../src/identity/database.js';
const schema='upms_test_remote_rehearsal_20261026';
let owner,db;
try{
  owner=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3317,user:'root',password:process.env.REHEARSAL_ROOT_PASSWORD||''},pool:{min:0,max:2},log:{warn(){},error(){}}});
  const [[state]]=await owner.raw('SELECT @@server_id AS id,@@port AS port,VERSION() AS version,@@innodb_force_recovery AS recovery');
  assert.equal(Number(state.id),331726);assert.equal(Number(state.port),3317);assert.equal(Number(state.recovery),0);assert.match(state.version,/^10\.11\.19-MariaDB/);
  assert.equal((await owner.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]))[0].length,0,'Never reset an existing schema');
  const password=process.env.REHEARSAL_ROOT_PASSWORD||randomBytes(36).toString('base64url');
  if(!process.env.REHEARSAL_ROOT_PASSWORD){await owner.raw("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[password]);owner.client.connectionSettings.password=password;}
  await writeFile('server/.local/remote-cpanel-dev/rehearsal-secret.json',JSON.stringify({password}),{mode:0o600});
  await owner.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);
  db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3317,user:'root',password,database:schema},pool:{min:0,max:3},log:{warn(){},error(){}}});
  const env={NODE_ENV:'development',DB_CONFIRM_NAME:schema};
  assert.equal((await initializeIsolated(db,env)).alreadyInitialized,false);
  const counts=await db('roles').count('* AS n');
  assert.equal((await initializeIsolated(db,env)).alreadyInitialized,true);
  assert.deepEqual(await db('roles').count('* AS n'),counts);
  for(const table of schemaTables)assert.equal(await db.schema.hasTable(table),true);
  assert.equal((await db('users')).length,0,'No account bootstrap');assert.equal((await db('v1_control').first()).state,'PENDING');
  await assert.rejects(transaction(db,async trx=>{await trx('roles').insert({code:'rollback_test',name:'Synthetic'});throw Error('rollback');}),/rollback/);
  assert.equal(await db('roles').where({code:'rollback_test'}).first(),undefined);
  // Real pool reconnection after a discarded socket, followed by a concurrent pool workload.
  const connection=await db.client.acquireConnection();connection.destroy();await db.client.releaseConnection(connection);
  await Promise.all(Array.from({length:8},()=>db('roles').select('code')));
  await db.schema.createTable('unexpected_partial',t=>t.integer('id'));
  await assert.rejects(initializeIsolated(db,env),/Existing\/partial schema/);
  const result={passed:true,version:state.version,schema,port:3317,serverId:331726,
    checks:['fresh initialization','idempotent repeat','19 expected application tables','no users or business data seeded',
      'transaction rollback','pool reconnection','concurrent pooled reads','partial schema refused'],remoteOwnerDatabaseTouched:false};
  await writeFile('server/.local/remote-cpanel-dev/rehearsal-results.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}catch{console.error(JSON.stringify({passed:false,code:'ISOLATED_REHEARSAL_FAILED',preserveTestState:true}));process.exitCode=1;}
finally{await db?.destroy();await owner?.destroy();}
