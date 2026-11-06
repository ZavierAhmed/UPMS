import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const fixture=JSON.parse(await readFile('tmp/phase-4/fixture.json','utf8'));
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,database:fixture.binding.schema},pool:{min:0,max:1}});
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replace(/AUTO_INCREMENT=\d+\s*/g,'').replace(/\s+/g,' ').trim();
try {
 const tables={};const [rows]=await db.raw('SHOW TABLES');
 for(const row of rows){const table=Object.values(row)[0];const [[ddl]]=await db.raw('SHOW CREATE TABLE ??',[table]);const [columns]=await db.raw('SHOW COLUMNS FROM ??',[table]);tables[table]={ddl:ddl['Create Table'],ddlSha256:hash(ddl['Create Table']),columns:columns.map(c=>({name:c.Field,type:c.Type,nullable:c.Null,key:c.Key,default:c.Default,extra:c.Extra}))};}
 const [guards]=await db.raw('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,DEFINER,SQL_MODE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME');
 const source=JSON.parse(await readFile('docs/phase-4/evidence/host-inventory.json','utf8'));
 const comparison={sourceTables:source.tableCount,targetTables:Object.keys(tables).length,sourceGuards:source.guardCount,targetGuards:guards.length,addedTables:[],sourceOnlyTables:[],changedTables:[],unchangedTables:[],addedGuards:[],changedGuards:[],unchangedGuardBodies:[],sourceOnlyGuards:[]};
 for(const [name,target] of Object.entries(tables)){const original=source.tables[name];if(!original)comparison.addedTables.push(name);else if(normalize(original.ddl)===normalize(target.ddl))comparison.unchangedTables.push(name);else comparison.changedTables.push({table:name,sourceDdlSha256:original.ddlSha256,targetDdlSha256:target.ddlSha256});}
 comparison.sourceOnlyTables=Object.keys(source.tables).filter(t=>!tables[t]);
 const originalGuards=new Map(source.guards.map(g=>[g.TRIGGER_NAME,g]));
 for(const rule of guards){const before=originalGuards.get(rule.TRIGGER_NAME);if(!before){comparison.addedGuards.push(rule.TRIGGER_NAME);continue;}const normalized=rule.ACTION_STATEMENT.replaceAll(fixture.binding.runtime,'upms_runtime84');if(before.ACTION_STATEMENT===normalized&&before.EVENT_MANIPULATION===rule.EVENT_MANIPULATION&&before.EVENT_OBJECT_TABLE===rule.EVENT_OBJECT_TABLE&&before.ACTION_TIMING===rule.ACTION_TIMING)comparison.unchangedGuardBodies.push(rule.TRIGGER_NAME);else comparison.changedGuards.push({name:rule.TRIGGER_NAME,sourceBody:before.ACTION_STATEMENT,targetBody:normalized});}
 comparison.sourceOnlyGuards=source.guards.filter(g=>!guards.some(t=>t.TRIGGER_NAME===g.TRIGGER_NAME)).map(g=>g.TRIGGER_NAME);
 comparison.identityRemapping='Comparison substitutes only the isolated runtime username; target definer identities are not approved production identities.';
 await writeFile('docs/phase-4/evidence/target-schema.json',JSON.stringify({schema:fixture.binding.schema,tables,guards},null,2)+'\n');
 await writeFile('docs/phase-4/evidence/schema-comparison.json',JSON.stringify(comparison,null,2)+'\n');
 console.log(JSON.stringify({sourceTables:source.tableCount,targetTables:Object.keys(tables).length,added:comparison.addedTables.length,sourceOnly:comparison.sourceOnlyTables,changed:comparison.changedTables.map(t=>t.table),newGuards:comparison.addedGuards.length,changedGuards:comparison.changedGuards.map(t=>t.name)}));
} finally {await db.destroy();}
