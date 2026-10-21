import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";

const cleanEnv = (extra) => ({
  ...process.env,
  NODE_ENV: "production",
  ALLOWED_HOSTS: "localhost",
  PUBLIC_ORIGIN: "",
  TRUSTED_PROXY_IPS: "",
  TRUST_PROXY: "",
  ForwardedHeaders_Enabled: "",
  INQUIRY_MODE: "Disabled",
  INQUIRY_PUBLIC_ORIGIN: "",
  WEBSITE_ROOT: "upms.client/dist",
  SMTP_HOST: "",
  SMTP_USERNAME: "",
  SMTP_PASSWORD: "",
  SMTP_FROM: "",
  SMTP_RECIPIENT: "",
  ...extra,
});
async function freePort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}
function launch(env, shim = false) {
  const args = shim
    ? [
        "--input-type=module",
        "-e",
        "await import('./server/src/index.js'); process.on('message', message => { if (message === 'stop') { process.emit('SIGTERM'); process.disconnect(); } });",
      ]
    : ["server/src/index.js"];
  const child = spawn(process.execPath, args, {
    env: cleanEnv(env),
    stdio: ["ignore", "pipe", "pipe", ...(shim ? ["ipc"] : [])],
    windowsHide: true,
  });
  let output = "";
  child.stdout.on("data", (b) => {
    output += b;
  });
  child.stderr.on("data", (b) => {
    output += b;
  });
  const done = once(child, "exit");
  return { child, done, output: () => output };
}
async function ready(p) {
  const deadline = Date.now() + 10000;
  while (!p.output().includes("UPMS listening")) {
    if (p.child.exitCode !== null || Date.now() > deadline)
      throw new Error(`Startup did not become ready: ${p.output()}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}
for (const [name, env] of [
  ["missing production hosts", { ALLOWED_HOSTS: "" }],
  ["wildcard hosts", { ALLOWED_HOSTS: "*" }],
  ["bad port", { PORT: "invalid" }],
  ["missing build", { WEBSITE_ROOT: "tmp/w06/no-build" }],
  ["trust-all shortcut", { TRUST_PROXY: "true" }],
  ["unsafe origin", { PUBLIC_ORIGIN: "http://localhost" }],
])
  test(`real entry fails closed: ${name}`, { timeout: 10000 }, async () => {
    const p = launch(env);
    try {
      const [code] = await p.done;
      assert.equal(code, 1);
      assert.match(p.output(), /UPMS startup failed/);
      assert.doesNotMatch(p.output(), /\bat .*\.js:|SMTP_PASSWORD|stack/);
    } finally {
      if (p.child.exitCode === null) p.child.kill();
    }
  });
test(
  "real production entry honors PORT, serves all routes/security/API and shuts down cleanly",
  { timeout: 20000 },
  async () => {
    const port = await freePort();
    const p = launch(
      {
        PORT: String(port),
        ALLOWED_HOSTS: "localhost;127.0.0.1",
        TRUSTED_PROXY_IPS: "127.0.0.1",
        INQUIRY_PUBLIC_ORIGIN: "https://localhost",
      },
      true,
    );
    const get = (path, options = {}) =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        ...options,
        redirect: "manual",
        headers: {
          Host: "localhost",
          "X-Forwarded-Proto": "https",
          ...options.headers,
        },
      });
    try {
      await ready(p);
      assert.match(p.output(), new RegExp(`port ${port}`));
      const manifest = JSON.parse(
        await readFile("upms.client/dist/public-routes.json", "utf8"),
      );
      for (const { path } of manifest.pages) {
        const r = await get(path);
        assert.equal(r.status, 200, path);
        assert.match(await r.text(), /data-prerender-path=/);
        assert.match(
          r.headers.get("content-security-policy"),
          /script-src 'self'/,
        );
        assert.match(r.headers.get("strict-transport-security"), /15552000/);
      }
      const redirect = await get("/contact", {
        headers: { "X-Forwarded-Proto": "http" },
      });
      assert.equal(redirect.status, 307);
      assert.equal(
        redirect.headers.get("location"),
        "https://127.0.0.1/contact",
      );
      const hostileStatus = await new Promise((resolve, reject) => {
        const req = httpRequest(
          {
            host: "127.0.0.1",
            port,
            path: "/",
            headers: { Host: "attacker.example" },
          },
          (response) => {
            response.resume();
            response.on("end", () => resolve(response.statusCode));
          },
        );
        req.on("error", reject);
        req.end();
      });
      assert.equal(hostileStatus, 400);
      assert.equal((await get("/.env")).status, 404);
      assert.equal(
        (await get("/server/.local/inquiry-outbox/private.txt")).status,
        404,
      );
      assert.equal((await get("/api/missing")).status, 404);
      const { valid } = await import("./helpers.js");
      const r = await get("/api/v1/public/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
          Origin: "https://localhost",
        },
        body: JSON.stringify(valid),
      });
      assert.equal(r.status, 503);
      assert.equal((await r.json()).code, "delivery_unavailable");
      const start = Date.now();
      p.child.send("stop");
      const [code] = await p.done;
      assert.equal(code, 0);
      assert.ok(Date.now() - start < 6000);
      // Windows cannot deliver POSIX SIGTERM normally: the test shim emits the same registered handler over IPC.
    } finally {
      if (p.child.exitCode === null) p.child.kill();
    }
  },
);
test(
  "occupied production PORT fails clearly with nonzero exit",
  { timeout: 10000 },
  async () => {
    const occupied = createServer();
    await new Promise((r) => occupied.listen(0, "0.0.0.0", r));
    const p = launch({ PORT: String(occupied.address().port) });
    try {
      const [code] = await p.done;
      assert.equal(code, 1);
      assert.match(p.output(), /UPMS listener failed/);
    } finally {
      if (p.child.exitCode === null) p.child.kill();
      await new Promise((r) => occupied.close(r));
    }
  },
);
