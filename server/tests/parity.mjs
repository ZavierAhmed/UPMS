// Run against the intact W04 Development server with delivery Disabled and rate 100.
// Never point this harness at a public/live sender.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fixture, valid } from "./helpers.js";
const base = process.env.DOTNET_BASE_URL || "http://127.0.0.1:5080";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Parity baseline must be local.");
const f = fixture({ delivery: async () => "Unavailable" });
const results = [];
const manifest = JSON.parse(
  await readFile("upms.client/dist/public-routes.json", "utf8"),
);
for (const path of [
  ...manifest.pages.map((p) => p.path),
  "/missing",
  "/ABOUT",
  "/products/missing",
  "/api/missing",
  "/api/v1/public/inquiries",
  "/management/orders",
  "/admin/users",
  "/assets/missing.js",
  "/_pages/home.html",
  "/public-routes.json",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.svg",
  "/licenses/DM-Sans-OFL.txt",
]) {
  const old = await fetch(base + path);
  const current = await f.api.get(path).set("Host", "localhost");
  assert.equal(current.status, old.status, path);
  const oldText = await old.text();
  if (path.startsWith("/api")) {
    const before = JSON.parse(oldText);
    delete before.correlationId;
    const after = { ...current.body };
    delete after.correlationId;
    assert.deepEqual(after, before, path);
  } else if (path !== "/sitemap.xml")
    assert.equal(
      current.text ??
        (Buffer.isBuffer(current.body) ? current.body.toString("utf8") : ""),
      oldText,
      path,
    );
  for (const header of [
    "cache-control",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "x-robots-tag",
  ])
    assert.equal(
      current.headers[header] || null,
      old.headers.get(header),
      `${path} ${header}`,
    );
  results.push({ method: "GET", path, status: current.status, result: "PASS" });
}
for (const method of ["HEAD", "POST", "PUT", "OPTIONS"]) {
  for (const path of [
    "/contact",
    "/missing",
    "/robots.txt",
    "/sitemap.xml",
    "/api/v1/public/inquiries",
  ]) {
    // POST is covered below with a valid media type/key.
    if (method === "POST" && path.startsWith("/api")) continue;
    const old = await fetch(base + path, { method });
    const current = await f.api[method.toLowerCase()](path).set(
      "Host",
      "localhost",
    );
    assert.equal(current.status, old.status, `${method} ${path}`);
    results.push({ method, path, status: current.status, result: "PASS" });
  }
}
const cases = [
  { name: "disabled delivery", body: valid },
  { name: "required fields", body: {} },
  ...[
    "not-an-email",
    "Name <person@example.test>",
    "a@example.test\r\nBcc: x@example.test",
    "a@b",
    "a..b@example.test",
    ".a@example.test",
    "a.@example.test",
    "a@-example.test",
    '"a"@example.test',
    "a@localhost",
    "a,b@example.test",
    "a:b@example.test",
    "a(comment)@example.test",
  ].map((email) => ({ name: `email ${email}`, body: { ...valid, email } })),
  ...[
    "buckets",
    "cans",
    "jars",
    "containers",
    "custom",
    "Buckets",
    "unknown",
  ].map((productCategory) => ({
    name: `category ${productCategory}`,
    body: { ...valid, productCategory },
  })),
  ...[
    ["customerName", "x".repeat(101)],
    ["companyName", "x".repeat(151)],
    ["quantity", "x".repeat(81)],
    ["capacity", "x".repeat(81)],
    ["message", "short"],
    ["phone", "abc123"],
    ["website", "spam.example"],
  ].map(([key, value]) => ({
    name: `invalid ${key}`,
    body: { ...valid, [key]: value },
  })),
  { name: "malformed JSON", raw: "{broken" },
  { name: "null body", raw: "null" },
  { name: "wrong type", body: { ...valid, customerName: 3 } },
  { name: "oversized", body: { ...valid, message: "x".repeat(17000) } },
  {
    name: "cross-origin",
    body: valid,
    headers: { Origin: "https://other.example" },
  },
  {
    name: "cross-site",
    body: valid,
    headers: { "Sec-Fetch-Site": "cross-site" },
  },
  {
    name: "unsupported content",
    raw: "text",
    headers: { "Content-Type": "text/plain" },
  },
  {
    name: "content encoding",
    body: valid,
    headers: { "Content-Encoding": "gzip" },
  },
  { name: "invalid key", body: valid, headers: { "Idempotency-Key": "bad" } },
];
for (const c of cases) {
  const headers = {
    "Content-Type": "application/json",
    "Idempotency-Key": randomUUID(),
    ...c.headers,
  };
  const raw = c.raw ?? JSON.stringify(c.body);
  const old = await fetch(base + "/api/v1/public/inquiries", {
    method: "POST",
    headers,
    body: raw,
  });
  let current = f.api.post("/api/v1/public/inquiries").set("Host", "localhost");
  for (const [key, value] of Object.entries(headers))
    current = current.set(key, value);
  const r = await current.send(raw);
  const before = await old.json();
  const after = { ...r.body };
  delete before.correlationId;
  delete after.correlationId;
  try {
    assert.equal(r.status, old.status);
    assert.deepEqual(after, before);
    results.push({ name: c.name, status: r.status, result: "PASS" });
  } catch (error) {
    results.push({
      name: c.name,
      oldStatus: old.status,
      nodeStatus: r.status,
      before,
      after,
      result: "FAIL",
    });
  }
}
await mkdir("docs", { recursive: true });
await writeFile(
  "docs/W05-parity-results.json",
  JSON.stringify(
    {
      baseline: "bfb28d318939b33e1edd2d76613cc2f4353ba8ba",
      date: new Date().toISOString(),
      results,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      checks: results.length,
      failures: results.filter((r) => r.result === "FAIL"),
    },
    null,
    2,
  ),
);
assert.ok(results.every((r) => r.result === "PASS"));
