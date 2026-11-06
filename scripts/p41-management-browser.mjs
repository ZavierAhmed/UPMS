import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { employeePreview, privatePath } from './uath1-preview.mjs';

const financialFixture = process.argv.includes('--financial-records');
const moneyOnly = process.argv.includes('--money');
const filtersOnly = financialFixture || process.argv.includes('--filters');
const before = process.argv.includes('--before');
const mode = financialFixture ? 'record-filters' : moneyOnly ? 'money-retry' :
  filtersOnly ? 'filters' : before ? 'before' : 'after';
const evidence = 'docs/phase-4.1/evidence';
const port = financialFixture ? 5226 : 5215;
const origin = 'http://127.0.0.1:' + port;
const fixturePointer = 'tmp/php-runtime/p41-uath1-latest.json';
const fixture = financialFixture ? { bindingPath: fixturePointer } :
  JSON.parse(await readFile('tmp/php-runtime/p4-uat2a-extras.json', 'utf8'));
const sessionPath = financialFixture
  ? resolve(JSON.parse(await readFile(fixturePointer, 'utf8')).directory, 'browser.json')
  : 'tmp/php-runtime/p4-uat2a-extras-session.json';
const session = JSON.parse(await readFile(await privatePath(sessionPath), 'utf8'));

await mkdir(evidence + '/browser', { recursive: true });
const frozen = resolve('tmp/php-runtime/p41-browser-assets-' + Date.now());
await cp(await privatePath('tmp/php-runtime/' + (before ? 'p4-assets' : 'p41-assets')), frozen, { recursive: true });
const cookieName = 'upms_uat3_test';
const app = await employeePreview(fixture.bindingPath, { port, cookieName, assetRoot: frozen });
const server = createServer((req, res) => {
  app.handler(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(503);
    res.end();
  });
});
await new Promise((done, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', done);
});

const results = [], failures = [], unsafeRequests = [], filters = [];
const responseReads = [];
let context = {};
let browser;
let runError;
try {
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  page.on('request', request => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      unsafeRequests.push({ method: request.method(), route: pathname });
    }
  });
  page.on('response', response => {
    const { pathname } = new URL(response.url());
    if (response.status() < 400 || !pathname.startsWith('/api/')) return;
    const failure = { ...context, route: pathname, method: response.request().method(),
      status: response.status(), requestRef: response.headers()['x-request-id'] ?? null };
    failures.push(failure);
    responseReads.push(response.json().then(body => {
      const code = body.error?.code ?? body.code;
      if (typeof code === 'string' && /^[A-Z0-9_]{1,80}$/i.test(code)) failure.code = code;
    }).catch(() => {}));
  });
  await page.setCookie({ name: cookieName, value: session.cookies['__Host-upms-php'], url: origin, httpOnly: true });

  const widths = moneyOnly ? [1920] : filtersOnly ? [768] : [390, 768, 1024, 1440, 1920];
  let paths = moneyOnly ? ['/money-accounts'] : financialFixture ? ['/challans', '/vendors'] :
    filtersOnly ? ['/challans', '/vendors', '/cheques'] :
    ['', '/items', '/stock-in/new', '/challans', '/clients', '/vendors', '/money-accounts',
      '/employee-hafta', '/expenses', '/reports', '/cheques', '/cheques?new=1'];
  if (process.argv.includes('--cheque-only')) paths = paths.filter(path => path.startsWith('/cheques'));

  async function checkFilter(path, width) {
    const label = { '/challans': 'Search reference', '/vendors': 'Search', '/cheques': 'Cheque number' }[path];
    const queryKey = path === '/cheques' ? 'number' : 'q';
    const field = await page.evaluateHandle(text => [...document.querySelectorAll('main label')]
      .find(element => element.textContent.trim() === text)?.querySelector('input'), label);
    assert.ok(field.asElement(), 'Missing filter input for ' + path);
    const rowCount = () => page.evaluate(() => [...document.querySelectorAll('main table tbody tr')]
      .filter(row => row.cells.length > 1).length);
    const initialRows = await rowCount();
    if (financialFixture) assert.ok(initialRows > 0);
    await field.focus();
    await page.keyboard.sendCharacter('987654321098765');
    await page.waitForFunction(key => new URLSearchParams(location.search).get(key) === '987654321098765', {}, queryKey);
    await page.waitForNetworkIdle({ idleTime: 500 });
    assert.equal(await rowCount(), 0);
    await field.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.waitForFunction(key => !new URLSearchParams(location.search).get(key), {}, queryKey);
    await page.waitForFunction(expected => [...document.querySelectorAll('main table tbody tr')]
      .filter(row => row.cells.length > 1).length === expected, {}, initialRows);
    await page.waitForNetworkIdle({ idleTime: 500 });
    assert.equal(await rowCount(), initialRows);
    filters.push({ path, width, initialRows, emptyFilterMatched: true, clearedFilterRestored: true });
  }

  for (const width of widths) {
    await page.setViewport({ width, height: 1000 });
    for (const path of paths) {
      context = { width, path };
      await page.goto(origin + '/management' + path);
      await page.waitForSelector('.sidebar');
      await page.waitForNetworkIdle({ idleTime: 400, timeout: 90000 });
      await page.waitForFunction(() => ![...document.querySelectorAll('[role=status]')]
        .some(element => /Loading records/.test(element.textContent)));
      await new Promise(done => setTimeout(done, 500));
      const audit = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        heading: document.querySelector('main h1')?.textContent || '',
        alerts: [...document.querySelectorAll('main [role=alert]')].map(element => element.textContent),
      }));
      results.push({ width, path, ...audit });
      if (!before) assert.equal(audit.overflow, false, width + ' ' + path + ' overflow');
      if (filtersOnly) {
        assert.ok(audit.heading);
        assert.deepEqual(audit.alerts, []);
        await checkFilter(path, width);
      }
      const key = path ? path.slice(1).replaceAll('/', '-').replaceAll('?', '-').replaceAll('=', '-') : 'dashboard';
      await page.screenshot({ path: evidence + '/browser/' + mode + '-management-' + key + '-' + width + '.png', fullPage: true });
    }
  }

  if (!before && !moneyOnly && !financialFixture) {
    context = { width: 390, path: 'mobile-navigation' };
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(origin + '/management/cheques');
    await page.waitForSelector('.sidebar');
    await page.click('.mobile-toggle');
    await page.waitForSelector('.sidebar.is-open');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar')).transform === 'matrix(1, 0, 0, 1, 0, 0)');
    await page.type('.workspace-nav-search input', 'items');
    await page.click('.sidebar nav button');
    await page.waitForFunction(() => location.pathname === '/management/items');
    await page.goBack();
    await page.waitForFunction(() => location.pathname === '/management/cheques');
    await page.goForward();
    await page.waitForFunction(() => location.pathname === '/management/items');
    results.push({ navigation: 'mobile searchable menu, Back and Forward', passed: true });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.sidebar', element => getComputedStyle(element).transitionDuration), '0s');
    results.push({ reducedMotion: true, passed: true });
  }
} catch (error) {
  runError = error;
} finally {
  await Promise.allSettled(responseReads);
  const passed = !runError && !failures.length && !unsafeRequests.length && !results.some(result => result.alerts?.length);
  await writeFile(evidence + '/management-' + mode + '.json',
    JSON.stringify({ passed, readOnly: !unsafeRequests.length, results, failures, filters, unsafeRequests }, null, 2) + '\n');
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
  if (!passed && !before) process.exitCode = 1;
}
if (runError) throw runError;
