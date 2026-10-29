import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import App from "../App";
import { publicPages } from "../data/publicRoutes";
import InquiryForm from "../components/inquiries/InquiryForm";

afterEach(() => {
  document.querySelectorAll('meta[name="site-origin"], meta[name="site-indexing"], link[rel="canonical"], meta[property="og:url"]').forEach(tag => tag.remove());
});
function configure(name, content) {
  const tag = document.createElement("meta"); tag.name = name; tag.content = content; document.head.append(tag);
}
describe("prerender activation and SPA SEO", () => {
  it("updates canonical and social URLs during navigation without query strings", () => {
    configure("site-origin", "https://www.example.test");
    render(<MemoryRouter initialEntries={["/products/buckets"]}><App /></MemoryRouter>);
    expect(document.querySelector('link[rel="canonical"]').href).toBe("https://www.example.test/products/buckets");
    fireEvent.click(screen.getByRole("link", { name: "Inquire about Plastic Buckets ↗" }));
    expect(document.querySelector('link[rel="canonical"]').href).toBe("https://www.example.test/contact");
    expect(document.querySelector('meta[property="og:url"]').content).toBe("https://www.example.test/contact");
    expect(screen.getByRole("combobox", { name: /product category/i }).value).toBe("buckets");
  });
  it("keeps unconfigured production pages non-indexable after activation", () => {
    configure("site-indexing", "disabled");
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(document.querySelector('meta[name="robots"]').content).toBe("noindex,follow");
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
  it("prerenders no-JavaScript inquiry controls disabled and uses POST", () => {
    const html = renderToString(<InquiryForm />);
    expect(html).toContain('method="post"');
    expect(html).toContain('<fieldset disabled=""');
    expect(html).toContain('action="/api/v1/public/inquiries"');
  });
  it("registers exactly the eleven supported public paths", () => {
    expect(new Set(publicPages.map(page => page.path)).size).toBe(11);
    expect(publicPages.filter(page => page.path.startsWith("/products/")).length).toBe(5);
    expect(publicPages.some(page => page.path.startsWith("/management"))).toBe(false);
  });
});
