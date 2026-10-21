import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/index.js";
export const valid = {
  customerName: "Test Buyer",
  companyName: "Example Test Company",
  email: "buyer@example.test",
  phone: "+92 300 1234567",
  productCategory: "buckets",
  message: "Automated packaging inquiry for local testing only.",
  quantity: "500",
  capacity: "20L",
};
export function fixture({ env = {}, delivery, ...options } = {}) {
  const config = loadConfig({
    NODE_ENV: "testing",
    INQUIRY_RATE_LIMIT: "100",
    ...env,
  });
  const calls = [];
  const logs = [];
  const app = createApp({
    config,
    delivery:
      delivery ||
      (async (...args) => {
        calls.push(args);
        return "DevelopmentSaved";
      }),
    log: (event) => logs.push(event),
    ...options,
  });
  const api = request(app);
  const send = (
    body = valid,
    key = randomUUID(),
    path = "/api/v1/public/inquiries",
  ) =>
    api
      .post(path)
      .set("Host", "localhost")
      .set("Idempotency-Key", key)
      .send(body);
  return { api, send, calls, logs, app, config };
}
