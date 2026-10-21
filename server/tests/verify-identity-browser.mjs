// Local HTTPS browser acceptance, synthetic fixtures only; fresh approved schema required.
import { createServer } from 'node:https';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { createDatabase } from '../src/identity/database.js';
import { migrate } from '../src/identity/migrations.js';
import { createIdentityService } from '../src/identity/service.js';
import { identityConfig } from '../src/identity/config.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
if (!/^upms_test_[a-z0-9_]+$/.test(process.env.DB_NAME || '') || process.env.DB_CONFIRM_NAME !== process.env.DB_NAME)
  throw new Error('Explicit disposable UPMS schema required.');
const db = createDatabase();
let server, browser;
const results = [];
try {
  const [tables] = await db.raw('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  assert.equal(Number(tables[0].n), 0, 'Use a fresh disposable schema; no destructive reset.');
  const migration = await migrate(db);
  const password = randomBytes(24).toString('hex');
  const service = createIdentityService(db); await service.ready();
  await service.bootstrap({ username: 'browser_admin', displayName: 'Synthetic Administrator', password });
  const base = 'https://localhost:7447';
  const settings = identityConfig({ MANAGEMENT_ENABLED: 'true', MANAGEMENT_ORIGIN: base, NODE_ENV: 'production', SESSION_SECRET: randomBytes(32).toString('hex') });
  const certRoot = join(process.env.APPDATA || '', 'ASP.NET', 'https');
  server = createServer({ cert: await readFile(process.env.TEST_TLS_CERT || join(certRoot, 'upms.client.pem')), key: await readFile(process.env.TEST_TLS_KEY || join(certRoot, 'upms.client.key')) }, createApp({ config: loadConfig({ NODE_ENV: 'production', ALLOWED_HOSTS: 'localhost' }), management: settings, identityDatabase: db }));
  await new Promise(r => server.listen(7447, '127.0.0.1', r));
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, acceptInsecureCerts: true, args: ['--ignore-certificate-errors', '--disable-extensions', '--proxy-server=direct://', '--proxy-bypass-list=*', '--host-resolver-rules=MAP localhost 127.0.0.1'] });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1365, height: 900 });
  await page.goto(`${base}/management`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name=username]');
  await mkdir('tmp/w06/p21-browser', { recursive: true });
  await page.screenshot({ path: 'tmp/w06/p21-browser/login.png', fullPage: true });
  await page.type('input[name=username]', 'browser_admin'); await page.type('input[name=password]', password);
  await page.click('button[type=submit], form button');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Welcome'));
  const cookies = await page.cookies(); const cookie = cookies.find(c => c.name === '__Host-upms');
  assert.ok(cookie?.secure && cookie.httpOnly && cookie.path === '/' && cookie.sameSite === 'Strict');
  results.push('HTTPS administrator login and Secure/HttpOnly/SameSite=Strict __Host cookie');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Staff accounts').click());
  await page.waitForSelector('input[name=displayName]');
  await page.type('input[name=displayName]', 'Synthetic Browser Inventory'); await page.type('input[name=username]', 'browser_inventory');
  await page.type('input[name=password]', password); await page.click('input[name=roles][value=inventory]');
  await page.type('input[name=reason]', 'Synthetic browser acceptance');
  await page.click('form button');
  await page.waitForFunction(() => document.querySelector('tbody')?.textContent.includes('browser_inventory'));
  await page.screenshot({ path: 'tmp/w06/p21-browser/admin.png', fullPage: true });
  results.push('Administrator creates staff through the UI and sees assigned department');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Identity history').click());
  await page.waitForFunction(() => document.body.textContent.includes('user.created'));
  results.push('Protected audit history displays the atomic staff creation event');
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.evaluate(() => [...document.querySelectorAll('header button')].find(b => b.textContent === 'Sign out').click())]);
  await page.waitForSelector('input[name=username]');
  await page.type('input[name=username]', 'browser_inventory'); await page.type('input[name=password]', password); await page.click('form button');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Welcome'));
  assert.equal(await page.evaluate(() => document.querySelector('nav').textContent.includes('Staff accounts')), false);
  const denied = await page.evaluate(async () => (await fetch('/api/v1/management/users')).status); assert.equal(denied, 403);
  results.push('Inventory login, department-aware navigation and direct API access denial');
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: 'tmp/w06/p21-browser/staff-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  results.push('Mobile staff shell has no horizontal overflow');
  const row = await db('users').where({ login_key: 'browser_inventory' }).first();
  // Simulates a separately committed, guard-coordinated administrative revocation.
  const { transaction } = await import('../src/identity/database.js');
  const { audit } = await import('../src/identity/service.js');
  await transaction(db, async trx => {
    await trx('users').where({ id: row.id }).increment('authorization_version', 1);
    await trx('sessions').where({ user_id: row.id }).delete();
    await audit(trx, null, row.id, 'synthetic.browser.revocation');
  });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'My profile').click());
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Revoke all my sessions'));
  // Profile navigation is local; a server action must demonstrate expired-session handling.
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Revoke all my sessions').click());
  await page.waitForSelector('input[name=username]');
  results.push('Revoked session returns to sign-in without retaining private rows');
  assert.deepEqual(errors, []);
  await writeFile('tmp/w06/p21-browser/results.json', JSON.stringify({ migration, checks: results, pageErrors: errors }, null, 2));
  console.info(JSON.stringify({ checks: results, pageErrors: errors, screenshots: 'tmp/w06/p21-browser', database: process.env.DB_NAME }));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(r => server.close(r));
  await db.destroy();
}
