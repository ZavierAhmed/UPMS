import { describe, it, expect } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import { company, products } from "../data/company";
function open(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
describe("public routes", () => {
  it.each([
    ["/", "Precision in every product.Quality in every detail."],
    ["/about", "Built on care.Made for business."],
    ["/products", "The right shape.A stronger starting point."],
    ["/manufacturing", "Care in the process.Consistency in the product."],
    ["/industries", "Different industries.One dependable approach."],
    ["/contact", "Let’s talk aboutyour next packaging idea."],
  ])("renders %s with one main heading", (path, title) => {
    open(path);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(title);
  });
  it.each([
    "/missing",
    "/ABOUT",
    "/PRODUCTS/buckets",
    "/products/missing",
    "/products/buckets/extra",
    "/about/extra",
    "/contact/extra",
  ])("shows an honest 404 for %s", (path) => {
    open(path);
    expect(screen.getByText("404 / PAGE NOT FOUND")).toBeTruthy();
    expect(document.title).toBe("Page Not Found | Unique Plastic Industry");
    expect(document.querySelector('meta[name="robots"]').content).toBe(
      "noindex,follow",
    );
  });
  it("navigates from home, updates metadata and focuses main", async () => {
    open();
    fireEvent.click(screen.getByRole("link", { name: "Explore Products ↗" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
        "The right shape.",
      ),
    );
    expect(document.activeElement).toBe(screen.getByRole("main"));
    expect(document.title).toBe(
      "Plastic Packaging Products | Unique Plastic Industry",
    );
    expect(
      document.querySelector('meta[name="description"]').content,
    ).toContain("Explore plastic buckets");
    expect(document.querySelector('meta[property="og:title"]').content).toBe(
      document.title,
    );
  });
  it("makes the skip link focus the main landmark", () => {
    open();
    screen.getByRole("main").scrollIntoView = () => {};
    fireEvent.click(screen.getByText("Skip to content"));
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });
});
describe("catalog and product detail", () => {
  it("renders all five categories with functional detail links", () => {
    open("/products");
    const main = within(screen.getByRole("main"));
    for (const product of products) {
      expect(main.getByRole("heading", { name: product.title })).toBeTruthy();
      expect(
        main
          .getByRole("link", { name: new RegExp(product.title) })
          .getAttribute("href"),
      ).toBe(`/products/${product.id}`);
    }
  });
  it.each(products)(
    "resolves $id and publishes the category title",
    (product) => {
      open(`/products/${product.id}`);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        product.title,
      );
      expect(document.title).toBe(`${product.title} | Unique Plastic Industry`);
      expect(
        screen
          .getByRole("link", { name: `Inquire about ${product.title} ↗` })
          .getAttribute("href"),
      ).toBe(`/contact?category=${product.id}`);
      if (product.id === "buckets") {
        for (const capacity of ["8L", "10L", "16L", "20L"])
          expect(screen.getByText(capacity)).toBeTruthy();
      } else if(product.id === "containers") {
        expect(screen.getByText("20L")).toBeTruthy();
        expect(screen.getByText("30L")).toBeTruthy();
      } else {
        expect(screen.queryByText("20L")).toBeNull();
      }
    },
  );
  it("selects a product from the rendered catalog", () => {
    open("/products");
    fireEvent.click(
      within(screen.getByRole("main")).getByRole("link", {
        name: /Lubricant Cans/,
      }),
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Lubricant Cans",
    );
  });
  it("searches and filters with clear empty-state recovery", () => {
    open("/products");
    fireEvent.change(screen.getByLabelText("Search packaging"), {
      target: { value: "20L" },
    });
    expect(screen.getByRole("status").textContent).toBe("2 categories");
    expect(screen.getByRole("heading",{name:"Plastic Buckets"})).toBeTruthy();
    expect(screen.getByRole("heading",{name:"Industrial Containers"})).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Lubricant Cans" }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText("Packaging type"), {
      target: { value: "Custom solutions" },
    });
    expect(screen.getByRole("status").textContent).toBe("0 categories");
    fireEvent.click(
      screen.getByRole("button", { name: "Clear search and filters" }),
    );
    expect(screen.getByRole("status").textContent).toBe("5 categories");
    expect(screen.getByLabelText("Search packaging").value).toBe("");
  });
  it("restores filters from a shared URL", () => {
    open("/products?group=Custom+solutions");
    expect(screen.getByRole("status").textContent).toBe("1 category");
    expect(
      screen.getByRole("heading", { name: "Custom Packaging" }),
    ).toBeTruthy();
  });
  it("keeps search focus while updating query parameters", () => {
    open("/products");
    const search = screen.getByLabelText("Search packaging");
    search.focus();
    fireEvent.change(search, { target: { value: "bucket" } });
    expect(document.activeElement).toBe(search);
  });
});
describe("navigation controls and contact", () => {
  it("opens/closes the mobile menu and supports Escape focus return", () => {
    open();
    const toggle = screen.getByRole("button", { name: "Menu ☰" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(
      screen.getByRole("navigation", { name: "Main navigation" }),
      { key: "Escape" },
    );
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });
  it("closes navigation after selecting a route and marks the active page", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Menu ☰" }));
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Main navigation" }),
      ).getByRole("link", { name: "Industries We Serve" }),
    );
    expect(
      screen
        .getByRole("button", { name: "Menu ☰" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      within(screen.getByRole("navigation", { name: "Main navigation" }))
        .getByRole("link", { name: "Industries We Serve" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
  it("exposes real contact destinations without a simulated form", () => {
    open("/contact");
    const main = within(screen.getByRole("main"));
    expect(
      main.getByRole("link", { name: "0342-2743901 ↗" }).getAttribute("href"),
    ).toBe("tel:+923422743901");
    expect(
      main
        .getByRole("link", { name: /uniqueplastic56@gmail.com/ })
        .getAttribute("href"),
    ).toMatch(/^mailto:uniqueplastic56@gmail.com/);
    expect(
      main
        .getByRole("link", { name: "Open location in Google Maps ↗" })
        .getAttribute("href"),
    ).toBe(company.map);
    expect(
      screen.getByRole("form", { name: "Packaging inquiry" }),
    ).toBeTruthy();
  });
});
