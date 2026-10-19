import { useEffect, useState } from "react";
import { Header, Footer } from "./components/layout/Layout";
import Home from "./pages/Home";
import Contact from "./components/sections/Contact";
import { products } from "./data/company";
import "./styles/site.css";
const pages = {
  about: [
    "About Unique",
    "Plastic packaging manufacturing in Karachi since 2018. Our full company story is coming in a future website milestone.",
  ],
  products: [
    "Our product range",
    "Explore our packaging categories. A detailed catalog is planned; contact our team for current options.",
  ],
  manufacturing: [
    "Our manufacturing approach",
    "Our brochure describes modern production, raw-material inspection, product samples and customized plastic molding. A closer look at our process is coming soon.",
  ],
  industries: [
    "Industries & partnerships",
    "We support lubricant, chemical and commercial packaging needs. An approved client showcase is planned for a future milestone.",
  ],
  contact: [
    "Let’s talk packaging",
    "Speak with our team about your requirements.",
  ],
};
function Preview({ route }) {
  const [, page, id] = route.split("/"),
    product = products.find((p) => p.id === id);
  const info =
    page === "products" && product
      ? [product.title, product.text]
      : !id
        ? pages[page]
        : null;
  return (
    <>
      {page !== "contact" && (
        <section className="section container preview">
          <a className="text-link" href="#/">
            ← Back to home
          </a>
          <p className="eyebrow">
            {info
              ? "WEBSITE PREVIEW · MORE DETAILS COMING SOON"
              : "404 · PAGE NOT FOUND"}
          </p>
          <h1>{info?.[0] || "This page isn’t available."}</h1>
          <p className="lead">
            {info?.[1] ||
              "Return to the homepage to explore Unique Plastic Industry."}
          </p>
          {product && (
            <img
              className="preview-image"
              src={product.image}
              alt={`${product.title} from the company brochure`}
              width="500"
              height="350"
            />
          )}
          {page === "products" && !id && (
            <div className="product-grid">
              {products.map((p) => (
                <a
                  className="product-card"
                  href={`#/products/${p.id}`}
                  key={p.id}
                >
                  <img src={p.image} alt={p.title} width="420" height="300" />
                  <h2>{p.title} ↗</h2>
                  <p>{p.text}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      )}
      <Contact page={page === "contact"} />
    </>
  );
}
export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const navigate = () => {
      setRoute(window.location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    document.title =
      route === "/"
        ? "Unique Plastic Industry | Plastic Packaging Manufacturer in Karachi"
        : `${pages[route.split("/")[1]]?.[0] || "Page not found"} | Unique Plastic Industry`;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    document.getElementById("main")?.focus({ preventScroll: true });
    return () => observer.disconnect();
  }, [route]);
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
      <Header route={route} />
      <main id="main" tabIndex={-1}>
        {route === "/" ? <Home /> : <Preview route={route} />}
      </main>
      <Footer />
    </>
  );
}
