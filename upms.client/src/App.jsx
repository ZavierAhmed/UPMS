import { useEffect } from "react";
import { Routes, Route, useLocation, matchPath } from "react-router";
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
import { pageMeta, notFoundMeta } from "./data/pages";
import { products } from "./data/company";
import "./styles/site.css";
import "./styles/pages.css";
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const normalized = pathname.replace(/\/$/, "") || "/";
    const detail = matchPath(
      { path: "/products/:id", caseSensitive: true },
      normalized,
    );
    const product = detail && products.find((p) => p.id === detail.params.id);
    const meta = product
      ? { title: product.title, description: product.text }
      : pageMeta[normalized] || notFoundMeta;
    document.title = `${meta.title} | Unique Plastic Industry`;
    for (const [attr, key, value] of [
      ["name", "description", meta.description],
      ["property", "og:title", document.title],
      ["property", "og:description", meta.description],
      [
        "name",
        "robots",
        meta === notFoundMeta ? "noindex,follow" : "index,follow",
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
    document.querySelectorAll(".reveal").forEach((el) => observer?.observe(el));
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
