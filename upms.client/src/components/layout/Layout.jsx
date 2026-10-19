import { useState, useEffect, useRef } from "react";
import logo from "../../assets/unique_plastic_logos_hd/unique_plastic.svg";
import { navigation, company, products, email } from "../../data/company";
export function Brand() {
  return (
    <a className="brand" href="#/" aria-label="Unique Plastic Industry home">
      <img src={logo} width="52" height="52" alt="" />
      <span>
        UNIQUE PLASTIC<small>INDUSTRY · KARACHI</small>
      </span>
    </a>
  );
}
export function Header({ route }) {
  const [open, setOpen] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const toggle = useRef(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 20);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  return (
    <header
      className={`header ${scrolled ? "scrolled" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          toggle.current.focus();
        }
      }}
    >
      <div className="container header-inner">
        <Brand />
        <button
          ref={toggle}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close ✕" : "Menu ☰"}
        </button>
        <nav
          id="navigation"
          aria-label="Main navigation"
          className={`nav ${open ? "open" : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              toggle.current.focus();
            }
          }}
        >
          {navigation.map(([label, path]) => (
            <a
              key={path}
              href={`#${path}`}
              aria-current={route === path ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
          <a
            className="button compact"
            href="#/contact"
            onClick={() => setOpen(false)}
          >
            Get a Quote ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>
            Plastic packaging, thoughtfully made.
            <br />
            Serving businesses since 2018.
          </p>
        </div>
        <div>
          <h3>Discover</h3>
          {navigation.slice(1).map(([name, path]) => (
            <a key={path} href={`#${path}`}>
              {name}
            </a>
          ))}
        </div>
        <div>
          <h3>Our products</h3>
          {products.map((p) => (
            <a key={p.id} href={`#/products/${p.id}`}>
              {p.title}
            </a>
          ))}
        </div>
        <div>
          <h3>Let’s talk</h3>
          <address>{company.address}</address>
          <a href={email}>{company.email}</a>
          <a href="tel:+923422743901">0342-2743901</a>
          <a href="tel:+923142113472">0314-2113472</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Unique Plastic Industry. All rights
          reserved.
        </span>
        <span>Made for lasting partnerships.</span>
      </div>
    </footer>
  );
}
