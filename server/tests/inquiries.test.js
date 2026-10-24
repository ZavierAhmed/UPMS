import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, valid } from "./helpers.js";
import { createSubmissions } from "../src/inquiries/submissions.js";
import { normalize } from "../src/inquiries/validation.js";
import { createServer, request as httpRequest } from "node:http";
test("explicit test acceptance and correlation contract", async () => {
  const f = fixture();
  const r = await f.send();
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "development_saved");
  assert.match(r.body.message, /No email/);
  assert.equal(r.body.correlationId, r.headers["x-correlation-id"]);
  assert.match(r.body.reference, /^[a-f0-9]{32}$/);
  assert.equal(f.calls.length, 1);
});
test("required fields and exact field error messages", async () => {
  const f = fixture();
  const r = await f.send({});
  assert.equal(r.status, 400);
  assert.equal(r.body.code, "validation_failed");
  assert.deepEqual(
    Object.keys(r.body.errors).sort(),
    ["customerName", "email", "message", "phone", "productCategory"].sort(),
  );
  assert.equal(f.calls.length, 0);
});
for (const [field, value] of [
  ["email", "not-an-email"],
  ["email", "Name <person@example.test>"],
  ["email", "a@example.test\r\nBcc: hidden@example.test"],
  ["customerName", "Buyer\r\nInjected"],
  ["phone", "abc123"],
  ["productCategory", "unknown"],
  ["productCategory", "Buckets"],
  ["productCategory", "constructor"],
  ["message", "short"],
  ["customerName", "x".repeat(101)],
  ["companyName", "x".repeat(151)],
  ["email", "x".repeat(255)],
  ["phone", "1".repeat(41)],
  ["quantity", "x".repeat(81)],
  ["capacity", "x".repeat(81)],
  ["message", "x".repeat(4001)],
  ["website", "spam.example"],
]) {
  test(`reject invalid ${field}: ${value.slice(0, 25)}`, async () => {
    const f = fixture();
    assert.equal((await f.send({ ...valid, [field]: value })).status, 400);
    assert.equal(f.calls.length, 0);
  });
}
test("retired jars category is rejected without delivery", async () => {
  const f=fixture();
  assert.equal((await f.send({...valid,productCategory:'jars'})).status,400);
  assert.equal(f.calls.length,0);
});
for (const category of ["buckets", "cans", "containers", "custom"])
  test(`accept category ${category}`, async () =>
    assert.equal(
      (await fixture().send({ ...valid, productCategory: category })).status,
      200,
    ));
test("concurrent duplicates share work/reference; changed data conflicts; UUID case normalizes", async () => {
  let count = 0;
  const f = fixture({
    delivery: async () => {
      count++;
      await new Promise((r) => setTimeout(r, 30));
      return "DevelopmentSaved";
    },
  });
  const key = randomUUID();
  const [a, b] = await Promise.all([
    f.send(valid, key),
    f.send(valid, key.toUpperCase()),
  ]);
  assert.equal(a.body.reference, b.body.reference);
  assert.equal(count, 1);
  assert.equal(
    (
      await f.send(
        { ...valid, message: "Different requirements after first submission." },
        key,
      )
    ).status,
    409,
  );
});
for (const [outcome, status, code] of [
  ["Unavailable", 503, "delivery_unavailable"],
  ["Rejected", 502, "delivery_rejected"],
  ["Unknown", 503, "delivery_unknown"],
])
  test(`cache ${outcome} retry outcome`, async () => {
    let count = 0;
    const f = fixture({
      delivery: async () => {
        count++;
        return outcome;
      },
    });
    const key = randomUUID();
    const first = await f.send(valid, key);
    const second = await f.send(valid, key);
    assert.equal(first.status, status);
    assert.equal(first.body.code, code);
    assert.equal(first.body.message, second.body.message);
    assert.equal(count, 1);
  });
