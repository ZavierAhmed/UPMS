import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixture } from "./helpers.js";
import { loadConfig, validateOrigin } from "../src/config/index.js";
import { peerInfo } from "../src/middleware/security.js";
import { escape } from "../src/website/index.js";
const manifest = JSON.parse(
  readFileSync("upms.client/dist/public-routes.json", "utf8"),
);
const env = {
  PUBLIC_ORIGIN: "https://www.example.test",
  ALLOWED_HOSTS: "localhost;www.example.test",
};
for (const page of manifest.pages)
  test(`prerendered metadata, links and company identity ${page.path}`, async () => {
    const r = await fixture({ env })
      .api.get(page.path)
      .set("Host", "localhost");
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(`<title>${escape(page.title)}</title>`));
    assert.ok(r.text.includes(`content="${escape(page.description)}"`));
    assert.equal((r.text.match(/<h1[ >]/g) || []).length, 1);
    assert.ok(r.text.includes(`data-prerender-path="${page.path}"`));
    assert.ok(
      r.text.includes(
        `rel="canonical" href="https://www.example.test${page.path}"`,
      ),
    );
    assert.ok(
      r.text.includes(
        `property="og:url" content="https://www.example.test${page.path}"`,
      ),
    );
    assert.match(
      r.text,
      /F-260\/A, Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan/,
    );
    assert.match(r.text, /https:\/\/wa.me\/923142113472\?text=/);
    assert.match(r.text, /https:\/\/maps.app.goo.gl\/KJGy7zo7cQhsFwsF6/);
    assert.doesNotMatch(
      r.text,
      /Z\.A|Unique Lubricants|<!--prerender-->|\/src\//,
    );
    assert.equal(r.headers["cache-control"], "no-cache");
  });
for (const path of [
  "/missing",
  "/ABOUT",
  "/products/missing",
  "/products/buckets/extra",
])
  test(`HTML 404 ${path}`, async () => {
    const r = await fixture({ env }).api.get(path).set("Host", "localhost");
    assert.equal(r.status, 404);
    assert.match(r.text, /404 \/ PAGE NOT FOUND/);
    assert.match(r.headers["x-robots-tag"], /noindex/);
    assert.doesNotMatch(r.text, /rel="canonical"/);
  });
for (const path of [
  "/assets/missing.js",
  "/assets/missing",
  "/index.html",
  "/public-routes.json",
  "/_pages/home.html",
  "/appsettings.json",
  "/management/orders",
  "/admin/users",
  "/.env",
  "/server/.local/inquiry-outbox/file.txt",
  "/src/app.js",
  "/assets/%2e%2e%2f_pages/home.html",
])
  test(`private/reserved paths ${path}`, async () => {
    const r = await fixture().api.get(path).set("Host", "localhost");
    assert.equal(r.status, 404);
    assert.doesNotMatch(r.text, /<html/);
  });
