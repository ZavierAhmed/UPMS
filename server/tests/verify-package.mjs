// Local smoke test of an independently extracted ZIP with npm ci --omit=dev completed.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve,dirname } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const directory = resolve(process.argv[2] || "tmp/w06/package-check");
const archivePath=resolve(process.argv[3]||'artifacts/upms-node-deployment.zip');
const reportPath=resolve(process.argv[4]||'docs/W06-package-results.json');
execFileSync(process.execPath, ["scripts/check-deployment.mjs"], {
  cwd: directory,
  stdio: "pipe",
});
const release = JSON.parse(
  await readFile(resolve(directory, "deployment-manifest.json"), "utf8"),
);
const expectedArchiveHash = (
  await readFile(archivePath+'.sha256', "utf8")
).split(" ")[0];
assert.equal(
  createHash("sha256")
    .update(await readFile(archivePath))
    .digest("hex"),
  expectedArchiveHash,
);
// Verify the packaged build gate rejects content corruption, then restore this local fixture.
const probeFile = resolve(directory, "upms.client/dist/_pages/404.html");
const originalProbe = await readFile(probeFile);
try {
  await writeFile(
    probeFile,
    Buffer.concat([
      originalProbe,
      Buffer.from("<!--synthetic-integrity-probe-->"),
    ]),
  );
  assert.throws(() =>
    execFileSync(process.execPath, ["scripts/check-deployment.mjs"], {
      cwd: directory,
      stdio: "pipe",
    }),
  );
} finally {
  await writeFile(probeFile, originalProbe);
}
for (const dependency of ["express", "compression", "nodemailer"])
  await access(resolve(directory, "node_modules", dependency, "package.json"));
for (const dependency of ["lighthouse", "puppeteer-core", "supertest"])
  await assert.rejects(
    access(resolve(directory, "node_modules", dependency, "package.json")),
  );
assert.ok(
  Object.keys(release.files).every(
    (file) => !/\.env|outbox|node_modules|\.git\/|brochure|za.khan/i.test(file),
  ),
);
const reservation = createServer();
await new Promise((r) => reservation.listen(0, "127.0.0.1", r));
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const child = spawn(process.execPath, ["server/src/index.js"], {
  cwd: directory,
  env: {
    ...process.env,
    NODE_ENV: "production",
    MANAGEMENT_ENABLED: "false",
    PORT: String(port),
    ALLOWED_HOSTS: "127.0.0.1",
    PUBLIC_ORIGIN: "",
    INQUIRY_PUBLIC_ORIGIN: "",
    TRUSTED_PROXY_IPS: "127.0.0.1",
    TRUST_PROXY: "",
    ForwardedHeaders_Enabled: "",
    WEBSITE_ROOT: "upms.client/dist",
    INQUIRY_MODE: "Disabled",
    SMTP_HOST: "",
    SMTP_USERNAME: "",
    SMTP_PASSWORD: "",
    SMTP_FROM: "",
    SMTP_RECIPIENT: "",
  },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (data) => {
  output += data;
});
child.stderr.on("data", (data) => {
  output += data;
});
const exited = once(child, "exit");
const results = [];
const get = (path, options = {}) =>
  fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    redirect: "manual",
    headers: { "X-Forwarded-Proto": "https", ...options.headers },
  });
try {
  const deadline = Date.now() + 10000;
  while (!output.includes("UPMS listening")) {
    if (Date.now() > deadline || child.exitCode !== null)
      throw new Error("Packaged server did not start.");
    await new Promise((r) => setTimeout(r, 20));
  }
  const routes = JSON.parse(
    await readFile(
      resolve(directory, "upms.client/dist/public-routes.json"),
      "utf8",
    ),
  );
  for (const { path } of routes.pages) {
    const r = await get(path);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /data-prerender-path=/);
    results.push({ path, status: r.status });
  }
  const home = await (await get("/")).text();
  const asset = home.match(/<script[^>]+src="([^"]+)"/)[1];
  assert.equal((await get(asset)).status, 200);
  for (const path of [
    "/missing",
    "/.env",
    "/deployment-manifest.json",
    "/package.json",
    "/_pages/home.html",
    "/server/src/index.js",
    "/server/.local/inquiry-outbox/private.txt",
  ])
    assert.equal((await get(path)).status, 404, path);
  const { valid } = await import("./helpers.js");
  const response = await get("/api/v1/public/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "delivery_unavailable");
  const summary = {
    node: process.version,
    packagedFiles: Object.keys(release.files).length + 1,
    archiveSha256: expectedArchiveHash,
    corruptionRejected: true,
    productionOnlyInstall: true,
    routes: results,
    asset: { path: asset, status: 200 },
    privateProbes: 7,
    smtp: "Disabled; synthetic inquiry returned delivery_unavailable",
    passed: true,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  child.kill();
  await exited;
}