test("exceptions and ordinary logs disclose no sensitive data", async () => {
  const f = fixture({
    delivery: async () => {
      throw new Error("private-infrastructure-secret");
    },
  });
  const r = await f.send();
  assert.equal(r.body.code, "delivery_unknown");
  const text = JSON.stringify([r.body, f.logs]);
  for (const secret of [
    valid.email,
    valid.phone,
    valid.message,
    "private-infrastructure-secret",
    "stack",
  ])
    assert.ok(!text.includes(secret));
  assert.equal(f.logs[0].event, "Inquiry handoff");
});
test("bounded timeout is uncertain, cached and cancellation signaled", async () => {
  let count = 0;
  let signal;
  const f = fixture({
    env: { INQUIRY_TIMEOUT_SECONDS: "1" },
    delivery: async (_r, _ref, s) => {
      count++;
      signal = s;
      return new Promise(() => {});
    },
  });
  const key = randomUUID();
  const r = await f.send(valid, key);
  assert.equal(r.body.code, "delivery_unknown");
  assert.ok(signal.aborted);
  await f.send(valid, key);
  assert.equal(count, 1);
});
test("shutdown cancels pending delivery conservatively", async () => {
  const controller = new AbortController();
  const f = fixture({
    shutdownSignal: controller.signal,
    delivery: async () => {
      controller.abort();
      return new Promise(() => {});
    },
  });
  assert.equal((await f.send()).body.code, "delivery_unknown");
});
test("rate limits fixed window and expires; duplicate attempts consume permits", async () => {
  let time = 1000;
  const f = fixture({ env: { INQUIRY_RATE_LIMIT: "2" }, now: () => time });
  const key = randomUUID();
  await f.send(valid, key);
  await f.send(valid, key);
  const r = await f.send();
  assert.equal(r.status, 429);
  assert.equal(r.body.code, "rate_limited");
  assert.equal(r.headers["retry-after"], "600");
  assert.equal(f.calls.length, 1);
  time += 600001;
  assert.equal((await f.send()).status, 200);
});
test("origin boundary covers alternate casing/trailing slash without CORS or permit consumption", async () => {
  const f = fixture({ env: { INQUIRY_RATE_LIMIT: "1" } });
  for (const path of [
    "/api/v1/public/inquiries",
    "/api/v1/public/inquiries/",
    "/API/v1/public/inquiries",
  ]) {
    const r = await f
      .send(valid, randomUUID(), path)
      .set("Origin", "https://other.example");
    assert.equal(r.status, 403);
    assert.equal(r.headers["access-control-allow-origin"], undefined);
  }
  assert.equal(
    (await f.send().set("Sec-Fetch-Site", "cross-site")).status,
    403,
  );
  assert.equal((await f.send().set("Origin", "http://localhost")).status, 200);
});
test("SMTP acceptance does not claim inbox receipt", async () => {
  const r = await fixture({ delivery: async () => "SmtpAccepted" }).send();
  assert.equal(r.body.status, "smtp_accepted");
  assert.match(r.body.message, /Inbox receipt is not yet confirmed/);
});
test("invalid keys, JSON types/depth, content encoding/media and sizes", async () => {
  const f = fixture();
  for (const key of ["", "bad", "00000000-0000-0000-0000-000000000000"])
    assert.equal(
      (await f.send(valid, key)).body.code,
      "invalid_idempotency_key",
    );
  for (const raw of [
    "{broken",
    "null",
    "[]",
    '{"customerName":2}',
    JSON.stringify({ a: { a: { a: { a: { a: { a: { a: { a: {} } } } } } } } }),
  ]) {
    const r = await f.send(raw).set("Content-Type", "application/json");
    assert.equal(r.status, 400);
    assert.equal(r.body.code, "invalid_json");
  }
  assert.equal(
    (await f.send("text").set("Content-Type", "text/plain")).status,
    415,
  );
  assert.equal((await f.send().set("Content-Encoding", "gzip")).status, 415);
  assert.equal(
    (await f.send({ ...valid, message: "x".repeat(17000) })).status,
    413,
  );
  const server = createServer(f.app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          method: "POST",
          path: "/api/v1/public/inquiries",
          headers: {
            Host: "localhost",
            "Content-Type": "application/json",
            "Idempotency-Key": randomUUID(),
            "Transfer-Encoding": "chunked",
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        },
      );
      req.on("error", reject);
      req.write("x".repeat(9000));
      req.end("x".repeat(9000));
    });
    assert.equal(status, 413);
    assert.equal(f.calls.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("normalization trims and accepts case insensitive properties and null optionals", async () => {
  const f = fixture();
  const r = await f.send({
    ...valid,
    customerName: undefined,
    CustomerName: "  Test Buyer ",
    companyName: null,
    extra: "ignored",
  });
  assert.equal(r.status, 200);
  assert.equal(f.calls[0][0].customerName, "Test Buyer");
});
test("bounded submission capacity, expiry and pending protection", async () => {
  let time = 0;
  const config = { timeoutMs: 10000 };
  let calls = 0;
  const submit = createSubmissions(
    config,
    async () => {
      calls++;
      return "Unavailable";
    },
    { now: () => time },
  );
  const body = normalize(valid);
  for (let i = 0; i < 1000; i++) await submit(String(i), body).work;
  assert.equal(submit("overflow", body).error, "busy");
  time = 1800001;
  await submit("0", body).work;
  assert.equal(calls, 1001);
  const stopping = new AbortController();
  const pending = createSubmissions(config, async () => new Promise(() => {}), {
    now: () => time,
    shutdownSignal: stopping.signal,
  });
  const work = pending("pending", body).work;
  time += 1800001;
  assert.equal(pending("pending", body).work, work);
  stopping.abort();
  await work;
});