test("static asset types caching compression, license accessibility and HEAD", async () => {
  const f = fixture();
  const home = await f.api.get("/").set("Host", "localhost");
  const scripts = [
    ...home.text.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g),
  ].map((m) => m[1]);
  for (const path of scripts) {
    const r = await f.api.get(path).set("Host", "localhost");
    assert.equal(r.status, 200);
    assert.match(r.headers["cache-control"], /immutable/);
  }
  const script = scripts.find((p) => p.endsWith(".js"));
  const r = await f.api
    .get(script)
    .set("Host", "localhost")
    .set("Accept-Encoding", "gzip");
  assert.match(r.headers["content-type"], /javascript/);
  assert.equal(r.headers["content-encoding"], "gzip");
  for (const font of ["DM-Sans", "Manrope"]) {
    const license = await f.api
      .get(`/licenses/${font}-OFL.txt`)
      .set("Host", "localhost");
    assert.match(license.text, /SIL OPEN FONT LICENSE/);
    assert.equal(license.headers["x-robots-tag"], "noindex");
  }
  const head = await f.api.head("/products/buckets").set("Host", "localhost");
  assert.equal(head.status, 200);
  assert.equal(head.text, undefined);
  assert.equal(
    (await f.api.get("/about/").set("Host", "localhost")).status,
    200,
  );
  const post = await f.api.post("/contact").set("Host", "localhost");
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
});
test("sitemap and robots registry; unconfigured origin indexing safety", async () => {
  const f = fixture({ env });
  const sitemap = await f.api.get("/sitemap.xml").set("Host", "localhost");
  assert.equal((sitemap.text.match(/<loc>/g) || []).length, 11);
  assert.ok(!sitemap.text.includes('/products/jars'));
  assert.ok(!sitemap.text.includes('/products/custom'));
  assert.ok(sitemap.text.includes('/products/stickers'));
  assert.ok(sitemap.text.includes('/products/cartons'));
  const retired=await f.api.get('/products/jars').set('Host','localhost');
  assert.equal(retired.status,404);
  assert.match(retired.text,/404 \/ PAGE NOT FOUND/);
  for (const p of manifest.pages)
    assert.ok(sitemap.text.includes(`https://www.example.test${p.path}</loc>`));
  assert.match(
    (await f.api.get("/robots.txt").set("Host", "localhost")).text,
    /Disallow: \/management\//,
  );
  const none = fixture();
  const page = await none.api.get("/").set("Host", "localhost");
  assert.match(page.headers["x-robots-tag"], /noindex/);
  assert.doesNotMatch(page.text, /rel="canonical"|property="og:url"/);
  assert.equal(
    (await none.api.get("/sitemap.xml").set("Host", "localhost")).status,
    503,
  );
  assert.equal(
    (await none.api.get("/robots.txt").set("Host", "localhost")).text,
    "User-agent: *\nDisallow: /\n",
  );
  const contact = await f.api
    .get("/contact?category=cans")
    .set("Host", "localhost");
  assert.match(contact.text, /https:\/\/www.example.test\/contact"/);
  assert.match(contact.text, /<fieldset disabled=""/);
  assert.match(contact.text, /Online inquiry submission requires JavaScript/);
});
test("API JSON 404, confidentiality and no compression", async () => {
  const f = fixture();
  for (const path of [
    "/api/unknown",
    "/API/unknown",
    "/api/v1/public/inquiries",
  ]) {
    const r = await f.api
      .get(path)
      .set("Host", "localhost")
      .set("Accept-Encoding", "gzip");
    assert.equal(r.status, 404);
    assert.equal(r.body.code, "not_found");
    assert.equal(r.headers["cache-control"], "no-store");
    assert.equal(r.headers["content-encoding"], undefined);
    assert.equal(r.body.errors, null);
  }
  const r = await f.send({}).set("Accept-Encoding", "gzip");
  assert.equal(r.headers["content-encoding"], undefined);
});
test("security headers, exact host validation, HTTPS redirects and trusted peer", async () => {
  const f = fixture({
    env: { ...env, NODE_ENV: "production", TRUSTED_PROXY_IPS: "127.0.0.1" },
  });
  const r = await f.api
    .get("/")
    .set("Host", "localhost")
    .set("X-Forwarded-Proto", "https");
  assert.equal(r.status, 200);
  assert.equal(r.headers["x-frame-options"], "DENY");
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  assert.match(r.headers["content-security-policy"], /script-src 'self'/);
  assert.doesNotMatch(r.headers["content-security-policy"], /unsafe-inline/);
  assert.equal(r.headers["strict-transport-security"], "max-age=15552000");
  assert.equal(r.headers["x-powered-by"], undefined);
  const redirect = await f.api.get("/").set("Host", "localhost");
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.location, "https://localhost/");
  assert.equal(
    (await f.api.get("/").set("Host", "attacker.example")).status,
    400,
  );
  for (const remote of ["192.0.2.10", "198.51.100.10"]) {
    const info = peerInfo(
      {
        socket: { remoteAddress: remote },
        headers: {
          "x-forwarded-for": "attacker,203.0.113.10",
          "x-forwarded-proto": "http,https",
          "x-forwarded-host": "attacker.example",
        },
      },
      { proxies: ["192.0.2.10"] },
    );
    assert.equal(info.secure, remote === "192.0.2.10");
    assert.equal(info.ip, remote === "192.0.2.10" ? "203.0.113.10" : remote);
  }
});
for (const origin of [
  "http://www.example.test",
  "https://localhost",
  "https://127.0.0.1",
  "https://www.example.test/path",
  "https://www.example.test?x=1",
  "https://user:password@www.example.test",
  "https://www.example.test:8443",
])
  test(`reject unsafe canonical ${origin}`, () =>
    assert.throws(() => validateOrigin(origin)));
test("unsafe startup settings fail closed; missing build fails", () => {
  for (const settings of [
    { NODE_ENV: "production" },
    { ALLOWED_HOSTS: "*" },
    { ...env, ALLOWED_HOSTS: "localhost" },
    { TRUST_PROXY: "true" },
    { TRUSTED_PROXY_IPS: "10.0.0.0/8" },
  ])
    assert.throws(() => loadConfig(settings));
  assert.throws(() => fixture({ env: { WEBSITE_ROOT: "server/no-build" } }));
});
test("legacy sample weather API contract preserved", async () => {
  const r = await fixture()
    .api.get("/weatherforecast")
    .set("Host", "localhost");
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 5);
  assert.deepEqual(
    Object.keys(r.body[0]).sort(),
    ["date", "temperatureC", "temperatureF", "summary"].sort(),
  );
});
