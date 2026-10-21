import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import { migrate } from '../src/identity/migrations.js';
import { runtimePrivileges, summarizeGrant } from '../src/identity/grants.js';
import { verifyIdentitySchema } from './identity-schema.js';

const directory = 'server/.local/p21a';
const migrationDigest = '4c4e290353031d7cf3663a9fa6685b0ea5632dad87477a9c1ca3edeeb8e0deef';
export const writeEvidence = async (name, value) => writeFile(join(directory, name), JSON.stringify({ recordedAtUtc: new Date().toISOString(), ...value }, null, 2), { flag: 'wx' });
const readEvidence = async name => JSON.parse(await readFile(join(directory, name), 'utf8'));
const approve = () => { if (process.env.UPMS_APPROVED_PLAN !== 'P2.1A-local-identity') throw new Error('Explicit owner plan approval required.'); };
async function absentEvidence(name) {
  try { await access(join(directory, name)); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error('Prior action evidence exists; no automatic repeat/repair.');
}
async function selected(db, database = 'upms') {
  const [rows] = await db.raw('SELECT DATABASE() AS name, @@port AS port');
  if (rows[0].name !== database || Number(rows[0].port) !== Number(process.env.DB_PORT)) throw new Error('Exact selected target changed.');
}
async function empty(db) {
  const [rows] = await db.raw('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  if (Number(rows[0].n) !== 0) throw new Error('Nonempty database: stop for schema classification/backup.');
}
async function checkpoint(db) {
  await selected(db); await empty(db);
  const file = process.env.UPMS_CHECKPOINT_FILE || '';
  if (file !== basename(file) || !/^preflight-[a-zA-Z0-9T.:-]+\.json$/.test(file)) throw new Error('Private preflight basename required.');
  const bytes = await readFile(join(directory, file));
  if (createHash('sha256').update(bytes).digest('hex') !== process.env.UPMS_CHECKPOINT_SHA) throw new Error('Checkpoint fingerprint mismatch.');
  const saved = JSON.parse(bytes);
  if (saved.classification !== 'EMPTY' || saved.tables.length || saved.migrations.length || saved.target.database !== 'upms' ||
      saved.target.host !== process.env.DB_HOST || Number(saved.target.port) !== Number(process.env.DB_PORT)) throw new Error('Checkpoint is not the approved empty target.');
  return { file, sha256: process.env.UPMS_CHECKPOINT_SHA, recovery: 'empty-database metadata baseline; no preexisting records' };
}
async function accountsAbsent(db, names) {
  const [rows] = await db.raw('SELECT User,Host FROM mysql.user WHERE User IN (' + names.map(() => '?').join(',') + ')', names);
  if (rows.length) throw new Error('Account name exists at some host; owner review required.');
}
async function ownerAuthority(db) {
  const [grants] = await db.raw('SHOW GRANTS FOR CURRENT_USER');
  if (!grants.some(row => { const text = Object.values(row).join(' '); return /^GRANT ALL PRIVILEGES ON \*\.\*/i.test(text) && /WITH GRANT OPTION/i.test(text); }))
    throw new Error('Explicit owner administrator with grant authority required; no account mutation attempted.');
}
async function reviewedWildcardAccounts(db, allowLocalhost = false) {
  const receipt = JSON.parse(await readFile(join(directory, 'preflight-2026-10-21T17-41-45-717Z.json'), 'utf8'));
  const bytes = await readFile(join(directory, 'preflight-2026-10-21T17-41-45-717Z.json'));
  if (createHash('sha256').update(bytes).digest('hex') !== 'b413b16e9363049ff4981a6433f3a4abcec7be875ac7403b7968920d9d839d75') throw new Error('Reviewed wildcard checkpoint changed.');
  const [accounts] = await db.raw("SELECT User AS user_name,Host AS host_name FROM mysql.user WHERE User IN ('upms_migrator','upms_runtime') ORDER BY User,Host");
  const wildcard = accounts.filter(a => a.host_name === '%');
  if (accounts.some(a => a.host_name !== '%' && !(allowLocalhost && a.host_name === 'localhost')) || wildcard.length !== 2 || (!allowLocalhost && accounts.length !== 2)) throw new Error('Account hosts changed from the reviewed forward plan.');
  const fingerprints = [];
  for (const account of wildcard) {
    const [grants] = await db.raw('SHOW GRANTS FOR ?@?', [account.user_name, '%']);
    const summaries = grants.map(row => {
      const match = Object.values(row).join(' ').match(/^GRANT (.+?) ON (.+?) TO /i);
      return match ? { privileges: match[1].split(',').map(p => p.trim()), scope: match[2] } : { unsupportedGrant: true };
    });
    const saved = receipt.relevantAccounts.accounts.find(a => a.user_name === account.user_name && a.host_name === '%');
    const hasGrantOption = grants.some(row => /WITH GRANT OPTION/i.test(Object.values(row).join(' ')));
    if (!saved || JSON.stringify(summaries) !== JSON.stringify(saved.grants) || hasGrantOption !== saved.hasGrantOption) throw new Error('Reviewed wildcard grants changed.');
    fingerprints.push({ account: `${account.user_name}@%`, sha256: createHash('sha256').update(JSON.stringify(grants)).digest('hex') });
  }
  return fingerprints;
}
async function grantRuntime(db, schema, username) {
  if (!/^upms(?:_test_[a-z0-9_]+)?$/.test(schema) || !/^upms_runtime(?:_test_[a-z0-9_]+)?$/.test(username)) throw new Error('Invalid reviewed grant target.');
  const [rows] = await db.raw('SHOW GRANTS FOR ?@?', [username, 'localhost']);
  if (!rows.every(r => { const g = summarizeGrant(r); return !g.unsupported && g.scope === '*.*' && g.privileges.length === 1 && g.privileges[0] === 'USAGE'; }))
    throw new Error('Account is not a newly created, unprivileged runtime account.');
  for (const [table, privileges] of Object.entries(runtimePrivileges))
    await db.raw(`GRANT ${privileges.join(', ')} ON ??.?? TO ?@?`, [schema, table, username, 'localhost']);
}
export async function provisionAccounts(db) {
  approve(); await absentEvidence('accounts-created.json'); const baseline = await checkpoint(db);
  await ownerAuthority(db);
  const forward = process.env.UPMS_APPROVED_FORWARD_PLAN === 'P2.1A-preserve-reviewed-wildcards';
  const preserved = forward ? await reviewedWildcardAccounts(db) : null;
  if (!forward) await accountsAbsent(db, ['upms_migrator','upms_runtime']);
  const migrator = process.env.UPMS_NEW_MIGRATOR_PASSWORD, runtime = process.env.UPMS_NEW_RUNTIME_PASSWORD;
  if (!migrator || migrator.length < 16 || !runtime || runtime.length < 16 || migrator === runtime) throw new Error('Distinct owner-chosen private account passwords required.');
  await db.raw('CREATE USER ?@? IDENTIFIED BY ?', ['upms_migrator','localhost',migrator]);
  await db.raw('CREATE USER ?@? IDENTIFIED BY ?', ['upms_runtime','localhost',runtime]);
  await db.raw('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON upms.* TO ?@?', ['upms_migrator','localhost']);
  if (forward && JSON.stringify(await reviewedWildcardAccounts(db, true)) !== JSON.stringify(preserved)) throw new Error('Wildcard account preservation fingerprint changed.');
  const result = { database: 'upms', accounts: ['upms_migrator@localhost','upms_runtime@localhost'], baseline, ownerApproved: true, noExistingAccountChanged: true, preservedWildcardFingerprints: preserved };
  await writeEvidence('accounts-created.json', result); return result;
}
export async function migrateOwner(db) {
  approve(); await absentEvidence('migration-applied.json'); await readEvidence('accounts-created.json');
  const baseline = await checkpoint(db);
  const [identity] = await db.raw('SELECT CURRENT_USER() AS account');
  if (identity[0].account !== 'upms_migrator@localhost') throw new Error('Dedicated migration account required.');
  const [grants] = await db.raw('SHOW GRANTS FOR CURRENT_USER');
  const allow = ['SELECT','INSERT','UPDATE','DELETE','CREATE','ALTER','INDEX','REFERENCES'];
  if (!grants.every(row => { const g = summarizeGrant(row); return !g.unsupported && ((g.scope === '*.*' && g.privileges.length === 1 && g.privileges[0] === 'USAGE') || (g.scope === 'upms.*' && g.privileges.every(p => allow.includes(p)))); }))
    throw new Error('Migration account has unrelated/global/delegable privileges.');
  const source = (await readFile('server/migrations/202610210001_identity.js','utf8')).replaceAll('\r\n','\n');
  if (createHash('sha256').update(source).digest('hex') !== migrationDigest) throw new Error('Reviewed migration source changed.');
  const migration = await migrate(db, { ...process.env, UPMS_PREFLIGHT_VALIDATED: 'true' }); const schema = await verifyIdentitySchema(db);
  const result = { migration, schema, migrationSourceSha256: migrationDigest, baseline };
  await writeEvidence('migration-applied.json', result); return result;
}
export async function grantOwnerRuntime(db) {
  approve(); await absentEvidence('runtime-grants-applied.json'); await selected(db);
  await readEvidence('accounts-created.json'); await readEvidence('migration-applied.json');
  const schema = await verifyIdentitySchema(db); await grantRuntime(db, 'upms', 'upms_runtime');
  const accounts = await readEvidence('accounts-created.json');
  if (accounts.preservedWildcardFingerprints && JSON.stringify(await reviewedWildcardAccounts(db, true)) !== JSON.stringify(accounts.preservedWildcardFingerprints)) throw new Error('Wildcard account preservation fingerprint changed.');
  const result = { database: 'upms', account: 'upms_runtime@localhost', schema, tableGrants: runtimePrivileges, ownerApproved: true };
  await writeEvidence('runtime-grants-applied.json', result); return result;
}
export async function provisionTest(db) {
  approve(); await absentEvidence('test-environment-created.json'); await selected(db);
  await ownerAuthority(db);
  const database = process.env.UPMS_TEST_DATABASE, username = process.env.UPMS_TEST_RUNTIME_USER, password = process.env.UPMS_TEST_RUNTIME_PASSWORD;
  if (database !== 'upms_test_p21a_20261021' || username !== 'upms_runtime_test_p21a' || !password || password.length < 16) throw new Error('Exact approved test target/account and owner-chosen password required.');
  const [schemas] = await db.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?', [database]);
  if (schemas.length) throw new Error('Approved test schema already exists; never reuse/reset it silently.');
  await accountsAbsent(db, [username]);
  await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [database]);
  await db.raw('CREATE USER ?@? IDENTIFIED BY ?', [username,'localhost',password]);
  const result = { database, account: `${username}@localhost`, runtimeGrantsPendingTestMigration: true, ownerApproved: true, purpose: 'synthetic fixtures only; no owner database fixtures' };
  await writeEvidence('test-environment-created.json', result); return result;
}
export async function grantTestRuntime(db) {
  const receipt = await readEvidence('test-environment-created.json');
  const database = db.client.config.connection.database;
  if (database !== receipt.database || process.env.UPMS_TEST_RUNTIME_USER !== receipt.account.split('@')[0]) throw new Error('Test grant receipt mismatch.');
  await grantRuntime(db, database, process.env.UPMS_TEST_RUNTIME_USER);
}
