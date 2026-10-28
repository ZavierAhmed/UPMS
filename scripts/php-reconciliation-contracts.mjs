import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import knex from 'knex';
import {digest} from '../server/src/identity/service.js';
import {simpleV1Service} from '../server/src/simple-v1/service.js';

const env=parseEnv(await readFile('upms.php/.env.testing','utf8'));
assert.match(env.UPMS_DB_DATABASE,/^upms_test_php_[0-9]+$/);
assert.equal(env.UPMS_DB_HOST,'127.0.0.1');assert.equal(env.UPMS_DB_PORT,'3328');
assert.ok(process.env.PHP_TEST_ADMIN_PASSWORD);
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3328,user:'root',password:process.env.PHP_TEST_ADMIN_PASSWORD,database:env.UPMS_DB_DATABASE,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true},pool:{min:0,max:1}});
try{
 const fixture=JSON.parse(await readFile('tmp/php-runtime/contracts.json','utf8'));assert.equal(fixture.database,env.UPMS_DB_DATABASE);
 const session={userId:'1',authVersion:1,issuedAt:Date.now(),recordHash:digest(randomUUID())};
 await db('sessions').insert({token_hash:session.recordHash,user_id:'1',data:JSON.stringify(session),idle_expires:Date.now()+1800000,absolute_expires:Date.now()+28800000});
 const cases=[
  {table:'v1_stock',key:'item_id',id:fixture.ids.item,values:{quantity:'999'}},
  {table:'v1_documents',key:'id',id:fixture.ids.challan,values:{total:'0.01'}},
  {table:'v1_documents',key:'id',id:fixture.ids.challan,values:{discount_amount:'0.01'}},
  {table:'v1_lines',key:'id',id:String((await db('v1_lines').where({document_id:fixture.ids.challan}).first()).id),values:{amount:'0.01'}},
  {table:'v1_documents',key:'id',id:fixture.ids.draft,values:{official_number:'UNPOSTED-TEST'}},
 ];
 const returned=await db('v1_documents').where({kind:'CHALLAN_RETURN',status:'POSTED'}).first();
 cases.push({table:'v1_documents',key:'id',id:String(returned.id),values:{total:'0.01'}});
 fixture.reconciliationCorruptions=[];
 for(const test of cases){const before=await db(test.table).where(test.key,test.id).first();const restore=Object.fromEntries(Object.keys(test.values).map(k=>[k,before[k]]));try{await db(test.table).where(test.key,test.id).update(test.values);const expected=await simpleV1Service(db).reconcile(session);assert.equal(expected.matched,false);fixture.reconciliationCorruptions.push({...test,restore,expected});}finally{await db(test.table).where(test.key,test.id).update(restore);}}
 assert.equal((await simpleV1Service(db).reconcile(session)).matched,true);
 await writeFile('tmp/php-runtime/contracts.json',JSON.stringify(fixture,null,2));
 console.log(JSON.stringify({reconciliationCorruptionContracts:cases.length,ownerDatabaseAccessed:false}));
}finally{await db.destroy();}
