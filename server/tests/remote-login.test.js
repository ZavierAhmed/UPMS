import test from 'node:test';
import assert from 'node:assert/strict';
import knex from 'knex';
import {loginSqlAllowed,loginHttpAllowed,createLoginDatabase} from '../src/development/login.js';
const env={NODE_ENV:'development',UPMS_DATABASE_PROFILE:'remote-cpanel-development',UPMS_SIMPLE_V1:'remote-development-v1',
  DB_HOST:'184.168.100.110',DB_PORT:'3306',DB_NAME:'upms',DB_USER:'upms_user',DB_PASSWORD:'fixture-private'};

test('authentication-only SQL permits existing session, throttle, audit and password-change statements',async()=>{
  const db=knex({client:'mysql2'});
  try{
    const statements=[db('sessions').insert({token_hash:'x',data:'{}'}).onConflict('token_hash').merge(),
      db('sessions').where({token_hash:'x'}).update({revoked:true,data:'{}'}),db('sessions').where({user_id:1}).delete(),
      db('login_attempts').insert({bucket:'x',window_start:1,attempts:1}).onConflict('bucket').merge(),
      db('login_attempts').where({bucket:'x'}).update({attempts:2}),db('login_attempts').where('window_start','<',1).delete(),
      db('identity_audit_events').insert({action:'login.succeeded'}),db('users').where({id:1}).update({password_hash:'x',authorization_version:2,updated_at:new Date()}),
      db('identity_guard').where({id:1}).forUpdate().first()];
    for(const q of statements)assert.equal(loginSqlAllowed(q.toSQL().sql),true,q.toSQL().sql);
    for(const sql of ['BEGIN;','COMMIT;','ROLLBACK','SELECT 1','SHOW GRANTS FOR CURRENT_USER'])assert.equal(loginSqlAllowed(sql),true);
  }finally{await db.destroy();}
});
test('authentication-only SQL rejects business changes, schema changes and account administration',()=>{
  for(const sql of ['CREATE TABLE anything (id int)','ALTER TABLE users ADD anything int','DROP TABLE users','TRUNCATE TABLE sessions',
    'insert into `v1_documents` (`kind`) values (?)','update `v1_stock` set `quantity` = ? where `item_id` = ?',
    'delete from `v1_lines` where `id` = ?','insert into `users` (`login_key`) values (?)',
    'update `users` set `enabled` = ? where `id` = ?','delete from `users` where `id` = ?',
    'update `identity_audit_events` set `details` = ?','GRANT ALL ON upms.* TO x','SET GLOBAL read_only=0',
    'SELECT * FROM users INTO OUTFILE \'x\''])assert.equal(loginSqlAllowed(sql),false,sql);
});
test('HTTP boundary exposes only explicitly approved login, session and password routes',()=>{
  for(const route of ['csrf','current'])assert.equal(loginHttpAllowed('GET','/api/v1/management/session/'+route),true);
  for(const route of ['session/login','session/logout','profile/password'])assert.equal(loginHttpAllowed('POST','/api/v1/management/'+route),true);
  for(const method of ['GET','POST','PATCH','DELETE'])for(const path of ['/api/v1/management/simple-v1/documents','/api/v1/management/users','/api/v1/management/simple-v1/items'])
    assert.equal(loginHttpAllowed(method,path),false);
  assert.equal(loginHttpAllowed('POST','/api/v1/management/session/csrf'),false);
});
test('plaintext authentication requires explicit option and remains development/endpoint restricted',()=>{
  assert.throws(()=>createLoginDatabase(env),/TLS_CONFIGURATION_REQUIRED/);
  assert.throws(()=>createLoginDatabase({...env,NODE_ENV:'production'},{plaintext:true}),/REMOTE_TARGET_REJECTED/);
  assert.throws(()=>createLoginDatabase({...env,DB_HOST:'localhost'},{plaintext:true}),/REMOTE_TARGET_REJECTED/);
  assert.throws(()=>createLoginDatabase({...env,DB_PASSWORD:''},{plaintext:true}),/MISSING_CREDENTIALS/);
});
