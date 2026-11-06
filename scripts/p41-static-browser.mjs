import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  acceptInsecureCerts: true,
  args: [
    '--no-proxy-server',
    '--host-resolver-rules=MAP unique-plastic.com 127.0.0.1:5228',
  ],
});
try {
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', () => failures.push('page-error'));
  async function visit(path) {
    const response = await page.goto('https://unique-plastic.com' + path, { waitUntil: 'networkidle0' });
    assert.equal(response.remoteAddress().ip, '127.0.0.1');
    assert.equal(response.status(), 200);
  }
  await visit('/products/cans');
  await page.waitForSelector('[aria-label="Next product image"]');
  await page.click('[aria-label="Next product image"]');
  await page.waitForFunction(() => {
    const image = document.querySelector('.gallery-stage img, .product-gallery img');
    return image?.complete && image.naturalWidth > 0 &&
      document.querySelector('.gallery-controls [aria-live]')?.textContent?.startsWith('2 of ');
  });
  await visit('/contact');
  await page.waitForFunction(() => document.querySelector('fieldset')?.disabled &&
    document.querySelector('[role="note"]')?.textContent?.includes('not enabled'));
  assert.ok(await page.$('a[href="tel:+923152209511"]'));
  assert.ok(await page.$('a[href*="wa.me/923142113472"]'));
  assert.deepEqual(failures, []);
  await writeFile(process.argv[2] || 'docs/phase-4.1/evidence/static-browser.json', JSON.stringify({
    passed: true, loopback: true, galleryImageDecoded: true, galleryNavigation: true, inquiryDisabled: true,
    primaryPhoneVerified: true, whatsappVerified: true,
  }, null, 2) + '\n');
} finally {
  await browser.close();
}
