import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createDatabase, capabilities } from '../src/identity/database.js';
import { transaction } from '../src/identity/database.js';
import { verifyRuntimeGrants } from '../src/identity/grants.js';
import { provisionAccounts, migrateOwner, grantOwnerRuntime, provisionTest } from './identity-provisioning.js';

const expectedTables = ['identity_guard','users','roles','permissions','user_roles','role_permissions','sessions','identity_audit_events','login_attempts','upms_identity_migrations','upms_identity_migrations_lock'].sort();
export function grantSummary(row) {
  const text = Object.values(row).join(' ');
  const match = text.match(/^GRANT (.+?) ON (.+?) TO /i);
  return match ? { privileges: match[1].split(',').map(p => p.trim()), scope: match[2] }
    : { unsupportedGrant: true }; // Never copy raw SHOW GRANTS: older servers can include password hashes.
}
export async function inspect(db) {
  const info = await capabilities(db);
  if (info.database_name !== 'upms') throw new Error('The owner preflight targets exactly upms.');
  const [settings] = await db.raw('SELECT CURRENT_USER() AS account, USER() AS login_account, @@port AS server_port, @@session.sql_mode AS sql_mode, @@global.sql_mode AS global_sql_mode, @@session.tx_isolation AS isolation_level');
  const [tables] = await db.raw('SELECT TABLE_NAME AS name, TABLE_TYPE AS type, ENGINE AS engine, TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
  const [columns] = await db.raw('SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type, IS_NULLABLE AS nullable_value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
  const [constraints] = await db.raw('SELECT TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name, CONSTRAINT_TYPE AS constraint_type FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME');
  const [grants] = await db.raw('SHOW GRANTS FOR CURRENT_USER');
  const migrations = tables.some(t => t.name === 'upms_identity_migrations')
    ? await db('upms_identity_migrations').select('name','batch','migration_time') : [];
  let relevantAccounts;
  try {
    const [accounts] = await db.raw("SELECT User AS user_name,Host AS host_name FROM mysql.user WHERE User IN ('upms_migrator','upms_runtime') ORDER BY User,Host");
    for (const account of accounts) {
      const [accountGrants] = await db.raw('SHOW GRANTS FOR ?@?', [account.user_name, account.host_name]);
      account.grants = accountGrants.map(grantSummary);
      account.hasGrantOption = accountGrants.some(row => /WITH GRANT OPTION/i.test(Object.values(row).join(' ')));
    }
    relevantAccounts = { inspected: true, accounts };
  } catch { relevantAccounts = { inspected: false, requiresOwnerInspection: true }; }
  const names = tables.map(t => t.name).sort();
  const classification = !tables.length ? 'EMPTY' : names.length === expectedTables.length && names.every((n,i) => n === expectedTables[i]) &&
    tables.every(t => t.type === 'BASE TABLE' && t.engine === 'InnoDB') && migrations.length === 1 && migrations[0].name === '202610210001_identity.js'
      ? 'IDENTITY_CANDIDATE_REQUIRES_SCHEMA_REVIEW' : 'STOP_UNEXPECTED_OR_PARTIAL_SCHEMA';
  return { capturedAtUtc: new Date().toISOString(), target: { host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: 'upms' },
    server: info, settings: settings[0], classification, tables, columns, constraints, migrations,
    currentAccountGrants: grants.map(grantSummary), currentAccountHasGrantOption: grants.some(row => /WITH GRANT OPTION/i.test(Object.values(row).join(' '))), relevantAccounts,
    checkpoint: tables.length ? 'FULL_PRIVATE_BACKUP_AND_OWNER_SCHEMA_REVIEW_REQUIRED' : 'EMPTY_DATABASE_METADATA_CHECKPOINT_NO_RECORDS_EXIST' };
}
let db;
try {
  const action = process.argv[2];
  if (!['inspect','provisionaccounts','migrate','grantruntime','provisiontest','runtimecheck'].includes(action)) throw new Error('Unknown explicit operator action.');
  db = createDatabase();
  if (action !== 'inspect') {
    let result;
    if (action === 'provisionaccounts') result = await provisionAccounts(db);
    if (action === 'migrate') result = await migrateOwner(db);
    if (action === 'grantruntime') result = await grantOwnerRuntime(db);
    if (action === 'provisiontest') result = await provisionTest(db);
    if (action === 'runtimecheck') {
      const [account] = await db.raw('SELECT CURRENT_USER() AS account');
      const [grants] = await db.raw('SHOW GRANTS FOR CURRENT_USER');
      const verified = verifyRuntimeGrants(grants, process.env.DB_NAME, account[0].account);
      await transaction(db, async () => {});
      const [users] = await db('users').count('* AS count');
      const [admins] = await db('users AS u').join('user_roles AS r','r.user_id','u.id').where({ 'u.enabled': true, 'r.role_code': 'administrator' }).count('* AS count');
      const [bootstrap] = await db('identity_audit_events').where({ action: 'administrator.bootstrap' }).count('* AS count');
      result = { ...verified, userCount: Number(users.count), enabledAdministratorCount: Number(admins.count), bootstrapEventCount: Number(bootstrap.count), guardLock: 'passed', mutation: 'none' };
      await writeFile(`server/.local/p21a/runtime-check-${Date.now()}.json`, JSON.stringify(result, null, 2), { flag: 'wx' });
    }
    console.info(JSON.stringify({ action, ...result }));
  } else {
  const report = await inspect(db);
  const directory = 'server/.local/p21a'; await mkdir(directory, { recursive: true });
  const bytes = JSON.stringify(report, null, 2);
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = `${directory}/preflight-${id}.json`;
  await writeFile(destination, bytes, { flag: 'wx' });
  await writeFile(`${directory}/preflight-${id}.md`, `# P2.1A pre-migration inspection\n\nTarget: ${report.target.host}:${report.target.port}/upms\n\nAccount: ${report.settings.account}\n\nServer: ${report.server.version}\n\nClassification: ${report.classification}\n\nTables/views: ${report.tables.length}\n\nMigration records: ${report.migrations.length}\n\nCheckpoint: ${report.checkpoint}\n\nNo schema, account or record mutation was performed. Full metadata is retained in the adjacent private JSON report. Nonempty/partial schemas require owner review and backup before mutation.\n`, { flag: 'wx' });
  console.info(JSON.stringify({ report: destination, sha256: createHash('sha256').update(bytes).digest('hex'),
    database: 'upms', serverVersion: report.server.version, classification: report.classification, objectCount: report.tables.length,
    migrationNames: report.migrations.map(r => r.name), accountInspection: report.relevantAccounts.inspected, ownerCanDelegate: report.currentAccountHasGrantOption, mutation: 'none' }));
  }
} catch (error) {
  // SQL exceptions may contain bound passwords; never print their message or SQL.
  const safeCode = typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'VALIDATION_STOP';
  console.error(`Operator status: ${safeCode}`);
  console.error('MariaDB operator step stopped. Check the private profile/endpoint and owner-review gates. No credentials, SQL or record data are printed.');
  process.exitCode = 1;
} finally { if (db) await db.destroy(); }
