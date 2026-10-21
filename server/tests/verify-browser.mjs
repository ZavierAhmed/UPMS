// Local-only browser/Lighthouse harness; never deploy this file as an entry point.
import puppeteer from "puppeteer-core";
import lighthouse from "lighthouse";
import { createServer } from "node:https";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/index.js";
const certificateRoot = join(process.env.APPDATA || "", "ASP.NET", "https");
const tls = {
  cert: await readFile(
    process.env.TEST_TLS_CERT || join(certificateRoot, "upms.client.pem"),
  ),
  key: await readFile(
    process.env.TEST_TLS_KEY || join(certificateRoot, "upms.client.key"),
  ),
};
const base = "https://localhost:7445";
const config = loadConfig({
  NODE_ENV: "production",
  ALLOWED_HOSTS: "localhost;www.example.test",
  PUBLIC_ORIGIN: "https://www.example.test",
  INQUIRY_PUBLIC_ORIGIN: base,
  INQUIRY_RATE_LIMIT: "100",
});
const server = createServer(tls, createApp({ config }));
const development = createServer(
  tls,
  createApp({
    config: {
      ...loadConfig({
        NODE_ENV: "development",
        INQUIRY_MODE: "DevelopmentFile",
        INQUIRY_RATE_LIMIT: "100",
        INQUIRY_PUBLIC_ORIGIN: "https://localhost:7446",
      }),
      outbox: join(process.cwd(), "tmp/w05/test-outbox"),
    },
  }),
);
await new Promise((r) => server.listen(7445, "127.0.0.1", r));
await new Promise((r) => development.listen(7446, "127.0.0.1", r));
await mkdir("docs/screenshots/w05", { recursive: true });
await mkdir("tmp/w05", { recursive: true });
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  acceptInsecureCerts: true,
  args: ["--ignore-certificate-errors", "--disable-extensions"],
});
const page = await browser.newPage();
const errors = [];
const hydration = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (/hydration|hydrating|Minified React error/i.test(e.text()))
    hydration.push(e.text());
});
const manifest = JSON.parse(
  await readFile("upms.client/dist/public-routes.json", "utf8"),
);
const results = [],
  interactions = [];
