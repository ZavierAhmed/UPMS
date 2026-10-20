import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import { company, products } from "../data/company";
import { pageMeta } from "../data/pages";
import { buildWhatsAppLink, defaultWhatsAppMessage } from "../utils/whatsapp";
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const paths = ["/", "/about", "/products", "/manufacturing", "/industries", "/contact", ...products.map(p => `/products/${p.id}`), "/missing"];
describe("company location", () => {
  it("uses the supplied destination and neutral city pending identity confirmation", () => {
    expect(company.address).toBe("Karachi, Pakistan");
    expect(company.map).toBe("https://maps.app.goo.gl/KJGy7zo7cQhsFwsF6");
    const directions = new URL(company.directions);
    expect(directions.origin + directions.pathname).toBe("https://www.google.com/maps/dir/");
    expect(directions.searchParams.get("api")).toBe("1");
    expect(directions.searchParams.get("destination")).toBe("24.9054755,66.9876346");
  });
  it.each(paths)("removes outdated public address and secures location links at %s", path => {
    const { container } = open(path);
    expect(container.textContent).not.toMatch(/F-260|S\.I\.T\.E\.|Z\.A\s*KHAN/i);
    expect(document.querySelector('meta[name="description"]').content).not.toMatch(/F-260|S\.I\.T\.E\./);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByText(company.address)).toBeTruthy();
    const maps = screen.getAllByRole("link").filter(a => /maps\.app\.goo\.gl|google\.com\/maps/.test(a.href));
    expect(maps.length).toBeGreaterThan(0);
    for (const link of maps) {
      expect([company.map, company.directions]).toContain(link.getAttribute("href"));
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
    }
    const whatsapp = screen.getByRole("link", {name: "Contact Unique Plastic Industry on WhatsApp"});
    expect(whatsapp.getAttribute("href")).toBe(buildWhatsAppLink(defaultWhatsAppMessage));
  });
  it("shares the centralized location between Contact and footer", () => {
    open("/contact?category=cans");
    const main = within(screen.getByRole("main"));
    const footer = within(screen.getByRole("contentinfo"));
    expect(main.getByText(company.address).textContent).toBe(footer.getByText(company.address).textContent);
    expect(main.getByRole("link", {name: "Open location in Google Maps ↗"}).getAttribute("href")).toBe(company.map);
    expect(main.getByRole("link", {name: "Get Directions ↗"}).getAttribute("href")).toBe(company.directions);
    expect(footer.getByRole("link", {name: "View Location ↗"}).getAttribute("href")).toBe(company.map);
    expect(pageMeta["/contact"].description).toContain(company.address);
    expect(screen.getByRole("form", {name: "Packaging inquiry"})).toBeTruthy();
    expect(screen.getByRole("combobox", {name: /product category/i}).value).toBe("cans");
  });
});
