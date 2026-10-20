import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { render, publicPages } from "../.prerender/entry-server.js";

const root = resolve("dist");
const template = await readFile(resolve(root, "index.html"), "utf8");
const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
await mkdir(resolve(root, "_pages"), { recursive: true });
const pages = [];
for (const page of [...publicPages, { path: "/__not-found__" }]) {
  const { markup, meta } = render(page.path);
  const missing = page.path === "/__not-found__";
  const title = `${meta.title} | Unique Plastic Industry`;
  const file = missing ? "_pages/404.html" : `_pages/${page.path === "/" ? "home" : page.path.slice(1).replaceAll("/", "-")}.html`;
  let html = template.replace('<div id="root">', () => `<div id="root" data-prerender-path="${escape(page.path)}">`)
    .replace("<!--prerender-->", () => markup)
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(title)}</title>`);
  for (const [attribute, name, value] of [["name", "description", meta.description], ["property", "og:title", title], ["property", "og:description", meta.description]]) {
    const pattern = new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="[^"]*"\\s*\\/?>`);
    if (!pattern.test(html)) throw new Error(`Missing metadata template: ${name}`);
    html = html.replace(pattern, () => `<meta ${attribute}="${name}" content="${escape(value)}" />`);
  }
  html = html.replace("</head>", `<meta name="robots" content="${missing ? "noindex,follow" : "index,follow"}" /></head>`);
  if ((html.match(/<h1[ >]/g) || []).length !== 1 || html.includes('src="/src/') || html.includes("<!--prerender-->")) throw new Error(`Invalid static page: ${page.path}`);
  await writeFile(resolve(root, file), html);
  if (page.path === "/") await writeFile(resolve(root, "index.html"), html);
  if (!missing) pages.push({ ...page, title, file });
}
if (new Set(pages.map(p => p.path)).size !== pages.length) throw new Error("Duplicate public route");
await writeFile(resolve(root, "public-routes.json"), JSON.stringify({ pages, notFoundFile: "_pages/404.html" }, null, 2));
console.log(`Prerendered ${pages.length} public routes and the 404 page.`);
