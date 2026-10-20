import { products } from "./company";
import { pageMeta, notFoundMeta } from "./pages";

// Register public pages here (and their App route); the build exports this list
// to ASP.NET, HTTP tests and the runtime sitemap. Never register management pages.
export const publicPages = [
  ...Object.entries(pageMeta).map(([path, meta]) => ({ path, ...meta })),
  ...products.map(product => ({ path: `/products/${product.id}`, title: product.title, description: product.text })),
];
export function publicPage(pathname) {
  const path = pathname.replace(/\/$/, "") || "/";
  return publicPages.find(page => page.path === path) || notFoundMeta;
}
