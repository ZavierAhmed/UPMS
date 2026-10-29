import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const source=process.env.PHP8_BACKUP_SCHEMA;assert.match(source||'',/^upms_test_php_6_(?:dual|backup)_[0-9]+$/);
const c=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),run=Date.now(),target='upms_test_php_8_restore_'+run,dir=resolve('tmp/php-runtime/php8-restore-'+run);await mkdir(dir);
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:c.password,database:source,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true},pool:{min:0,max:1}});
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
try{
 const [tables]=await db.raw('SHOW FULL TABLES WHERE Table_type = ?',['BASE TABLE']);const names=tables.map(t=>t[Object.keys(t)[0]]).sort(),backup=[];
 for(const name of names){const [[ddl]]=await db.raw('SHOW CREATE TABLE ??',[name]);const rows=await db(name);backup.push({name,ddl:ddl['Create Table'],rows});}
 const file=dir+'/synthetic-private-backup.json';await writeFile(file,JSON.stringify(backup),{mode:0o600});
 const saved=JSON.parse(await readFile(file,'utf8'));assert.equal(digest(saved),digest(backup));
 await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[target]);
 await db.raw('USE ??',[target]);await db.raw('SET FOREIGN_KEY_CHECKS=0');
 for(const table of saved)await db.raw(table.ddl);
 for(const table of saved)for(let i=0;i<table.rows.length;i+=100)await db(table.name).insert(table.rows.slice(i,i+100));
 await db.raw('SET FOREIGN_KEY_CHECKS=1');
 function normalized(rows){return rows.map(row=>JSON.stringify(row)).sort();}
 for(const table of saved)assert.deepEqual(normalized(await db(table.name)),normalized(table.rows),table.name+' restore mismatch');
 await db.raw('USE ??',[source]);for(const table of backup)assert.deepEqual(normalized(await db(table.name)),normalized(table.rows),'source changed');
 const result={passed:true,source,target,tables:names.length,rows:backup.reduce((n,t)=>n+t.rows.length,0),backupSha256:digest(saved),sourcePreserved:true,productionContacted:false,ownerBackupVerified:false};await writeFile(dir+'/evidence.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await db.destroy();}
