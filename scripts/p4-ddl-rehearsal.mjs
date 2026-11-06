// DDL-only rehearsal on the authenticated local production RESTORE, never on hosting.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const privateRoot='tmp/protected-offhost-backups';
const binding=JSON.parse(await readFile(privateRoot+'/p4-restore-binding.json','utf8'));
assert.match(binding.schema,/^upms_test_php_p4_restore_[a-z0-9]+$/);assert.equal(binding.port,3330);
const source=JSON.parse(await readFile('docs/phase-4/evidence/host-inventory.json','utf8'));
const target=JSON.parse(await readFile('docs/phase-4/evidence/target-schema.json','utf8'));
const fixture=JSON.parse(await readFile('tmp/phase-4/fixture.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replace(/AUTO_INCREMENT=\d+\s*/g,'').replace(/\s+/g,' ').trim();
const added=Object.keys(target.tables).filter(t=>!source.tables[t]);
const known=new Set(Object.keys(source.tables)),ordered=[];
while(ordered.length<added.length){const next=added.filter(t=>!known.has(t)).find(t=>[...target.tables[t].ddl.matchAll(/REFERENCES `([^`]+)`/g)].every(([,parent])=>parent===t||known.has(parent)));if(!next)throw Error('DDL dependency cycle requires review');known.add(next);ordered.push(next);}
const oldGuards=new Set(source.guards.map(g=>g.TRIGGER_NAME));
const guards=target.guards.filter(g=>!oldGuards.has(g.TRIGGER_NAME));
const plan={kind:'STRUCTURAL_REHEARSAL_ONLY_NOT_A_PRODUCTION_MIGRATOR',sourceSchema:'upms_v1',sourceTables:20,targetTables:47,sourceGuards:45,targetGuards:133,tables:ordered.map(name=>({name,ddl:target.tables[name].ddl})),guards:guards.map(g=>({name:g.TRIGGER_NAME,table:g.EVENT_OBJECT_TABLE,event:g.EVENT_MANIPULATION,timing:g.ACTION_TIMING,body:g.ACTION_STATEMENT.replaceAll(fixture.binding.runtime,'__REVIEWED_RUNTIME__')})),businessBackfill:'NONE - owner/accountant approvals and production receipt contracts required',activationPermitted:false};
const planHash=hash(JSON.stringify(plan));await writeFile('docs/phase-4/evidence/structural-transition-plan.json',JSON.stringify({...plan,sha256:planHash},null,2)+'\n');
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:binding.maintainer,password:binding.maintainerPassword,database:binding.schema,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true},pool:{min:0,max:1}});
const journalPath=privateRoot+'/p4-ddl-journal.json';
const fingerprint=async()=>{const out={};for(const table of Object.keys(source.tables)){const rows=(await db(table)).map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,v===null?null:String(v)])))).sort();out[table]={rows:rows.length,sha256:hash(JSON.stringify(rows))};}return out;};
let journal;
try{
 const [[identity]]=await db.raw('SELECT DATABASE() schema_name,CURRENT_USER() account');assert.equal(identity.schema_name,binding.schema);assert.equal(identity.account,binding.maintainer+'@localhost');
 try{journal=JSON.parse(await readFile(journalPath,'utf8'));assert.equal(journal.planHash,planHash);assert.equal(journal.schema,binding.schema);}catch(e){if(e.code!=='ENOENT')throw e;journal={schema:binding.schema,planHash,original:await fingerprint(),completedTables:[],completedGuards:[],inFlight:null,interruptionTested:false};await writeFile(journalPath,JSON.stringify(journal,null,2));}
 const persist=()=>writeFile(journalPath,JSON.stringify(journal,null,2));
 async function apply(interrupt){
  for(const step of plan.tables){
   if(journal.completedTables.includes(step.name))continue;
   const exists=await db.schema.hasTable(step.name);
   if(exists){
    assert.equal(journal.inFlight?.name,step.name,'Unowned existing DDL is never accepted');
    const [[r]]=await db.raw('SHOW CREATE TABLE ??',[step.name]);assert.equal(normalize(r['Create Table']),normalize(step.ddl));
    assert.equal(Number((await db(step.name).count('* as n').first()).n),0,'Interrupted new tables must still be empty');
   }else{
    journal.inFlight={type:'table',name:step.name,ddlHash:hash(normalize(step.ddl))};await persist();await db.raw(step.ddl);
    if(interrupt&&journal.completedTables.length===8){journal.interruptionTested=true;await persist();throw Error('SIMULATED_DDL_INTERRUPTION_AFTER_CREATE_BEFORE_RECEIPT');}
   }
   journal.completedTables.push(step.name);journal.inFlight=null;await persist();
  }
  for(const rule of plan.guards){
   if(journal.completedGuards.includes(rule.name))continue;
   journal.inFlight={type:'guard',name:rule.name};await persist();
   await db.raw('CREATE TRIGGER ?? '+rule.timing+' '+rule.event+' ON ?? FOR EACH ROW '+rule.body.replaceAll('__REVIEWED_RUNTIME__',binding.runtime),[rule.name,rule.table]);
   journal.completedGuards.push(rule.name);journal.inFlight=null;await persist();
  }
 }
 let interruption;
 if(!journal.interruptionTested){try{await apply(true);}catch(e){assert.equal(e.message,'SIMULATED_DDL_INTERRUPTION_AFTER_CREATE_BEFORE_RECEIPT');interruption={expected:true,phase:'table-create-completed-before-receipt',recordedTables:journal.completedTables.length,inFlight:journal.inFlight};assert.deepEqual(await fingerprint(),journal.original);}}
 await apply(false);
 assert.deepEqual(await fingerprint(),journal.original);
 const [tables]=await db.raw('SHOW TABLES');const [actualGuards]=await db.raw('SELECT TRIGGER_NAME,ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()');assert.equal(tables.length,47);assert.equal(actualGuards.length,133);
 for(const [table,definition] of Object.entries(target.tables)){const [[actual]]=await db.raw('SHOW CREATE TABLE ??',[table]);assert.equal(normalize(actual['Create Table']),normalize(definition.ddl));}
 for(const rule of target.guards){const actual=actualGuards.find(g=>g.TRIGGER_NAME===rule.TRIGGER_NAME);assert.equal(actual?.ACTION_STATEMENT,rule.ACTION_STATEMENT.replaceAll(fixture.binding.runtime,binding.runtime));}
 const newRows={};for(const table of added){newRows[table]=Number((await db(table).count('* as n').first()).n);assert.equal(newRows[table],0);}
 await writeFile('docs/phase-4/evidence/ddl-rehearsal.json',JSON.stringify({passed:true,kind:'STRUCTURAL_ONLY',schema:binding.schema,planHash,sourceCipherSha256:binding.sourceCipherSha256,tables:47,guards:133,addedTables:27,addedGuards:88,interruption,originalRowsUnchanged:true,originalRowCounts:journal.original,newTableRows:newRows,productionWrites:0,syntheticDataImported:false,applicationReady:false,blocker:'Production receipts, historical allocation policy, permissions and approved production-profile contracts are deliberately not fabricated'},null,2)+'\n');
 console.log('Structural rehearsal passed: 27 tables and 88 guards added; crash/resume verified; all original restored rows preserved. Operational migration remains blocked.');
}finally{await db.destroy();}
