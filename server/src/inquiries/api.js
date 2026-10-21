import { randomUUID } from "node:crypto";
import { normalize, validate } from "./validation.js";
export const endpoint = "/api/v1/public/inquiries";
export function error(res, status, code, message, errors = null) {
  return res
    .status(status)
    .json({ code, message, correlationId: res.locals.correlationId, errors });
}
const tooLarge = (res) =>
  error(
    res,
    413,
    "request_too_large",
    "Your inquiry is too large. Please shorten the message.",
  );
const invalidJson = (res) =>
  error(
    res,
    400,
    "invalid_json",
    "The inquiry could not be read. Please check the form and try again.",
  );
function depth(value, level = 0) {
  if (value && typeof value === "object") {
    if (level >= 8) throw new Error("depth");
    for (const v of Object.values(value)) depth(v, level + 1);
  }
}
export function inquiryApi(config, submit, now = Date.now) {
  const windows = new Map();
  return async (req, res, next) => {
    if (!/^\/api(?:\/|$)/i.test(req.path)) return next();
    res.locals.correlationId = randomUUID().replaceAll("-", "");
    res.set({
      "X-Correlation-ID": res.locals.correlationId,
      "Cache-Control": "no-store",
    });
    if (
      req.path.replace(/\/$/, "").toLowerCase() !== endpoint ||
      req.method !== "POST"
    )
      return error(
        res,
        404,
        "not_found",
        "This API endpoint is not available.",
      );
    try {
      const expected =
        config.inquiryOrigin ||
        `${req.peer.secure ? "https" : "http"}://${req.headers.host}`;
      let allowed = true;
      if (req.headers.origin) {
        try {
          allowed =
            new URL(req.headers.origin).origin === new URL(expected).origin;
        } catch {
          allowed = false;
        }
      }
      if (!allowed || req.headers["sec-fetch-site"] === "cross-site")
        return error(
          res,
          403,
          "origin_not_allowed",
          "This request must be sent from our website.",
        );
      if (
        req.headers["content-type"]?.split(";")[0].trim() !==
          "application/json" ||
        req.headers["content-encoding"] !== undefined
      )
        return error(
          res,
          415,
          "unsupported_content",
          "Send the inquiry as JSON without content encoding.",
        );
      if (Number(req.headers["content-length"]) > 16384) return tooLarge(res);
      const time = now();
      for (const [ip, window] of windows)
        if (window.expires <= time) windows.delete(ip);
      const current = windows.get(req.peer.ip) || {
        count: 0,
        expires: time + 600000,
      };
      // Bound memory; fail closed when a new client cannot be tracked.
      if (
        (!windows.has(req.peer.ip) && windows.size >= 10000) ||
        current.count >= config.rateLimit
      ) {
        res.set(
          "Retry-After",
          String(Math.max(1, Math.ceil((current.expires - time) / 1000))),
        );
        return error(
          res,
          429,
          "rate_limited",
          "Too many attempts. Please wait before trying again, or contact us by phone or email.",
        );
      }
      current.count++;
      windows.set(req.peer.ip, current);
      const key = req.headers["idempotency-key"];
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          key || "",
        ) ||
        /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(key)
      )
        return error(
          res,
          400,
          "invalid_idempotency_key",
          "A valid request key is required. Reload the page and try again.",
        );
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16384) return tooLarge(res);
        chunks.push(chunk);
      }
      let request;
      try {
        const raw = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            Buffer.concat(chunks),
          ),
        );
        depth(raw);
        if (raw === null)
          return error(res, 400, "invalid_json", "An inquiry is required.");
        request = normalize(raw);
      } catch {
        return invalidJson(res);
      }
      if (request.website)
        return error(
          res,
          400,
          "invalid_submission",
          "This inquiry could not be accepted. Please contact us directly.",
        );
      const errors = validate(request);
      if (Object.keys(errors).length)
        return error(
          res,
          400,
          "validation_failed",
          "Please check the highlighted fields.",
          errors,
        );
      const result = submit(key.toLowerCase(), request);
      if (result.error)
        return error(
          res,
          result.error === "busy" ? 503 : 409,
          result.error,
          result.error === "busy"
            ? "Our inquiry service is busy. Please contact us directly or try later."
            : "This request key was used for different details. Please contact us if delivery is uncertain.",
        );
      const { reference, outcome } = await result.work;
      const success =
        outcome === "SmtpAccepted"
          ? [
              "smtp_accepted",
              "Your inquiry was accepted by our mail server for delivery to our team. Inbox receipt is not yet confirmed.",
            ]
          : outcome === "DevelopmentSaved"
            ? [
                "development_saved",
                "Development only: your inquiry was saved to the local outbox. No email was sent.",
              ]
            : null;
      if (success)
        return res.json({
          status: success[0],
          message: success[1],
          reference,
          correlationId: res.locals.correlationId,
        });
      if (outcome === "Unavailable")
        return error(
          res,
          503,
          "delivery_unavailable",
          "Online inquiries are currently unavailable. Your inquiry has not been sent. Please call or email us.",
        );
      if (outcome === "Rejected")
        return error(
          res,
          502,
          "delivery_rejected",
          "The mail service did not accept your inquiry. Please call or email us, or try again later.",
        );
      return error(
        res,
        503,
        "delivery_unknown",
        `Delivery could not be confirmed. Please contact us by phone or email with reference ${reference} before submitting again.`,
      );
    } catch {
      return error(
        res,
        500,
        "request_failed",
        "We could not process the request. Please contact us by phone or email.",
      );
    }
  };
}
