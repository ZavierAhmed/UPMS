import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.jsx";
// Keep already-shared W01 hash links usable after the path-routing migration.
const legacyHash = window.location.pathname === "/" && window.location.hash.startsWith("#/");
if (legacyHash) {
  const legacy = new URL(window.location.hash.slice(1), window.location.origin);
  if (legacy.origin === window.location.origin)
    window.history.replaceState(null, "", legacy.pathname + legacy.search);
}
document.documentElement.classList.add("js");
const root = document.getElementById("root");
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
// Query-driven Contact content and legacy hash links need their live URL on mount.
const path = window.location.pathname.replace(/\/$/, "") || "/";
if (root.dataset.prerenderPath === path && !window.location.search && !window.location.hash && !legacyHash) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
