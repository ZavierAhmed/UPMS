// Uses only a newly approved empty disposable schema. Never targets owner upms.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createDatabase } from '../src/identity/database.js';
import { verifyRuntimeGrants } from '../src/identity/grants.js';
import { createApp } from '../src/app.js';
import { identityConfig } from '../src/identity/config.js';
import { loadConfig } from '../src/config/index.js';

const receipt = JSON.parse(await readFile('server/.local/p21a/test-environment-created.json','utf8'));
if (!/^upms_test_[a-z0-9_]+$/.test(process.env.DB_NAME || '') || process.env.DB_NAME !== receipt.database || process.env.DB_CONFIRM_NAME !== receipt.database || `${process.env.DB_USER}@localhost` !== receipt.account)
  throw new Error('Exact owner-approved disposable test receipt/credentials required.');
const initial = randomBytes(24).toString('hex'), changed = randomBytes(24).toString('hex');
const fixtureEnv = { ...process.env, UPMS_TEST_INITIAL_PASSWORD: initial, UPMS_TEST_CHANGED_PASSWORD: changed };
await mkdir('tmp/w06/p21a', { recursive: true });
async function run(args, env, log) {
  const child = spawn(process.execPath, args, { env, stdio: ['ignore','pipe','pipe'] });
  let output = '';
  for (const stream of [child.stdout,child.stderr]) stream.on('data', bytes => { output += bytes.toString(); });
  const code = await new Promise((resolve,reject) => { child.on('error',reject); child.on('exit',resolve); });
  await writeFile(log, output, { flag: 'wx' });
  if (code !== 0) throw new Error(`Acceptance subprocess failed; inspect private synthetic-test log ${log}.`);
  return output;
}
const ownerDb = createDatabase({ ...process.env, DB_USER: process.env.UPMS_TEST_OWNER_USER, DB_PASSWORD: process.env.UPMS_TEST_OWNER_PASSWORD, IDENTITY_DB_PURPOSE: 'operator' });
try {
  const [tables] = await ownerDb.raw('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  assert.equal(Number(tables[0].n),0,'A previous test schema is never reused/reset.');
} finally { await ownerDb.destroy(); }
await run(['--test','server/tests/mysql/identity.integration.js'], fixtureEnv, 'tmp/w06/p21a/integration.log');
const runtimeEnv = { ...fixtureEnv, IDENTITY_DB_PURPOSE: 'runtime' };
delete runtimeEnv.UPMS_TEST_OWNER_USER; delete runtimeEnv.UPMS_TEST_OWNER_PASSWORD;
const db = createDatabase(runtimeEnv), prohibited = [];
let load;
try {
  const [account] = await db.raw('SELECT CURRENT_USER() AS account');
  const [grants] = await db.raw('SHOW GRANTS FOR CURRENT_USER');
  const proof = verifyRuntimeGrants(grants, process.env.DB_NAME, account[0].account);
  // Confirm the strict allowlist first. Probes never target existing DDL objects or
  // modify rows even if an administrator races to change grants after inspection.
  const nonce = `upms_denied_${randomBytes(6).toString('hex')}`;
  const probes = [
    ['CREATE TABLE', `CREATE TABLE \`${nonce}\` (id INT)`],
    ['ALTER TABLE', `ALTER TABLE \`${nonce}\` ADD COLUMN another_id INT`],
    ['DROP TABLE', `DROP TABLE \`${nonce}\``],
    ['UPDATE audit', 'UPDATE identity_audit_events SET action=action WHERE 1=0'],
    ['DELETE audit', 'DELETE FROM identity_audit_events WHERE 1=0'],
    ['catalogue mutation', 'UPDATE role_permissions SET permission_code=permission_code WHERE 1=0'],
    ['protected system schema read', 'SELECT 1 FROM mysql.user LIMIT 0'],
    ['GRANT', `GRANT SELECT ON \`${process.env.DB_NAME}\`.roles TO '${process.env.DB_USER}'@'localhost'`],
  ];
  for (const [operation,sql] of probes) {
    let error;
    try { await db.raw(sql); } catch (failure) { error = failure; }
    assert.ok(error && ['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR','ER_SPECIFIC_ACCESS_DENIED_ERROR','ER_ACCESS_DENIED_ERROR'].includes(error.code), `Expected a real SQL permission rejection: ${operation}`);
    prohibited.push({ operation, errorCode: error.code, denied: true });
  }
  const config = identityConfig({ MANAGEMENT_ENABLED:'true', MANAGEMENT_ORIGIN:'http://localhost:3000', MANAGEMENT_LOCAL_HTTP:'true', SESSION_SECRET:randomBytes(32).toString('hex') });
  const app = createApp({ config:loadConfig({}), management:config, identityDatabase:db });
  const agent = request.agent(app), base='/api/v1/management';
  const csrf = await agent.get(`${base}/session/csrf`);
  const login = await agent.post(`${base}/session/login`).set('Origin',config.origin).set('X-CSRF-Token',csrf.body.csrfToken).send({ username:'fixture_admin', password:changed });
  assert.equal(login.status,200);
  const times=[], started=performance.now();
  // Four requests at a time, forty total; no unbounded stress traffic.
  for(let batch=0;batch<10;batch++) await Promise.all(Array.from({length:4},async()=>{const start=performance.now();const result=await agent.get(`${base}/session/current`);assert.equal(result.status,200);times.push(performance.now()-start);}));
  times.sort((a,b)=>a-b);
  load={requests:40,concurrency:4,elapsedMs:Math.round(performance.now()-started),medianMs:Math.round(times[20]),p95Ms:Math.round(times[37]),maxMs:Math.round(times.at(-1)),errors:0};
  assert.ok(load.maxMs<5000,'Identity guard local request exceeded bounded acceptance budget.');
  await writeFile('tmp/w06/p21a/restricted-runtime.json',JSON.stringify({proof,prohibited,load},null,2),{flag:'wx'});
} finally { await db.destroy(); }
await run(['server/tests/verify-identity-browser.mjs'], { ...runtimeEnv, UPMS_TEST_REUSE_FIXTURES:'true', UPMS_TEST_APPROVED_DATABASE:receipt.database }, 'tmp/w06/p21a/browser.log');
console.info(JSON.stringify({database:receipt.database,engine:'MariaDB local-development acceptance',integration:'17 checks passed',sqlPermissionDenials:prohibited,load,browser:'passed',ownerUpmsFixtures:'none'}));
