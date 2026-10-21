import { isIP } from "node:net";
import { resolve } from "node:path";

export function validateOrigin(value) {
  if (!value?.trim()) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PUBLIC_ORIGIN must be a public HTTPS origin.");
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    isIP(url.hostname) ||
    !url.hostname.includes(".") ||
    url.hostname
      .replace(/\.$/, "")
      .split(".")
      .some(
        (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
      ) ||
    /(^|\.)(localhost|local)\.?$/i.test(url.hostname)
  )
    throw new Error(
      "PUBLIC_ORIGIN must be a public HTTPS origin without credentials, path, query or custom port.",
    );
  return url.origin;
}
const list = (value) =>
  (value || "")
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
function integer(value, fallback, min, max) {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed))
    throw new Error("Invalid numeric configuration.");
  return Math.min(max, Math.max(min, parsed));
}
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const origin = validateOrigin(env.PUBLIC_ORIGIN);
  const hosts = list(
    env.ALLOWED_HOSTS || (production ? "" : "localhost;127.0.0.1;[::1]"),
  ).map((h) => h.toLowerCase());
  if (
    !hosts.length ||
    hosts.some(
      (h) => h.includes("*") || !/^(\[[a-f0-9:]+\]|[a-z0-9.-]+)$/.test(h),
    )
  )
    throw new Error("ALLOWED_HOSTS requires explicit hostnames.");
  if (origin && !hosts.includes(new URL(origin).hostname))
    throw new Error("ALLOWED_HOSTS must include PUBLIC_ORIGIN hostname.");
  const proxies = list(env.TRUSTED_PROXY_IPS);
  if (proxies.some((ip) => !isIP(ip)))
    throw new Error("TRUSTED_PROXY_IPS requires exact IP addresses.");
  if (env.TRUST_PROXY === "true" || env.ForwardedHeaders_Enabled === "true")
    throw new Error("Trust-all proxy configuration is forbidden.");
  const inquiryOrigin = env.INQUIRY_PUBLIC_ORIGIN || origin;
  if (inquiryOrigin) {
    const u = new URL(inquiryOrigin);
    if (!["http:", "https:"].includes(u.protocol) || u.origin !== inquiryOrigin)
      throw new Error("Invalid INQUIRY_PUBLIC_ORIGIN.");
  }
  return {
    production,
    development: (env.NODE_ENV || "development") === "development",
    origin,
    hosts,
    proxies,
    inquiryOrigin,
    root: resolve(env.WEBSITE_ROOT || "upms.client/dist"),
    mode: env.INQUIRY_MODE || "Disabled",
    timeoutMs: integer(env.INQUIRY_TIMEOUT_SECONDS, 15, 1, 30) * 1000,
    rateLimit: integer(env.INQUIRY_RATE_LIMIT, 5, 1, 100),
    outbox: resolve("server/.local/inquiry-outbox"),
    smtp: {
      host: env.SMTP_HOST || "",
      port: integer(env.SMTP_PORT, 587, 1, 65535),
      tlsMode: env.SMTP_TLS_MODE || "StartTls",
      user: env.SMTP_USERNAME || "",
      pass: env.SMTP_PASSWORD || "",
      from: env.SMTP_FROM || "",
      recipient: env.SMTP_RECIPIENT || "",
    },
  };
}
