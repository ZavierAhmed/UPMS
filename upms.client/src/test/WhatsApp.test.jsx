import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import { company, products } from "../data/company";
import { buildWhatsAppLink, defaultWhatsAppMessage, productWhatsAppMessage } from "../utils/whatsapp";
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const label = "Contact Unique Plastic Industry on WhatsApp";
describe("WhatsApp contact", () => {
  it("adds the configured contact method without replacing phone or email", () => {
    open("/contact");
    const link = screen.getByRole("link", { name: "+923142113472 ↗" });
    expect(link.getAttribute("href")).toBe(buildWhatsAppLink(defaultWhatsAppMessage));
    expect(screen.getByRole("link", { name: "0314-2113472 ↗" }).getAttribute("href")).toBe("tel:+923142113472");
    expect(screen.getByRole("link", { name: "uniqueplastic56@gmail.com ↗" }).getAttribute("href")).toContain("mailto:");
  });
  it("uses the approved canonical number and optional encoded draft", () => {
    expect(company.whatsappNumber).toBe("923142113472");
    expect(buildWhatsAppLink()).toBe("https://wa.me/923142113472");
    const message = "Sizes & pricing? 10L / 20L + details\nThank you!";
    expect(buildWhatsAppLink(message)).toBe(`https://wa.me/923142113472?text=${encodeURIComponent(message)}`);
    expect(new URL(buildWhatsAppLink(message)).searchParams.get("text")).toBe(message);
  });
  it.each(["/", "/about", "/products", "/manufacturing", "/industries", "/contact", ...products.map(p => `/products/${p.id}`), "/missing"])("shows one accessible secure floating action at %s", path => {
    open(path);
    const links = screen.getAllByRole("link", { name: label });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe(buildWhatsAppLink(defaultWhatsAppMessage));
    expect(links[0].target).toBe("_blank");
    expect(links[0].rel).toBe("noopener noreferrer");
    expect(links[0].querySelector("svg").getAttribute("aria-hidden")).toBe("true");
  });
  it.each(products)("uses $title and preserves inquiry preselection", product => {
    open(`/products/${product.id}`);
    const link = screen.getByRole("link", { name: "Contact on WhatsApp" });
    const message = new URL(link.href).searchParams.get("text");
    expect(message).toBe(`Hello Unique Plastic Industry, I am interested in your ${product.title}. Please share details about available sizes, minimum order quantity and pricing.`);
    expect(message).toBe(productWhatsAppMessage(product.title));
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    const inquiry = screen.getByRole("link", { name: `Inquire about ${product.title} ↗` });
    expect(inquiry.getAttribute("href")).toBe(`/contact?category=${product.id}`);
    fireEvent.click(inquiry);
    expect(screen.getByRole("combobox", { name: /product category/i }).value).toBe(product.id);
  });
});
