import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngine } from '../src/identity/engine.js';
import { runtimePrivileges, summarizeGrant, verifyRuntimeGrants } from '../src/identity/grants.js';
import { authorize } from '../src/identity/service.js';
const env = { DB_ALLOW_MARIADB_COMPATIBILITY: 'true', NODE_ENV: 'development' };
const grants = () => [ { grant: "GRANT USAGE ON *.* TO 'upms_runtime'@'localhost' IDENTIFIED BY PASSWORD '*REDACTED_FIXTURE'" },
  ...Object.entries(runtimePrivileges).map(([table, permissions]) => ({ grant: `GRANT ${permissions.join(', ')} ON \`upms\`.\`${table}\` TO 'upms_runtime'@'localhost'` })) ];
test('MariaDB local acceptance remains explicit, versioned and separate from Oracle MySQL', () => {
  assert.deepEqual(validateEngine('10.4.32-MariaDB', env), { product: 'MariaDB', localDevelopmentOnly: true, legacy104: true });
  assert.throws(() => validateEngine('10.4.32-MariaDB', {}));
  for (const version of ['10.4.31-MariaDB','10.3.39-MariaDB','not-a-version','5.5.5-10.4.32-MariaDB']) assert.throws(() => validateEngine(version, env));
  assert.equal(validateEngine('8.0.16', {}).product, 'Oracle MySQL');
  assert.throws(() => validateEngine('8.0.15', {}));
});
test('MariaDB production use is blocked even with explicit local opt-in', () => {
  assert.throws(() => validateEngine('10.4.32-MariaDB', { ...env, NODE_ENV: 'production' }));
  assert.throws(() => validateEngine('11.4.0-MariaDB', { ...env, NODE_ENV: 'production' }));
});
test('reviewed runtime grant allowlist is accepted and password-bearing suffix is withheld', () => {
  const result = verifyRuntimeGrants(grants(), 'upms', 'upms_runtime@localhost');
  assert.equal(result.verified, true); assert.equal(result.globalPrivileges, false);
  assert.ok(!JSON.stringify(summarizeGrant(grants()[0])).includes('REDACTED_FIXTURE'));
});
test('global/schema-wide/foreign/DDL/audit/catalog grants are rejected', () => {
  for (const extra of ['ALL PRIVILEGES ON *.*','SELECT ON upms.*','SELECT ON another_project.users','CREATE ON upms.users',
    'UPDATE ON upms.identity_audit_events','DELETE ON upms.identity_audit_events','UPDATE ON upms.role_permissions']) {
    assert.throws(() => verifyRuntimeGrants([...grants(), { grant: `GRANT ${extra} TO 'upms_runtime'@'localhost'` }], 'upms', 'upms_runtime@localhost'));
  }
});
test('delegated roles, grant option, wildcard hosts and missing required privileges fail closed', () => {
  assert.throws(() => verifyRuntimeGrants([...grants(), { grant: "GRANT SELECT ON upms.roles TO 'upms_runtime'@'localhost' WITH GRANT OPTION" }], 'upms', 'upms_runtime@localhost'));
  assert.throws(() => verifyRuntimeGrants([...grants(), { grant: "GRANT privileged_role TO 'upms_runtime'@'localhost'" }], 'upms', 'upms_runtime@localhost'));
  assert.throws(() => verifyRuntimeGrants(grants(), 'upms', 'upms_runtime@%'));
  assert.throws(() => verifyRuntimeGrants(grants(), 'upms', 'upms_migrator@localhost'));
  assert.throws(() => verifyRuntimeGrants(grants().slice(0,-1), 'upms', 'upms_runtime@localhost'));
});
test('a persisted session must belong to the authenticated identity it authorizes', async () => {
  const builder = { where() { return this; }, first() { return this; }, timeout() { return Promise.resolve({ user_id: '2', revoked: false, idle_expires: Date.now()+60000, absolute_expires: Date.now()+60000 }); } };
  const db = name => { assert.equal(name, 'sessions'); return builder; };
  await assert.rejects(authorize(db, { userId: '1', recordHash: 'synthetic-session-hash', authVersion: 1 }, 'portal.access'), e => e.code === 'SESSION_EXPIRED');
});
test('temporary administrator sessions cannot use administration until a durable password change', async () => {
  let changed = false;
  const db = table => {
    const criteria = {};
    const builder = { where(key) { if (typeof key === 'object') Object.assign(criteria,key); return this; },
      whereIn(key,values) { criteria[key]=values; return this; }, orderBy() { return this; }, select() { return this; }, first() { return this; },
      timeout() {
        if (table === 'sessions') return Promise.resolve({user_id:1,revoked:false,idle_expires:Date.now()+60000,absolute_expires:Date.now()+60000});
        if (table === 'users') return Promise.resolve({id:1,enabled:true,login_key:'synthetic',display_name:'Synthetic',authorization_version:1});
        if (table === 'user_roles') return Promise.resolve([{role_code:'administrator'}]);
        if (table === 'role_permissions') return Promise.resolve(['portal.access','profile.password','users.read'].map(permission_code=>({permission_code})));
        if (Array.isArray(criteria.action) && criteria.action.includes('administrator.bootstrap')) return Promise.resolve({id:1,details:JSON.stringify({requirePasswordChange:true})});
        return Promise.resolve(changed ? {id:2}:undefined);
      } };
    return builder;
  };
  const session={userId:'1',recordHash:'synthetic',authVersion:1};
  await assert.rejects(authorize(db,session,'users.read'),error=>error.code==='PASSWORD_CHANGE_REQUIRED');
  assert.equal((await authorize(db,session,'profile.password')).passwordChangeRequired,true);
  changed=true;
  assert.equal((await authorize(db,session,'users.read')).passwordChangeRequired,undefined);
});
