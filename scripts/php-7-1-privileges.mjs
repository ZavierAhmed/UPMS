import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import knex from 'knex';

export async function integrityPrivileges({envFile,db,snapshot}){
 const e=parseEnv(await readFile(envFile,'utf8'));assert.equal(e.UPMS_DB_HOST,'127.0.0.1');assert.equal(e.UPMS_DB_PORT,'3330');assert.match(e.UPMS_DB_DATABASE,/^upms_test_php_6_[a-z0-9_]+$/);
 const runtime=knex({client:'mysql2',connection:{host:e.UPMS_DB_HOST,port:3330,database:e.UPMS_DB_DATABASE,user:e.UPMS_DB_USERNAME,password:e.UPMS_DB_PASSWORD},pool:{min:0,max:1}}),denied=[],allowed=[];
 const before=await snapshot(db);
 try{
  const [[engine]]=await runtime.raw('SELECT VERSION() AS v,@@port AS p');assert.match(engine.v,/^10\.11\.19-MariaDB/);assert.equal(Number(engine.p),3330);
  for(const [table,column]of [['v1_lines','amount'],['v1_stock_journal','delta'],['v1_party_journal','debit'],['v1_audit','reason'],['v1_commands','fingerprint'],['identity_audit_events','details']]){
   for(const verb of ['UPDATE','DELETE']){
    const sql=verb==='UPDATE'?`UPDATE ${table} SET ${column}=${column} WHERE 1=0`:`DELETE FROM ${table} WHERE 1=0`;
    await assert.rejects(runtime.raw(sql),err=>['ER_TABLEACCESS_DENIED_ERROR','ER_COLUMNACCESS_DENIED_ERROR'].includes(err.code));denied.push(verb+' '+table);
   }
  }
  for(const sql of ['CREATE TABLE php71_forbidden (id INT)','DROP TABLE IF EXISTS php71_forbidden','INSERT INTO users (login_key) VALUES (\'php71-forbidden\')','DELETE FROM users WHERE 1=0','UPDATE users SET enabled=enabled WHERE 1=0','UPDATE users SET display_name=display_name WHERE 1=0','UPDATE user_roles SET role_code=role_code WHERE 1=0','DELETE FROM user_roles WHERE 1=0','INSERT INTO user_roles(user_id,role_code) VALUES (1,\'administrator\')','UPDATE roles SET name=name WHERE 1=0','UPDATE role_permissions SET role_code=role_code WHERE 1=0','UPDATE v1_control SET state=state WHERE id=1','UPDATE v1_control SET operator_id=operator_id WHERE id=1']){
   await assert.rejects(runtime.raw(sql),err=>['ER_TABLEACCESS_DENIED_ERROR','ER_COLUMNACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(err.code));denied.push(sql.split(' WHERE')[0]);
  }
  const tx=await runtime.transaction();try{
   for(const sql of ['UPDATE v1_control SET next_item_code=next_item_code WHERE id=1','UPDATE v1_control SET next_dc=next_dc WHERE id=1','UPDATE v1_documents SET payload=payload WHERE status=\'POSTED\'','UPDATE users SET password_hash=password_hash,authorization_version=authorization_version,updated_at=updated_at WHERE id=0']){await tx.raw(sql);allowed.push(sql);}
  }finally{await tx.rollback();}
  const first=await db('v1_commands').first();await assert.rejects(runtime('v1_commands').insert(first),err=>err.code==='ER_DUP_ENTRY');denied.push('Duplicate command primary key (ER_DUP_ENTRY)');
  const [grants]=await runtime.raw('SHOW GRANTS');const safeGrants=grants.flatMap(r=>Object.values(r)).filter(s=>!/IDENTIFIED|USAGE ON \*\.\*/i.test(s));
  assert.deepEqual(await snapshot(db),before);
  return {engine:engine.v,port:engine.p,denied,allowedNoopRolledBack:allowed,grants:safeGrants,businessStateUnchanged:true,rowImmutabilityEnforcedBySql:false,identityPasswordColumnsAllowed:true};
 }finally{await runtime.destroy();}
}
