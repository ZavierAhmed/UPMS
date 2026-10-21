import { isIP } from "node:net";
const normalize = (ip) => ip?.replace(/^::ffff:/, "");

// Read one nearest hop only. Never let forwarded host influence routing/origin checks.
export function peerInfo(req, config) {
  let ip = normalize(req.socket.remoteAddress) || "unknown";
  let secure = Boolean(req.socket.encrypted);
  if (config.proxies.some((peer) => normalize(peer) === ip)) {
    const forwarded = req.headers["x-forwarded-for"]?.split(",").at(-1)?.trim();
    const proto = req.headers["x-forwarded-proto"]?.split(",").at(-1)?.trim();
    if (forwarded && isIP(forwarded)) ip = normalize(forwarded);
    if (proto === "https" || proto === "http") secure = proto === "https";
  }
  return { ip, secure };
}
export function security(config) {
  return (req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    if (config.production)
      res.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      );
    const host = req.headers.host || "";
    const hostname = host
      .match(/^(\[[a-f0-9:]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i)?.[1]
      ?.toLowerCase();
    if (!hostname || !config.hosts.includes(hostname))
      return res.status(400).type("text").send("Invalid host.");
    req.peer = peerInfo(req, config);
    if (config.production && req.peer.secure)
      res.set("Strict-Transport-Security", "max-age=15552000");
    if (config.production && !req.peer.secure)
      return res.redirect(
        307,
        `https://${hostname}${req.originalUrl.startsWith("/") ? req.originalUrl : "/"}`,
      );
    next();
  };
}
