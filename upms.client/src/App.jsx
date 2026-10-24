import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import { Header, Footer } from "./components/layout/Layout";
import WhatsAppFloatingButton from "./components/ui/WhatsAppFloatingButton";
import Home from "./pages/Home";
import About from "./pages/About";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Manufacturing from "./pages/Manufacturing";
import Industries from "./pages/Industries";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";
import { notFoundMeta } from "./data/pages";
import { publicPage } from "./data/publicRoutes";
import "./styles/site.css";
import "./styles/pages.css";
import "./styles/polish.css";
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = publicPage(pathname);
    document.title = `${meta.title} | Unique Plastic Industry`;
    for (const [attr, key, value] of [
      ["name", "description", meta.description],
      ["property", "og:title", document.title],
      ["property", "og:description", meta.description],
      [
        "name",
        "robots",
        meta === notFoundMeta || document.querySelector('meta[name="site-indexing"]')?.content === "disabled"
          ? "noindex,follow" : "index,follow",
      ],
    ]) {
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.append(tag);
      }
      tag.setAttribute("content", value);
    }
    const origin = document.querySelector('meta[name="site-origin"]')?.content;
    for (const [selector, tagName, attributes] of [
      ['link[rel="canonical"]', "link", { rel: "canonical", href: `${origin}${meta.path || "/"}` }],
      ['meta[property="og:url"]', "meta", { property: "og:url", content: `${origin}${meta.path || "/"}` }],
    ]) {
      let tag = document.head.querySelector(selector);
      if (!origin || meta === notFoundMeta) { tag?.remove(); continue; }
      if (!tag) { tag = document.createElement(tagName); document.head.append(tag); }
      Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.getElementById("main")?.focus({ preventScroll: true });
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) =>
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  e.target.classList.add("visible");
                  observer.unobserve(e.target);
                }
              }),
            { threshold: 0.08 },
          );
    document.querySelectorAll(".reveal, .section-heading, .page-hero h1").forEach((el) => {
      el.classList.add('reveal');
      observer?.observe(el);
    });
    return () => observer?.disconnect();
  }, [pathname]);
  return null;
}
export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main").focus();
          document.getElementById("main").scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <Header key={pathname} />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route caseSensitive path="/" element={<Home />} />
          <Route caseSensitive path="/about" element={<About />} />
          <Route caseSensitive path="/products" element={<Products />} />
          <Route
            caseSensitive
            path="/products/:id"
            element={<ProductDetail />}
          />
          <Route
            caseSensitive
            path="/manufacturing"
            element={<Manufacturing />}
          />
          <Route caseSensitive path="/industries" element={<Industries />} />
          <Route caseSensitive path="/contact" element={<ContactPage />} />
          <Route caseSensitive path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppFloatingButton />
      <RouteEffects />
    </>
  );
}
