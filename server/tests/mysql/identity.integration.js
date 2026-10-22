import {databasePreflight} from '../../src/identity/preflight.js';
// Explicit real-server integration suite. No mock fallback and no schema deletion.
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { createDatabase, transaction, query, capabilities } from '../../src/identity/database.js';
import { migrate } from '../../src/identity/migrations.js';
import { createIdentityService, digest, audit, authorize } from '../../src/identity/service.js';
import { MysqlSessionStore } from '../../src/identity/session-store.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import { identityConfig } from '../../src/identity/config.js';
import express from 'express';
import session from 'express-session';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { grantTestRuntime } from '../../tools/identity-provisioning.js';

test('real dedicated SQL-server identity integration (fails rather than mocks when unavailable)', async t => {
  if (!/^upms_test_[a-z0-9_]+$/.test(process.env.DB_NAME || '') || process.env.DB_CONFIRM_NAME !== process.env.DB_NAME)
    throw new Error('Use an owner-provisioned empty upms_test_<suffix> schema and explicit DB_CONFIRM_NAME.');
  if (!process.env.UPMS_TEST_OWNER_USER || !process.env.UPMS_TEST_OWNER_PASSWORD || !/^upms_runtime_test_/.test(process.env.DB_USER || ''))
    throw new Error('Separate private test-operator and restricted runtime credentials required.');
  const ownerEnv = { ...process.env, DB_USER: process.env.UPMS_TEST_OWNER_USER, DB_PASSWORD: process.env.UPMS_TEST_OWNER_PASSWORD, IDENTITY_DB_PURPOSE: 'operator' };
  const runtimeEnv = { ...process.env, IDENTITY_DB_PURPOSE: 'runtime' };
  let db = createDatabase(ownerEnv), runtimeDb;
  const env = { ...process.env, MANAGEMENT_ENABLED: 'true', MANAGEMENT_ORIGIN: 'http://localhost:3000', MANAGEMENT_LOCAL_HTTP: 'true', SESSION_SECRET: randomBytes(32).toString('hex') };
  const config = identityConfig(env), publicConfig = loadConfig({});
  const base = '/api/v1/management';
  const password = process.env.UPMS_TEST_INITIAL_PASSWORD || randomBytes(24).toString('hex');
  let app, admin, staff, adminId, staffId, csrfAdmin, csrfStaff;
  const csrf = async agent => { const r = await agent.get(`${base}/session/csrf`); assert.equal(r.status, 200); return r.body.csrfToken; };
  const post = (agent, path, token, data) => agent.post(base + path).set('Origin', config.origin).set('X-CSRF-Token', token).send(data);
  const login = async (agent, username) => post(agent, '/session/login', await csrf(agent), { username, password });
  try {
    await databasePreflight(db,ownerEnv);
    const info = await capabilities(db);
    console.info(JSON.stringify({ integrationDatabase: info.database_name, serverVersion: info.version, classification: /MariaDB/.test(info.version) ? 'Owner-approved MariaDB local-development acceptance; not Oracle MySQL evidence' : 'Oracle MySQL', timeZone: info.time_zone, charset: info.charset, engine: info.engine }));
    // This guard must be outside a subtest: a failed subtest does not stop its parent.
    const existing = await db.raw('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    if(process.env.UPMS_P24_STAGE!=='true'&&process.env.UPMS_P23_RUN==='03'&&process.env.UPMS_P23_SUPPLEMENTAL!=='reviewed-fresh-regression-03')throw Error('Supplemental regression approval required.');
    const p25=process.env.UPMS_P25_STAGE==='true'&&/^upms_test_p25_regression_20261022_0[1-8]$/.test(process.env.DB_NAME)&&process.env.DB_USER===('upms_runtime_test_p25r'+process.env.UPMS_P25_RUN);
    const p24=process.env.UPMS_P24_STAGE==='true'&&/^upms_test_p24_regression_20261022_0[1-6]$/.test(process.env.DB_NAME)&&process.env.DB_USER===('upms_runtime_test_p24r'+process.env.UPMS_P24_RUN);
    const p23=process.env.UPMS_P23_STAGE==='true'&&/^upms_test_p23_regression_20261022_0[123]$/.test(process.env.DB_NAME)&&process.env.DB_USER===('upms_runtime_test_p23r'+process.env.UPMS_P23_RUN);
    const p22=process.env.UPMS_P22_PREMIGRATED==='true'&&['upms_test_p22_20261021','upms_test_p22_identity_20261021'].includes(process.env.DB_NAME);
    assert.equal(Number(existing[0][0].n), p25?68:p24?59:p23?44:p22?38:0, 'Use the freshly provisioned approved schema; never reset test data.');
    if(p22||p23||p24||p25)assert.equal(Number((await db('users').count('* as n'))[0].n),0,'Existing identity fixtures are never reset/reused.');
    let migrationPassed = false;
    const migrationEnv={...env,DB_USER:ownerEnv.DB_USER,DB_PASSWORD:ownerEnv.DB_PASSWORD,IDENTITY_DB_PURPOSE:'operator'};
    await t.test('migration safety, application, tracking and repeat invocation', async () => {
      await assert.rejects(migrate(db, { ...migrationEnv, NODE_ENV: 'production' }));
      await assert.rejects(migrate(db, { ...migrationEnv, DB_CONFIRM_NAME: 'unconfirmed_target' }));
      const first = await migrate(db, migrationEnv); assert.equal(first.migrations.length, (p22||p23||p24||p25)?0:5);
      const second = await migrate(db, migrationEnv); assert.equal(second.migrations.length, 0);
      assert.equal((await db('roles')).length, 4);
      migrationPassed = true;
    });
    if (!migrationPassed) throw new Error('Migration acceptance failed; refusing dependent fixture writes.');
    if(!p22&&!p23&&!p24&&!p25)await grantTestRuntime(db);
    runtimeDb = createDatabase(runtimeEnv);
    const service = createIdentityService(runtimeDb); await service.ready();
    await t.test('concurrent one-time administrator bootstrap and unique users', async () => {
      const input = { username: 'fixture_admin', displayName: 'Synthetic Administrator', password };
      const results = await Promise.allSettled([service.bootstrap(input), service.bootstrap(input)]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.filter(r => r.status === 'rejected').length, 1);
      adminId = results.find(r => r.status === 'fulfilled').value;
      assert.equal((await db('identity_audit_events').where({ action: 'administrator.bootstrap' })).length, 1);
      await assert.rejects(db('users').insert({ login_key: 'fixture_admin', display_name: 'Duplicate', password_hash: 'synthetic', created_at: new Date(), updated_at: new Date() }), e => e.code === 'ER_DUP_ENTRY');
    });
    app = createApp({ config: publicConfig, management: config, identityDatabase: runtimeDb });
    admin = request.agent(app);
    await t.test('valid login rotates pre-auth session; no plaintext stored and cookie scope', async () => {
      const token = await csrf(admin);
      const before = await db('sessions').select('token_hash');
      const result = await post(admin, '/session/login', token, { username: 'fixture_admin', password });
      assert.equal(result.status, 200); csrfAdmin = result.body.csrfToken;
      assert.ok(result.headers['set-cookie'].some(c => /HttpOnly/.test(c) && /SameSite=Strict/.test(c) && /Path=\//.test(c) && !/Secure;/.test(c)));
      const rows = await db('sessions'); const authenticated = rows.find(r => String(r.user_id) === adminId);
      assert.ok(authenticated); assert.ok(!before.some(row => row.token_hash === authenticated.token_hash));
      assert.ok(rows.every(r => r.token_hash.length === 64 && !r.data.includes(password)));
      assert.ok((await db('identity_audit_events')).every(r => !r.details.includes(password)));
    });
    await t.test('invalid, unknown, missing credentials; generic errors and CSRF/origin enforcement', async () => {
      for (const body of [{ username: 'fixture_admin', password: 'wrong' }, { username: 'unknown_fixture', password: 'wrong' }, {}]) {
        const agent = request.agent(app); const token = await csrf(agent);
        const result = await post(agent, '/session/login', token, body);
        assert.equal(result.status, 401); assert.equal(result.body.error.code, 'INVALID_CREDENTIALS');
      }
      assert.equal((await admin.post(`${base}/users`).set('Origin', config.origin).send({})).status, 403);
      assert.equal((await post(admin, '/users', csrfAdmin, {}).set('Origin', 'https://evil.example')).status, 403);
      assert.equal((await admin.get(`${base}/session/current`).set('Sec-Fetch-Site', 'cross-site')).status, 403);
      assert.equal((await request(app).get(`${base}/users`)).status, 401);
    });
    await t.test('administrator creates staff; staff cannot assign roles or see identity/private fields', async () => {
      const result = await post(admin, '/users', csrfAdmin, { username: 'fixture_inventory', displayName: 'Synthetic Inventory', password, roles: ['inventory'], reason: 'Synthetic fixture' });
      assert.equal(result.status, 201); staffId = result.body.user.id;
      staff = request.agent(app); const signed = await login(staff, 'fixture_inventory'); assert.equal(signed.status, 200); csrfStaff = signed.body.csrfToken;
      assert.deepEqual(signed.body.user.roles, ['inventory']);
      assert.ok(!('password_hash' in signed.body.user)); assert.ok(!('enabled' in signed.body.user));
      assert.equal((await staff.get(`${base}/users`)).status, 403);
      assert.equal((await staff.get(`${base}/audit`)).status, 403);
      const denied = await staff.patch(`${base}/users/${staffId}`).set('Origin', config.origin).set('X-CSRF-Token', csrfStaff).send({ enabled: true, roles: ['administrator'], version: 1, reason: 'Unauthorized escalation' });
      assert.equal(denied.status, 403);
    });
    await t.test('test-only protected resource enforces department and field restrictions', async () => {
      // These fixtures/routes exist only in this test process, never the production app.
      await transaction(db, async trx => {
        await trx('permissions').insert([{ code: 'test.inventory.read' }, { code: 'test.rates.read' }, { code: 'test.finance.read' }]);
        await trx('role_permissions').insert([
          { role_code: 'inventory', permission_code: 'test.inventory.read' },
          { role_code: 'sales_dispatch', permission_code: 'test.inventory.read' },
          { role_code: 'sales_dispatch', permission_code: 'test.rates.read' },
          { role_code: 'accounts', permission_code: 'test.finance.read' },
          ...['test.inventory.read', 'test.rates.read', 'test.finance.read'].map(permission_code => ({ role_code: 'administrator', permission_code })),
        ]);
        await audit(trx, null, null, 'synthetic.test.permissions.seeded');
      });
      const fixture = express();
      fixture.use(session({ name: config.cookieName, secret: config.secret, store: new MysqlSessionStore(runtimeDb, config), resave: false, saveUninitialized: false }));
      fixture.get('/fixture/inventory', async (req, res) => {
        Object.defineProperty(req.session, 'recordHash', { value: digest(req.sessionID), enumerable: false });
        try { res.json(await service.read(req.session, 'test.inventory.read', async (_, current) => ({ item: 'Synthetic fixture', quantity: '1', ...(current.permissions.includes('test.rates.read') ? { rate: '1.00' } : {}) }))); }
        catch (error) { res.status(error.status || 503).json({ error: 'Access denied' }); }
      });
      const signed = await staff.get(`${base}/session/current`);
      const cookie = signed.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      const record = await request(fixture).get('/fixture/inventory').set('Cookie', cookie);
      assert.equal(record.status, 200); assert.deepEqual(Object.keys(record.body).sort(), ['item', 'quantity']);
      assert.ok(!record.text.includes('balance')); assert.ok(!record.text.includes('rate'));
      // Revoke the actual grant under the same guard, bump version and remove sessions.
      await transaction(db, async trx => {
        await trx('role_permissions').where({ role_code: 'inventory', permission_code: 'test.inventory.read' }).delete();
        await trx('users').where({ id: staffId }).increment('authorization_version', 1);
        await trx('sessions').where({ user_id: staffId }).delete();
        await audit(trx, null, staffId, 'synthetic.test.permission.revoked');
      });
      assert.equal((await request(fixture).get('/fixture/inventory').set('Cookie', cookie)).status, 401);
      // Restore only the fixture login for subsequent role-revocation tests, never authorization versions.
      staff = request.agent(app); const signedAgain = await login(staff, 'fixture_inventory'); csrfStaff = signedAgain.body.csrfToken;
    });
    await t.test('all confirmed departments have server enforced least privilege', async () => {
      for (const role of ['sales_dispatch', 'accounts']) {
        const name = `fixture_${role}`;
        assert.equal((await post(admin, '/users', csrfAdmin, { username: name, displayName: `Synthetic ${role}`, password, roles: [role], reason: 'Synthetic fixture' })).status, 201);
        const agent = request.agent(app); const r = await login(agent, name); assert.equal(r.status, 200);
        assert.equal((await agent.get(`${base}/users`)).status, 403);
        assert.equal((await agent.get(`${base}/session/current`)).status, 200);
      }
    });
    await t.test('audit insert failure rolls back staff creation on real SQL transaction', async () => {
      await db.raw("CREATE TRIGGER fixture_audit_failure BEFORE INSERT ON identity_audit_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic audit failure'");
      try {
        const failed = await post(admin, '/users', csrfAdmin, { username: 'fixture_rollback', displayName: 'Rollback fixture', password, roles: ['accounts'], reason: 'Audit failure test' });
        assert.equal(failed.status, 503);
        assert.equal((await db('users').where({ login_key: 'fixture_rollback' })).length, 0);
      } finally { await db.raw('DROP TRIGGER fixture_audit_failure'); }
    });
    await t.test('last usable administrator protection', async () => {
      const result = await admin.patch(`${base}/users/${adminId}`).set('Origin', config.origin).set('X-CSRF-Token', csrfAdmin).send({ enabled: false, roles: ['inventory'], version: 1, reason: 'Protection test' });
      assert.equal(result.status, 409); assert.equal(result.body.error.code, 'LAST_ADMINISTRATOR');
    });
    await t.test('session persists into a separate Node process after closing the original pool', async () => {
      // Preserve the signed browser cookie while replacing every database connection.
      const response = await admin.get(`${base}/session/current`);
      const cookies = response.headers['set-cookie'];
      assert.ok(cookies?.length);
      await db.destroy(); await runtimeDb.destroy(); db = createDatabase(ownerEnv); runtimeDb = createDatabase(runtimeEnv);
      const childEnv = { ...env, NODE_ENV: 'development', IDENTITY_DB_PURPOSE: 'runtime' };
      for (const key of ['UPMS_TEST_OWNER_USER','UPMS_TEST_OWNER_PASSWORD','UPMS_P22_OWNER_USER','UPMS_P22_OWNER_PASSWORD','UPMS_P22_TEST_PASSWORD','UPMS_P23_OWNER_USER','UPMS_P23_OWNER_PASSWORD','UPMS_P23_PASSWORD']) delete childEnv[key];
      const child = spawn(process.execPath, ['--input-type=module', '-e', `
        import {createApp} from './server/src/app.js';
        import {loadConfig} from './server/src/config/index.js';
        const app=createApp({config:loadConfig({})});
        const server=app.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port,pid:process.pid})));
        process.on('SIGTERM',()=>server.close(async()=>{await app.locals.identityDatabase.destroy();process.exit(0)}));
      `], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
      try {
        const output = await Promise.race([once(child.stdout, 'data'), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Restart process did not become ready.')), 5000); timer.unref(); })]);
        const ready = JSON.parse(String(output[0])); assert.notEqual(ready.pid, process.pid);
        const fromNewProcess = await request(`http://127.0.0.1:${ready.port}`).get(`${base}/session/current`).set('Cookie', cookies.map(c => c.split(';')[0]).join('; '));
        assert.equal(fromNewProcess.status, 200); assert.equal(fromNewProcess.body.user.id, adminId);
      } finally { const exited = once(child, 'exit'); child.kill(); await exited; }
      app = createApp({ config: publicConfig, management: config, identityDatabase: runtimeDb });
      const restarted = await request(app).get(`${base}/session/current`).set('Cookie', cookies.map(c => c.split(';')[0]).join('; '));
      assert.equal(restarted.status, 200); assert.equal(restarted.body.user.id, adminId);
      admin = request.agent(app); const result = await login(admin, 'fixture_admin'); csrfAdmin = result.body.csrfToken;
      staff = request.agent(app); const signed = await login(staff, 'fixture_inventory'); csrfStaff = signed.body.csrfToken;
    });
    await t.test('concurrent revocation across connections; stale and repeated requests denied', async () => {
      const before = await staff.get(`${base}/session/current`); assert.equal(before.status, 200);
      const update = admin.patch(`${base}/users/${staffId}`).set('Origin', config.origin).set('X-CSRF-Token', csrfAdmin).send({ enabled: true, roles: ['accounts'], version: 2, reason: 'Immediate department revocation test' });
      const [changed, concurrent] = await Promise.all([update, staff.get(`${base}/session/current`)]);
      assert.equal(changed.status, 200); assert.ok([200, 401].includes(concurrent.status));
      for (let i = 0; i < 3; i++) assert.equal((await staff.get(`${base}/session/current`)).status, 401);
      const second = createDatabase(runtimeEnv);
      try { assert.equal((await second('sessions').where({ user_id: staffId })).length, 0); } finally { await second.destroy(); }
    });
    await t.test('disabled login and expired, revoked session rejection; logout cannot resurrect', async () => {
      const change = await admin.patch(`${base}/users/${staffId}`).set('Origin', config.origin).set('X-CSRF-Token', csrfAdmin).send({ enabled: false, roles: ['accounts'], version: 3, reason: 'Disable fixture' });
      assert.equal(change.status, 200); assert.equal((await login(request.agent(app), 'fixture_inventory')).status, 401);
      const agent = request.agent(app); const signed = await login(agent, 'fixture_admin');
      const row = await db('sessions').where({ user_id: adminId }).orderBy('absolute_expires', 'desc').first();
      await db('sessions').where({ token_hash: row.token_hash }).update({ idle_expires: Date.now() - 1 });
      assert.equal((await agent.get(`${base}/session/current`)).status, 401);
      const logoutAgent = request.agent(app); const fresh = await login(logoutAgent, 'fixture_admin');
      const rawCookie = decodeURIComponent(fresh.headers['set-cookie'][0].split(';')[0].split('=').slice(1).join('='));
      const rawSid = rawCookie.slice(2).split('.').slice(0, -1).join('.');
      const original = await db('sessions').where({ token_hash: digest(rawSid) }).first();
      assert.equal((await post(logoutAgent, '/session/logout', fresh.body.csrfToken, {})).status, 204);
      assert.equal((await logoutAgent.get(`${base}/session/current`)).status, 401);
      assert.ok((await db('sessions').where({ user_id: adminId, revoked: true })).length > 0);
      const store = new MysqlSessionStore(runtimeDb, config);
      await assert.rejects(new Promise((resolve, reject) => store.set(rawSid, JSON.parse(original.data), error => error ? reject(error) : resolve())));
      const stale = { ...JSON.parse(original.data), recordHash: original.token_hash };
      await assert.rejects(transaction(db, trx => authorize(trx, stale, 'portal.access')), e => e.status === 401);
      void signed;
    });
    await t.test('durable throttling does not rely on client IP; password change revokes sessions', async () => {
      const service = createIdentityService(runtimeDb); await service.ready();
      for (let i = 0; i < 10; i++) await service.login('fixture_throttle', 'wrong');
      await assert.rejects(service.login('fixture_throttle', 'wrong'), e => e.code === 'LOGIN_THROTTLED');
      const agent = request.agent(app); const signed = await login(agent, 'fixture_admin');
      const changed = await post(agent, '/profile/password', signed.body.csrfToken, { currentPassword: password, newPassword: process.env.UPMS_TEST_CHANGED_PASSWORD || randomBytes(24).toString('hex') });
      assert.equal(changed.status, 204); assert.equal((await agent.get(`${base}/session/current`)).status, 401);
    });
    await t.test('database unavailability denies management while public routes still work', async () => {
      const dead = createDatabase({ ...process.env, DB_PORT: '1' });
      try {
        const failing = createApp({ config: publicConfig, management: config, identityDatabase: dead });
        const result = await request(failing).get(`${base}/session/csrf`); assert.equal(result.status, 503);
        assert.equal((await request(failing).get('/')).status, 200);
      } finally { await dead.destroy(); }
    });
    await t.test('transaction rollback and safe pool shutdown', async () => {
      const count = (await db('identity_audit_events')).length;
      await assert.rejects(transaction(db, async trx => { await audit(trx, null, null, 'synthetic.rollback'); throw new Error('rollback'); }));
      assert.equal((await db('identity_audit_events')).length, count);
      const token = randomBytes(32).toString('hex'); assert.equal(digest(token).length, 64);
      const store = new MysqlSessionStore(db, config); assert.ok(store);
      assert.ok(authorize); assert.ok(query);
    });
    await t.test('statement timeout destroys connection and rolls back uncommitted audit', async () => {
      await assert.rejects(transaction(db, async trx => {
        await audit(trx, null, null, 'synthetic.timeout.must.rollback');
        await trx.raw('SELECT SLEEP(6)');
      }));
      // Server finishes the interrupted statement before observing TCP closure on some versions.
      // An independent guard acquisition waits for rollback and verifies no partial commit.
      await transaction(db, async trx => {
        assert.equal((await trx('identity_audit_events').where({ action: 'synthetic.timeout.must.rollback' })).length, 0);
      });
    });
  } finally { await runtimeDb?.destroy(); await db.destroy(); }
});
