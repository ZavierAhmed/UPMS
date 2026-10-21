import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config/index.js";
import { createDelivery, buildMessage } from "../src/inquiries/delivery.js";
import { valid } from "./helpers.js";
import { createServer } from "node:net";
for (const mode of ["Disabled", "DevelopmentFile", "Smtp"])
  test(`production ${mode} without SMTP never succeeds`, async () => {
    const config = loadConfig({
      NODE_ENV: "production",
      ALLOWED_HOSTS: "localhost",
      INQUIRY_MODE: mode,
    });
    assert.equal(
      await createDelivery(config)(
        valid,
        "test-reference",
        new AbortController().signal,
      ),
      "Unavailable",
    );
  });
test("development file transport is atomic and private with explicit outcome", async () => {
  const directory = await mkdtemp(join(tmpdir(), "upms-test-"));
  try {
    const config = {
      ...loadConfig({ INQUIRY_MODE: "DevelopmentFile" }),
      outbox: directory,
    };
    assert.equal(
      await createDelivery(config)(
        valid,
        "test-reference",
        new AbortController().signal,
      ),
      "DevelopmentSaved",
    );
    assert.deepEqual(await readdir(directory), ["test-reference.txt"]);
    assert.match(
      await readFile(join(directory, "test-reference.txt"), "utf8"),
      /Unique Plastic Industry/,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});
test("fixed plain text message, validated reply-to, no CC/BCC or HTML", () => {
  const message = buildMessage(
    { ...valid, message: "<script>test</script>" },
    "test-reference",
    { from: "sender@example.test", recipient: "inbox@example.test" },
  );
  assert.equal(
    message.subject,
    "Unique Plastic Industry packaging inquiry [test-reference]",
  );
  assert.equal(message.replyTo.address, valid.email);
  assert.equal(message.html, undefined);
  assert.equal(message.cc, undefined);
  assert.equal(message.bcc, undefined);
  assert.match(message.text, /<script>/);
});
test("disconnect failure cannot undo confirmed SMTP acceptance", async () => {
  const config = loadConfig({
    INQUIRY_MODE: "Smtp",
    SMTP_HOST: "smtp.example.test",
    SMTP_USERNAME: "test",
    SMTP_PASSWORD: "synthetic-test-only",
    SMTP_FROM: "sender@example.test",
    SMTP_RECIPIENT: "inbox@example.test",
  });
  const delivery = createDelivery(config, () => ({
    sendMail: async () => ({ accepted: ["inbox@example.test"] }),
    close: () => {
      throw new Error("disconnect");
    },
  }));
  assert.equal(
    await delivery(valid, "test-reference", new AbortController().signal),
    "SmtpAccepted",
  );
});
test("real Nodemailer connection closes on cancellation before SMTP greeting", async () => {
  let connected;
  const accepted = new Promise((resolve) => {
    connected = resolve;
  });
  const server = createServer((socket) => {
    socket.on("error", () => {});
    connected(socket);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const config = loadConfig({
    INQUIRY_MODE: "Smtp",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(server.address().port),
    SMTP_USERNAME: "test",
    SMTP_PASSWORD: "synthetic-test-only",
    SMTP_FROM: "sender@example.test",
    SMTP_RECIPIENT: "inbox@example.test",
  });
  const controller = new AbortController();
  try {
    const work = createDelivery(config)(
      valid,
      "test-reference",
      controller.signal,
    );
    const socket = await accepted;
    const closed = new Promise((resolve) => socket.once("close", resolve));
    const start = Date.now();
    controller.abort();
    await closed;
    assert.notEqual(await work, "SmtpAccepted");
    assert.ok(
      Date.now() - start < 1000,
      "cancellation releases SMTP work promptly",
    );
  } finally {
    controller.abort();
    await new Promise((resolve) => server.close(resolve));
  }
});
for (const [failure, expected] of [
  [{ code: "EAUTH" }, "Unavailable"],
  [{ command: "CONN" }, "Unavailable"],
  [{ responseCode: 550 }, "Rejected"],
  [{ code: "ETIMEDOUT", command: "DATA" }, "Unknown"],
  [{ code: "ESOCKET", command: "DATA" }, "Unknown"],
  [null, "SmtpAccepted"],
])
  test(`SMTP transport state ${JSON.stringify(failure)}`, async () => {
    const config = loadConfig({
      INQUIRY_MODE: "Smtp",
      SMTP_HOST: "smtp.example.test",
      SMTP_USERNAME: "test",
      SMTP_PASSWORD: "synthetic-test-only",
      SMTP_FROM: "sender@example.test",
      SMTP_RECIPIENT: "inbox@example.test",
    });
    let options;
    let closed = false;
    const outcome = await createDelivery(config, (opts) => {
      options = opts;
      return {
        sendMail: async () => {
          if (failure) throw failure;
          return { accepted: ["inbox@example.test"] };
        },
        close: () => {
          closed = true;
        },
      };
    })(valid, "test-reference", new AbortController().signal);
    assert.equal(outcome, expected);
    assert.ok(closed);
    assert.ok(options.requireTLS);
    assert.equal(options.debug, false);
    assert.equal(options.tls.rejectUnauthorized, true);
  });
