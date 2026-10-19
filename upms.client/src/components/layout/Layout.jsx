import { useState, useEffect, useRef } from "react";
import { Link, NavLink } from "react-router";
import logo from "../../assets/unique_plastic_logos_hd/unique_plastic.svg";
import { navigation, company, products, email } from "../../data/company";
export function Brand() {
  return (
    <Link className="brand" to="/">
      <img src={logo} width="52" height="52" alt="" />
      <span>
        UNIQUE PLASTIC<small>INDUSTRY · KARACHI</small>
      </span>
    </Link>
  );
}
export function Header() {
  const [open, setOpen] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const toggle = useRef(null),
    header = useRef(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 20);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!header.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <header
      ref={header}
      className={`header ${scrolled ? "scrolled" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          toggle.current.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
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
        >
          {navigation.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          <Link
            className="button compact"
            to="/contact"
            onClick={() => setOpen(false)}
          >
            Get a Quote ↗
          </Link>
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
            <Link key={path} to={path}>
              {name}
            </Link>
          ))}
        </div>
        <div>
          <h3>Our products</h3>
          {products.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`}>
              {p.title}
            </Link>
          ))}
        </div>
        <div>
          <h3>Let’s talk</h3>
          <address>{company.address}</address>
          <a href={email}>{company.email}</a>
          {company.phones.map((phone) => (
            <a href={phone.href} key={phone.href}>
              {phone.label}
            </a>
          ))}
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