async function goto(path, root = base) {
  const response = await page.goto(root + path, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.activeElement?.id === "main");
  return response;
}
async function check(condition, name) {
  assert.ok(condition, name);
  interactions.push(name);
}
try {
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewport({ width, height: 1000 });
    for (const { path } of manifest.pages) {
      const response = await goto(path);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 15));
        }
        await Promise.all(
          [...document.images].map((i) => i.decode().catch(() => {})),
        );
        window.scrollTo(0, 0);
      });
      const state = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        focusedMain: document.activeElement?.id === "main",
        brokenImages: [...document.images]
          .filter((i) => !i.complete || !i.naturalWidth)
          .map((i) => i.src),
        whatsapp: [
          ...document.querySelectorAll('a[href^="https://wa.me/"]'),
        ].map((a) => a.href),
        maps: [
          ...document.querySelectorAll('a[href^="https://maps.app.goo.gl/"]'),
        ].map((a) => a.href),
      }));
      assert.equal(response.status(), 200);
      assert.equal(state.width, width);
      assert.ok(state.scrollWidth <= width, `${path} overflow at ${width}`);
      assert.equal(state.h1Count, 1);
      assert.ok(state.focusedMain);
      assert.deepEqual(state.brokenImages, []);
      assert.ok(
        state.whatsapp.every((link) =>
          link.startsWith("https://wa.me/923142113472?text="),
        ),
      );
      assert.ok(
        state.maps.includes("https://maps.app.goo.gl/KJGy7zo7cQhsFwsF6"),
      );
      results.push({ path, width, status: response.status(), ...state });
      if (
        (width === 1440 && path === "/") ||
        (width === 390 && ["/contact", "/products/buckets"].includes(path))
      )
        await page.screenshot({
          path: `docs/screenshots/w05/${path === "/" ? "home" : path.split("/").at(-1)}-${width}.png`,
          fullPage: true,
        });
    }
    console.log(`Browser matrix: 11 routes passed at ${width}px`);
  }
  await page.setViewport({ width: 390, height: 900 });
  await goto("/");
  await page.click(".menu-toggle");
  await check(
    await page.$eval(
      ".menu-toggle",
      (b) => b.getAttribute("aria-expanded") === "true",
    ),
    "Mobile menu opens",
  );
  await page.keyboard.press("Escape");
  await check(
    await page.$eval(
      ".menu-toggle",
      (b) => b.getAttribute("aria-expanded") === "false",
    ),
    "Escape closes menu",
  );
  await page.click(".menu-toggle");
  await page.click('nav[aria-label="Main navigation"] a[href="/products"]');
  await page.waitForSelector("#product-search");
  await check(
    await page.$eval(
      ".menu-toggle",
      (b) => b.getAttribute("aria-expanded") === "false",
    ),
    "Menu closes after navigation",
  );
  await page.type("#product-search", "zzzzz");
  await page.waitForFunction(
    () =>
      document.querySelector('[role="status"]').textContent === "0 categories",
  );
  interactions.push("Search empty state");
  await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Clear search and filters"))
      .click(),
  );
  await page.waitForFunction(
    () =>
      document.querySelector('[role="status"]').textContent === "5 categories",
  );
  interactions.push("Clear restores five categories");
  await page.select("#product-filter", "Custom solutions");
  await page.waitForFunction(
    () =>
      document.querySelector('[role="status"]').textContent === "1 category",
  );
  interactions.push("Custom packaging filter");
  await page.click('main a[href="/products/custom"]');
  await page.waitForFunction(() => location.pathname === "/products/custom");
  await page.reload({ waitUntil: "networkidle0" });
  await check(
    await page.$eval("h1", (h) => h.textContent === "Custom Packaging"),
    "Direct detail refresh",
  );
  for (const category of ["buckets", "cans", "jars", "containers", "custom"]) {
    await goto(`/products/${category}`);
    await check(
      await page.$$eval('main a[href^="https://wa.me/"]', (links) =>
        links.some(
          (a) =>
            a.href.startsWith("https://wa.me/923142113472?text=") &&
            a.href.length > 70,
        ),
      ),
      `Product WhatsApp action ${category}`,
    );
    await goto(`/contact?category=${category}`);
    await page.waitForFunction(
      (expected) =>
        document.querySelector("#inquiry-productCategory").value === expected,
      {},
      category,
    );
    interactions.push(`Category preselection ${category}`);
  }
  await goto("/contact");
  async function fillAndSubmit() {
    for (const [name, value] of Object.entries({
      customerName: "Test Buyer",
      email: "buyer@example.test",
      phone: "+92 300 1234567",
      message: "Automated packaging inquiry for local testing only.",
    }))
      await page.type(`#inquiry-${name}`, value);
    await page.select("#inquiry-productCategory", "buckets");
    await page.click('form button[type="submit"]');
  }
  await fillAndSubmit();
  await page.waitForFunction(() =>
    document.body.innerText.includes("Your inquiry has not been sent."),
  );
  interactions.push("Disabled production form honestly reports unavailable");
  await check(
    await page.$eval("#inquiry-email", (e) => e.value === "buyer@example.test"),
    "Failed form preserves details",
  );
  await goto("/contact", "https://localhost:7446");
  await fillAndSubmit();
  await page.waitForFunction(() =>
    document.body.innerText.includes("No email was sent."),
  );
  interactions.push("Development-only outbox accepted through browser");
  const unknown = await page.goto(base + "/not-a-page", {
    waitUntil: "networkidle0",
  });
  await check(unknown.status() === 404, "Unknown page is HTTP 404");
  await goto("/#/products/cans");
  await page.waitForFunction(
    () => document.querySelector("h1")?.textContent === "Lubricant Cans",
  );
  interactions.push("Legacy hash navigation");
  assert.deepEqual(errors, []);
  assert.deepEqual(hydration, []);
  await writeFile(
    "docs/W05-browser-results.json",
    JSON.stringify(
      {
        browser: await browser.version(),
        base,
        productionMode: true,
        syntheticCanonicalOrigin: config.origin,
        results,
        interactions,
        errors,
        hydration,
        passed: true,
      },
      null,
      2,
    ),
  );
  console.log(
    `Browser verification passed: ${results.length} route/viewport combinations; ${interactions.length} interactions`,
  );
  const endpoint = new URL(browser.wsEndpoint());
  const scores = [];
  for (const [name, path] of [
    ["home", "/"],
    ["catalog", "/products"],
    ["detail", "/products/buckets"],
    ["contact", "/contact"],
  ]) {
    const report = await lighthouse(base + path, {
      port: Number(endpoint.port),
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      chromeFlags: ["--ignore-certificate-errors"],
    });
    await writeFile(`tmp/w05/lighthouse-${name}.json`, report.report);
    const lhr = report.lhr;
    scores.push({
      page: name,
      url: lhr.finalDisplayedUrl,
      version: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime,
      formFactor: lhr.configSettings.formFactor,
      runWarnings: lhr.runWarnings,
      scores: Object.fromEntries(
        Object.entries(lhr.categories).map(([k, v]) => [
          k,
          Math.round(v.score * 100),
        ]),
      ),
      metrics: Object.fromEntries(
        [
          "largest-contentful-paint",
          "total-blocking-time",
          "cumulative-layout-shift",
        ].map((k) => [k, lhr.audits[k].numericValue]),
      ),
      accessibilityFailures: Object.values(lhr.audits)
        .filter(
          (a) =>
            a.score === 0 &&
            lhr.categories.accessibility.auditRefs.some((r) => r.id === a.id),
        )
        .map((a) => a.id),
    });
    console.log(`Lighthouse ${name}: ${JSON.stringify(scores.at(-1).scores)}`);
    await writeFile(
      "docs/W05-lighthouse-summary.json",
      JSON.stringify(scores, null, 2),
    );
  }
} finally {
  await browser.close();
  await Promise.all([
    new Promise((r) => server.close(r)),
    new Promise((r) => development.close(r)),
  ]);
}
