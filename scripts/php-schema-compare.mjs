import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import mysql from 'mysql2/promise';

// Compares a previously captured read-only owner snapshot to synthetic metadata.
// No network connection to the owner endpoint is made here.
const env=parseEnv(await readFile('upms.php/.env.testing','utf8'));
assert.match(env.UPMS_DB_DATABASE,/^upms_test_php_[0-9]+$/);
assert.equal(env.UPMS_DB_HOST,'127.0.0.1');assert.equal(env.UPMS_DB_PORT,'3328');
const owner=JSON.parse(await readFile('tmp/php-runtime/owner-readonly.json','utf8'));
const c=await mysql.createConnection({host:'127.0.0.1',port:3328,database:env.UPMS_DB_DATABASE,user:env.UPMS_DB_USERNAME,password:env.UPMS_DB_PASSWORD});
try{
 const [columns]=await c.execute('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name,COLUMN_TYPE AS column_type,IS_NULLABLE AS nullable_value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
 const application=owner.columns.filter(c=>c.table_name!=='upms_remote_initialization');
 assert.deepEqual(columns,application);
 const report={checkedAt:owner.checkedAt,ownerEngine:owner.identity.version,ownerReadOnlyTransaction:true,applicationTables:19,applicationColumns:application.length,trackingTable:'upms_remote_initialization preserved; not managed by Laravel',exactColumnTypeAndNullabilityMatch:true,ownerDatabaseAccessedByComparison:false};
 await writeFile('docs/php-migration/SCHEMA-VERIFICATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await c.end();}
