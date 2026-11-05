import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';

if(!process.argv.includes('--confirm-empty-test-only'))throw Error('EXPLICIT_EMPTY_TEST_SCOPE_REQUIRED');
await verifyUatEngine();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const fixture=JSON.parse(await readFile('tmp/php-runtime/uat2a-extras.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(row)).sort())).digest('hex');
async function owners() {
 const result={};
 for(const name of ['owner-uat-binding.json','uath1-owner-binding.json','uat2-owner-binding.json']) {
  const binding=JSON.parse(await readFile('tmp/php-runtime/'+name,'utf8'));
  assert.match(binding.schema,/^upms_test_php_[a-z0-9_]+$/);
  const [tables]=await db.raw('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME',[binding.schema]);
  const rows={};for(const table of tables){const [data]=await db.raw('SELECT * FROM ??.??',[binding.schema,table.name]);rows[table.name]=hash(data);}
  result[name]=rows;
 }
 return result;
}
try {
 const [tables]=await db.raw("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='test' OR LEFT(TABLE_SCHEMA,5)='test_'");
 assert.equal(tables.length,0,'PUBLIC scope contains existing objects; stop for review');
 const [publicRows]=await db.raw('SELECT * FROM mysql.db WHERE User=?',['PUBLIC']);
 assert.ok(publicRows.every(row=>['test','test\\_%'].includes(row.Db)),'Unexpected PUBLIC scope; stop for review');
 const [specificBefore]=await db.raw('SELECT * FROM mysql.db WHERE User<>?',['PUBLIC']);
 const ownerBefore=await owners();
 const [rawGrants]=await db.raw('SHOW GRANTS FOR PUBLIC');
 try { await writeFile(fixture.binding.directory+'/public-grants-before.json',JSON.stringify(rawGrants),{flag:'wx'}); }
 catch(error) { if(error.code!=='EEXIST')throw error; }
 for(const row of publicRows)await db.raw('REVOKE ALL PRIVILEGES ON ??.* FROM PUBLIC',[row.Db]);
 const [specificAfter]=await db.raw('SELECT * FROM mysql.db WHERE User<>?',['PUBLIC']);
 assert.equal(hash(specificBefore),hash(specificAfter));
 assert.deepEqual(await owners(),ownerBefore);
 const [remaining]=await db.raw('SELECT Db FROM mysql.db WHERE User=?',['PUBLIC']);assert.equal(remaining.length,0);
 const path='docs/uat-2a/evidence/local-public-grants.json';
 let prior=null;try{prior=await readFile(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(publicRows.length||prior===null)await writeFile(path,JSON.stringify({passed:true,pinnedLocalEngine:true,matchingExistingTables:0,removedScopes:publicRows.map(row=>row.Db),accountSpecificGrantsUnchanged:true,allThreeOwnerRowFingerprintsUnchanged:true,ownerDatabaseMigrated:false,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2));
 console.log(JSON.stringify({passed:true,removedEmptyLocalPublicScopes:publicRows.length,allThreeOwnerRowsUnchanged:true,accountSpecificGrantsUnchanged:true}));
} finally {await db.destroy();}
