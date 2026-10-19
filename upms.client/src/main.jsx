import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.jsx";
// Keep already-shared W01 hash links usable after the path-routing migration.
if (window.location.pathname === "/" && window.location.hash.startsWith("#/")) {
  const legacy = new URL(window.location.hash.slice(1), window.location.origin);
  if (legacy.origin === window.location.origin)
    window.history.replaceState(null, "", legacy.pathname + legacy.search);
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
