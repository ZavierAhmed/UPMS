import test from 'node:test';
import assert from 'node:assert/strict';
import knex from 'knex';
import {managementSqlAllowed,managementHttpAllowed,createManagementDatabase,loginSqlAllowed} from '../src/development/login.js';
import {v1Privileges} from '../src/simple-v1/catalog.js';
import {activateRemoteManagement} from '../src/development/activation.js';
const env={NODE_ENV:'development',UPMS_DATABASE_PROFILE:'remote-cpanel-development',UPMS_SIMPLE_V1:'remote-development-v1',
  DB_HOST:'184.168.100.110',DB_PORT:'3306',DB_NAME:'upms',DB_USER:'upms_user',DB_PASSWORD:'fixture-private'};

test('full remote development permits the existing Simple V1 table privileges while authentication-only stays restricted',async()=>{
  const db=knex({client:'mysql2'});
  try{
    for(const [table,rights]of Object.entries(v1Privileges)){
      const insert=db(table).insert({id:1}).toSQL().sql,update=db(table).where({id:1}).update({version:2}).toSQL().sql;
      assert.equal(managementSqlAllowed(insert),rights.includes('INSERT'),insert);
      assert.equal(managementSqlAllowed(update),rights.includes('UPDATE'),update);
      assert.equal(managementSqlAllowed(db(table).where({id:1}).delete().toSQL().sql),false);
      assert.equal(loginSqlAllowed(insert),false);assert.equal(loginSqlAllowed(update),false);
    }
  }finally{await db.destroy();}
});
test('append-only journal, audit and idempotency tables cannot be changed through upserts',()=>{
  for(const table of ['v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands'])
    assert.equal(managementSqlAllowed('insert into `'+table+'` (`id`) values (?) on duplicate key update `id` = ?'),false);
  assert.equal(managementSqlAllowed('insert into `v1_stock` (`item_id`) values (?) on duplicate key update `quantity` = ?'),true);
  for(const sql of ['CREATE TABLE x (id int)','ALTER TABLE v1_stock ADD x int','DROP DATABASE upms',
    'insert into `users` (`login_key`) values (?)','update `user_roles` set `role_code` = ?',
    'insert into `legacy_documents` (`id`) values (?)'])assert.equal(managementSqlAllowed(sql),false,sql);
});
test('management HTTP exposes Simple V1 features and authentication without legacy ERP or destructive routes',()=>{
  for(const method of ['GET','POST','PATCH'])for(const path of ['items','parties','documents','documents/1/post','ledgers/1','register','reconciliation'])
    assert.equal(managementHttpAllowed(method,'/api/v1/management/simple-v1/'+path),true);
  for(const path of ['/api/v1/management/users','/api/v1/management/inventory','/api/v1/management/simple-v1-other'])assert.equal(managementHttpAllowed('POST',path),false);
  assert.equal(managementHttpAllowed('DELETE','/api/v1/management/simple-v1/items/1'),false);
  assert.equal(managementHttpAllowed('POST','/api/v1/management/session/login'),true);
});
test('management pool requires the explicit plaintext option and rejects production or changed endpoints',()=>{
  assert.throws(()=>createManagementDatabase(env),/TLS_CONFIGURATION_REQUIRED/);
  for(const changed of [{NODE_ENV:'production'},{DB_HOST:'127.0.0.1'},{DB_NAME:'upms_dev'},{DB_USER:'root'}])
    assert.throws(()=>createManagementDatabase({...env,...changed},{plaintext:true}),/REMOTE_TARGET_REJECTED/);
});
test('activation requires the exact confirmed target, existing operator and remote-development database',async()=>{
  for(const confirmation of [{target:'localhost/upms',operatorId:'1'},{target:'184.168.100.110:3306/upms',operatorId:'2'}])
    await assert.rejects(activateRemoteManagement({upmsRemoteDevelopment:true},env,confirmation),/REMOTE_TARGET_REJECTED/);
  await assert.rejects(activateRemoteManagement({},env,{target:'184.168.100.110:3306/upms',operatorId:'1'}),/REMOTE_TARGET_REJECTED/);
});
