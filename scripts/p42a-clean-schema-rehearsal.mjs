import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, open, readFile, rename, realpath, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import mysql from 'mysql2/promise';
import { verifyUatEngine } from './php-7-5-engine-guard.mjs';
import { protectPrivateDirectory } from './php-7-5-private-directory.mjs';

// Structural acceptance only. This entry point cannot select a hosted schema.
const engine = await verifyUatEngine();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const definition = await readFile('docs/phase-4/evidence/target-schema.json');
const planHash = sha(definition);
assert.equal(planHash, '6c724e1434fb1e2cbf933b0d3b9ecec88938705be2abebed9dc32d62b108f7ac');
const plan = JSON.parse(definition);
const tables = Object.entries(plan.tables);
assert.equal(tables.length, 47);
assert.equal(plan.guards.length, 133);
const normalize = ddl => ddl.replace(/ AUTO_INCREMENT=[0-9]+/g, '');
const ident = name => {
  assert.match(name, /^[a-zA-Z0-9_]+$/);
  return '`' + name + '`';
};
const steps = [];
const known = new Set();
while (steps.length < tables.length) {
  const next = tables.find(([name, table]) => !known.has(name) &&
    [...table.ddl.matchAll(/REFERENCES `([^`]+)`/g)].every(([, parent]) => parent === name || known.has(parent)));
  assert.ok(next, 'Foreign-key dependency ordering failed');
  const [name, table] = next;
  assert.ok(table.ddl.startsWith('CREATE TABLE ' + ident(name) + ' ('));
  steps.push({ type: 'table', name, ddl: normalize(table.ddl) });
  known.add(name);
}
for (const guard of plan.guards) {
  assert.ok(known.has(guard.EVENT_OBJECT_TABLE));
  assert.ok(['BEFORE','AFTER'].includes(guard.ACTION_TIMING));
  assert.ok(['INSERT','UPDATE','DELETE'].includes(guard.EVENT_MANIPULATION));
  steps.push({ type:'guard', name:guard.TRIGGER_NAME, guard });
}
const base = await realpath('tmp/php-runtime');
const connect = (user, password, database) =>
  mysql.createConnection({ host:'127.0.0.1', port:3330, user,password,database,multipleStatements:false });
const account = name => "'" + name + "'@'localhost'";
const roles = { installer:'CREATE, REFERENCES, SELECT', definer:'SELECT, TRIGGER', runtime:'DELETE, INSERT, SELECT, UPDATE' };
const bindingFor = id => ({
  schema:'upms_test_php_p42a_' + id,
  users:{installer:'p42ai_'+id,definer:'p42ad_'+id,runtime:'p42ar_'+id},
});
const scopeFor = schema => '`' + schema.replaceAll('_','\\_') + '`';
async function writeJournal(path, value) {
  const next = path + '.pending';
  const file = await open(next,'wx',0o600);
  try { await file.writeFile(JSON.stringify(value)); await file.sync(); }
  finally { await file.close(); }
  await rename(next,path);
}

async function apply(id, interrupt) {
  assert.match(id,/^[0-9]{13}$/);
  const path = await realpath(resolve(base,'p42a-'+id));
  assert.ok(path.startsWith(base+sep));
  const {schema,users} = bindingFor(id);
  const passwords = JSON.parse(await readFile(resolve(path,'binding.json'),'utf8'));
  const journalPath = resolve(path,'journal.json');
  const receipt = JSON.parse(await readFile(journalPath,'utf8'));
  assert.equal(receipt.schema,schema);
  assert.equal(receipt.planHash,planHash);
  assert.ok(Number.isInteger(receipt.completed) && receipt.completed >= 0 && receipt.completed <= steps.length);
  assert.ok(receipt.inFlight === null || receipt.inFlight === receipt.completed);
  const conns = {};
  try {
    for (const [role,user] of Object.entries(users)) {
      const db = conns[role] = await connect(user,passwords[role],schema);
      const [[idRow]] = await db.query('SELECT CURRENT_USER() AS account,DATABASE() AS db');
      assert.deepEqual(idRow,{account:user+'@localhost',db:schema});
      const [grants] = await db.query('SHOW GRANTS');
      assert.equal(grants.length,2);
      const rows = grants.map(row=>Object.values(row)[0]);
      assert.ok(rows.some(row=>row.startsWith('GRANT USAGE ON *.* TO ') && !row.includes('WITH GRANT OPTION')));
      const scoped = rows.find(row=>row.includes(' ON '+scopeFor(schema)+'.* TO '));
      assert.ok(scoped && !scoped.includes('WITH GRANT OPTION'), 'Unexpected scope for '+role);
      const privileges = scoped.split(' ON ')[0].slice(6).split(', ').sort();
      assert.deepEqual(privileges,roles[role].split(', ').sort(), 'Unexpected privileges for '+role);
    }
    const db=conns.installer;
    const guardDb=conns.definer;
    const [[lock]]=await db.query('SELECT GET_LOCK(?,0) AS acquired',['p42a:'+schema]);
    assert.equal(lock.acquired,1);
    const mode=plan.guards[0].SQL_MODE;
    await guardDb.query('SET SESSION sql_mode=?',[mode]);
    async function inventory() {
      const [tableRows]=await db.query('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
      const [guardRows]=await guardDb.query('SELECT TRIGGER_NAME name, EVENT_MANIPULATION event, EVENT_OBJECT_TABLE tableName, ACTION_TIMING timing, ACTION_STATEMENT body, DEFINER definer, SQL_MODE mode FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()');
      return { table:new Map(tableRows.map(row=>[row.name,row])),guard:new Map(guardRows.map(row=>[row.name,row])) };
    }
    const bodyFor=guard=>guard.ACTION_STATEMENT.replaceAll('money_rt_1793900070360',users.runtime);
    async function verify(step, state) {
      assert.ok(state[step.type].has(step.name), 'Completed step missing: '+step.name);
      if(step.type==='table'){
        const [[table]]=await db.query('SHOW CREATE TABLE '+ident(step.name));
        assert.equal(normalize(table['Create Table']),step.ddl,step.name);
        const [[count]]=await db.query('SELECT COUNT(*) n FROM '+ident(step.name));
        assert.equal(Number(count.n),0,'Expected clean empty table: '+step.name);
      }else{
        const g=step.guard;
        assert.deepEqual(state.guard.get(step.name),{name:step.name,event:g.EVENT_MANIPULATION,
          tableName:g.EVENT_OBJECT_TABLE,timing:g.ACTION_TIMING,body:bodyFor(g),
          definer:users.definer+'@localhost',mode:g.SQL_MODE});
      }
    }
    const existing=await inventory();
    const permitted=steps.slice(0,receipt.completed+(receipt.inFlight===null?0:1));
    for(const type of ['table','guard']){
      const allowed=new Set(permitted.filter(step=>step.type===type).map(step=>step.name));
      for(const name of existing[type].keys()) assert.ok(allowed.has(name),'Unexpected object: '+name);
    }
    for(const step of steps.slice(0,receipt.completed)) await verify(step,existing);
    while(receipt.completed<steps.length){
      const step=steps[receipt.completed];
      if(!existing[step.type].has(step.name)){
        receipt.inFlight=receipt.completed;
        await writeJournal(journalPath,receipt);
        if(step.type==='table') await db.query(step.ddl);
        else{
          const g=step.guard;
          await guardDb.query('CREATE TRIGGER '+ident(step.name)+' '+g.ACTION_TIMING+' '+g.EVENT_MANIPULATION+
            ' ON '+ident(g.EVENT_OBJECT_TABLE)+' FOR EACH ROW '+bodyFor(g));
        }
        if(interrupt && receipt.completed===8) process.exit(41);
      }else await verify(step,existing);
      receipt.completed++;
      receipt.inFlight=null;
      await writeJournal(journalPath,receipt);
    }
    const actual=await inventory();
    assert.equal(actual.table.size,47);
    assert.equal(actual.guard.size,133);
    for(const step of steps) await verify(step,actual);
    await assert.rejects(conns.runtime.query('CREATE TABLE p42a_denied (id INT)'),error=>error.errno===1142);
    return {passed:true,kind:'ISOLATED_STRUCTURAL_ONLY',schema,planHash,tables:47,guards:133,
      verifiedIndexes:true,verifiedGuardBodiesAndDefiners:true,restrictedRuntime:true,emptyTables:true,
      businessReady:false,productionWrites:0};
  }finally{
    await Promise.allSettled(Object.values(conns).map(db=>db.end()));
  }
}

if(process.argv[2]==='--apply'){
  const result=await apply(process.argv[3],process.argv.includes('--interrupt'));
  console.log(JSON.stringify(result));
}else{
  const id=String(Date.now());
  const path=resolve(base,'p42a-'+id);
  await mkdir(path);
  await protectPrivateDirectory(path);
  const {schema,users}=bindingFor(id);
  const passwords=Object.fromEntries(Object.keys(users).map(role=>[role,randomBytes(32).toString('hex')]));
  const adminConfig=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
  const admin=await connect('php2_test_admin',adminConfig.password);
  try{
    await admin.query('CREATE DATABASE '+ident(schema)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    for(const [role,user] of Object.entries(users)){
      await admin.query('CREATE USER '+account(user)+' IDENTIFIED BY ?',[passwords[role]]);
      await admin.query('GRANT '+roles[role]+' ON '+scopeFor(schema)+'.* TO '+account(user));
    }
    await writeFile(resolve(path,'binding.json'),JSON.stringify(passwords),{flag:'wx',mode:0o600});
    await writeJournal(resolve(path,'journal.json'),{schema,planHash,completed:0,inFlight:null});
  }finally{await admin.end();}
  const run=flags=>spawnSync(process.execPath,[process.argv[1],'--apply',id,...flags],{encoding:'utf8',timeout:240000});
  const interrupted=run(['--interrupt']);
  assert.equal(interrupted.status,41,'First worker did not reach the intended interruption');
  const resumed=run([]);
  assert.equal(resumed.status,0,'Resume worker rejected the interrupted state');
  const report={...JSON.parse(resumed.stdout),interruptedAfterDdlBeforeReceipt:true,isolatedEngine:engine.version};
  await mkdir('tmp/phase-4.2a',{recursive:true});
  await writeFile('tmp/phase-4.2a/structural-initialization.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
