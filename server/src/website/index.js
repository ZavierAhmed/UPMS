import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import express from "express";
export const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#39;");
export function website(config) {
  const router = express.Router({ caseSensitive: true });
  const manifest = JSON.parse(
    readFileSync(resolve(config.root, "public-routes.json"), "utf8"),
  );
  if (
    !manifest.pages?.length ||
    new Set(manifest.pages.map((p) => p.path)).size !== manifest.pages.length
  )
    throw new Error("Invalid public route manifest.");
  function read(file) {
    const target = resolve(config.root, file);
    if (!file.startsWith("_pages/") || !target.startsWith(config.root + sep))
      throw new Error("Invalid public page file.");
    return readFileSync(target, "utf8");
  }
  const documents = new Map(manifest.pages.map((p) => [p.path, read(p.file)]));
  const missing = read(manifest.notFoundFile);
  router.use((req, res, next) => {
    let decoded;
    try {
      decoded = decodeURIComponent(req.path);
    } catch {
      return res.status(400).end();
    }
    if (
      decoded
        .split(/[\\/]/)
        .some((segment) => segment === "." || segment === "..")
    )
      return res.status(404).end();
    if (!(
      /^\/(assets|licenses)(\/|$)/.test(req.path) ||
      ["/icons.svg", "/favicon.svg"].includes(req.path)
    ))
      return next();
    express.static(config.root, {
      dotfiles: "deny",
      index: false,
      redirect: false,
      setHeaders(response) {
        response.setHeader(
          "Cache-Control",
          req.path.startsWith("/assets/")
            ? "public,max-age=31536000,immutable"
            : "public,max-age=3600",
        );
        if (req.path.startsWith("/licenses/"))
          response.setHeader("X-Robots-Tag", "noindex");
      },
    })(req, res, next);
  });
  router.get("/robots.txt", (req, res) => {
    if (req.method !== "GET") return res.status(404).end();
    return res
      .set("Cache-Control", "no-cache")
      .type("text")
      .send(
        config.origin
          ? `User-agent: *\nDisallow: /api/\nDisallow: /management/\nDisallow: /admin/\nSitemap: ${config.origin}/sitemap.xml\n`
          : "User-agent: *\nDisallow: /\n",
      );
  });
  router.get("/sitemap.xml", (req, res) => {
    if (req.method !== "GET") return res.status(404).end();
    res.set("Cache-Control", "no-cache");
    if (!config.origin)
      return res
        .status(503)
        .type("application/problem+json")
        .send({
          type: "https://tools.ietf.org/html/rfc9110#section-15.6.4",
          title: "Service Unavailable",
          status: 503,
          detail: "Set PUBLIC_ORIGIN to the real HTTPS domain before launch.",
        });
    res
      .type("application/xml")
      .send(
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${manifest.pages.map((p) => `<url><loc>${escape(config.origin + p.path)}</loc></url>`).join("")}</urlset>`,
      );
  });
  router.use((req, res) => {
    const path = req.path.length > 1 ? req.path.replace(/\/$/, "") : req.path;
    if (
      /^\/(management|admin|api|assets|licenses|_pages)(\/|$)/i.test(path) ||
      path.includes(".")
    )
      return res.status(404).end();
    const found = documents.has(path);
    if (!["GET", "HEAD"].includes(req.method)) {
      if (found) res.set("Allow", "GET, HEAD");
      return res.status(found ? 405 : 404).end();
    }
    let html = documents.get(path) || missing;
    let links = config.origin
      ? `<meta name="site-origin" content="${escape(config.origin)}" />`
      : '<meta name="site-indexing" content="disabled" />';
    if (found && config.origin)
      links += `<link rel="canonical" href="${escape(config.origin + path)}" /><meta property="og:url" content="${escape(config.origin + path)}" />`;
    html = html.replace("<!--site-url-->", () => links);
    if (!config.origin)
      html = html.replace('content="index,follow"', 'content="noindex,follow"');
    if (!found || !config.origin) res.set("X-Robots-Tag", "noindex, follow");
    res
      .status(found ? 200 : 404)
      .set("Cache-Control", "no-cache")
      .type("html")
      .send(html);
  });
  return router;
}
