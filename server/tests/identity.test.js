import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import { identityConfig, databaseConfig } from '../src/identity/config.js';
import { hashPassword, verifyPassword } from '../src/identity/passwords.js';
import { createInput, updateInput } from '../src/identity/validation.js';
import { roles, permissions } from '../src/identity/catalog.js';
import { digest } from '../src/identity/service.js';
const env = { MANAGEMENT_ENABLED: 'true', MANAGEMENT_ORIGIN: 'http://localhost:3000', MANAGEMENT_LOCAL_HTTP: 'true', SESSION_SECRET: randomBytes(32).toString('hex') };
test('Argon2id salts are unique and verification rejects an incorrect password', async () => {
  const password = randomBytes(18).toString('hex');
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.match(first, /^\$argon2id\$/); assert.notEqual(first, second);
  assert.equal(await verifyPassword(first, password), true); assert.equal(await verifyPassword(first, password + '!'), false);
  assert.ok(!first.includes(password));
});
test('hashing concurrency is bounded with immediate overload rejection', async () => {
  const result = await Promise.allSettled(Array.from({ length: 4 }, () => hashPassword('synthetic-password-long')));
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 2);
  assert.ok(result.filter(r => r.status === 'rejected').every(r => r.reason.status === 429));
});
test('management defaults disabled; production cannot enable HTTP', () => {
  assert.equal(identityConfig({}), null);
  assert.throws(() => identityConfig({ ...env, NODE_ENV: 'production' }));
  assert.throws(() => identityConfig({ ...env, MANAGEMENT_LOCAL_HTTP: 'false' }));
  assert.throws(() => identityConfig({ ...env, MANAGEMENT_ORIGIN: 'http://example.test', MANAGEMENT_LOCAL_HTTP: 'true' }));
  assert.throws(() => identityConfig({ ...env, SESSION_SECRET: 'short' }));
  const secure = identityConfig({ ...env, NODE_ENV: 'production', MANAGEMENT_ORIGIN: 'https://example.test' });
  assert.equal(secure.secure, true); assert.equal(secure.cookieName, '__Host-upms');
});
test('database configuration has explicit local-only target and no fallback', () => {
  assert.throws(() => databaseConfig({}));
  assert.throws(() => databaseConfig({ DB_HOST: 'remote.example', DB_NAME: 'upms', DB_USER: 'fixture', DB_PASSWORD: 'fixture', DB_PORT: '3306' }));
  assert.throws(() => databaseConfig({ DB_HOST: 'localhost', DB_NAME: 'production', DB_USER: 'fixture', DB_PASSWORD: 'fixture', DB_PORT: '3306' }));
});
test('only four confirmed roles exist; staff cannot administer identities', () => {
  assert.equal(roles.length, 4); assert.equal(roles[0].permissions.length, permissions.length);
  for (const role of roles.slice(1)) assert.deepEqual(role.permissions, ['portal.access', 'profile.read', 'profile.password', 'sessions.self']);
});
test('input allowlists reject escalation fields and weak passwords', () => {
  assert.equal(createInput.safeParse({ username: 'staff', displayName: 'Staff', password: 'short', roles: ['inventory'], reason: 'test' }).success, false);
  assert.equal(updateInput.safeParse({ enabled: true, roles: ['inventory'], version: 1, reason: 'test', permissions: ['users.create'] }).success, false);
});
test('session hashes are fixed-length and contain no bearer token', () => {
  const raw = randomBytes(32).toString('hex'); assert.equal(digest(raw).length, 64); assert.notEqual(digest(raw), raw);
});
test('management origin, CSRF, private shell and outage handling are isolated from public APIs', async () => {
  const fail = () => { throw new Error('synthetic database outage'); };
  fail.transaction = async () => { throw new Error('synthetic database outage'); };
  const app = createApp({ config: loadConfig({}), management: identityConfig(env), identityDatabase: fail });
  const denied = await request(app).post('/api/v1/management/session/login').set('Origin', 'https://evil.example').send({});
  assert.equal(denied.status, 403); assert.equal(denied.body.error.code, 'ORIGIN_REJECTED');
  const csrf = await request(app).post('/api/v1/management/session/login').set('Origin', env.MANAGEMENT_ORIGIN).send({});
  assert.equal(csrf.status, 403); assert.equal(csrf.body.error.code, 'CSRF_REJECTED');
  const outage = await request(app).get('/api/v1/management/session/csrf');
  assert.equal(outage.status, 503); assert.ok(!outage.text.includes('synthetic'));
  const current = await request(app).get('/api/v1/management/session/current'); assert.equal(current.status, 503);
  const shell = await request(app).get('/management'); assert.equal(shell.status, 200); assert.equal(shell.headers['cache-control'], 'no-store'); assert.match(shell.headers['x-robots-tag'], /noindex/);
  const home = await request(app).get('/'); assert.equal(home.status, 200); assert.ok(!home.text.includes('Staff sign in'));
  const sitemap = await request(app).get('/sitemap.xml'); assert.ok(!sitemap.text.includes('/management'));
});
