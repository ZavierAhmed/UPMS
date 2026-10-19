// Run from Codex's browser REPL with a connected tab and viewport capability.
// This uses only the documented CUA browser API; no separate browser driver.
export async function runBrowserSmoke({ tab, viewport, baseURL }) {
  const paths = [
    "/",
    "/about",
    "/products",
    "/manufacturing",
    "/industries",
    "/contact",
    "/products/buckets",
    "/products/cans",
    "/products/jars",
    "/products/containers",
    "/products/custom",
  ];
  const results = [],
    links = new Set();
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await viewport.set({ width, height: 1000 });
    for (const path of paths) {
      await tab.goto(baseURL + path);
      const state = await tab.playwright.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        focusedMain: document.activeElement?.id === "main",
        brokenImages: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.src),
        links: [...document.querySelectorAll("a[href]")].map((a) =>
          a.getAttribute("href"),
        ),
        title: document.title,
      }));
      if (
        state.scrollWidth > state.width ||
        state.h1Count !== 1 ||
        !state.focusedMain ||
        state.brokenImages.length
      )
        throw new Error(
          `Layout/semantic failure ${path} at ${width}: ${JSON.stringify(state)}`,
        );
      state.links
        .filter((h) => h.startsWith("/") && !h.startsWith("//"))
        .forEach((h) => links.add(h.split("?")[0]));
      results.push({
        path,
        width,
        title: state.title,
        overflow: false,
        brokenImages: state.brokenImages.length,
        h1Count: state.h1Count,
        focusedMain: state.focusedMain,
      });
    }
  }
  const unknownLinks = [...links].filter((link) => !paths.includes(link));
  if (unknownLinks.length)
    throw new Error(`Unrecognized internal links: ${unknownLinks.join(", ")}`);
  return { results, internalLinks: [...links], passed: true };
}

export async function runBrowserInteractions({ tab, viewport, baseURL }) {
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  await viewport.set({ width: 390, height: 900 });
  await tab.goto(baseURL + "/");
  await tab.playwright.getByRole("button", { name: "Menu ☰" }).click();
  assert(
    (await tab.playwright
      .getByRole("button", { name: "Close ✕" })
      .getAttribute("aria-expanded")) === "true",
    "Mobile menu opens",
  );
  await tab.playwright.getByRole("button", { name: "Close ✕" }).press("Escape");
  assert(
    (await tab.playwright
      .getByRole("button", { name: "Menu ☰" })
      .getAttribute("aria-expanded")) === "false",
    "Escape closes mobile menu",
  );
  await tab.playwright.getByRole("button", { name: "Menu ☰" }).click();
  await tab.playwright
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Products", exact: true })
    .click();
  assert((await tab.url()).endsWith("/products"), "Menu navigates to catalog");
  assert(
    (await tab.playwright
      .getByRole("button", { name: "Menu ☰" })
      .getAttribute("aria-expanded")) === "false",
    "Menu closes after navigation",
  );
  await tab.playwright.getByLabel("Search packaging").fill("zzzzz");
  assert(
    (await tab.playwright.getByRole("status").innerText()) === "0 categories",
    "Search empty state",
  );
  await tab.playwright
    .getByRole("button", { name: "Clear search and filters" })
    .click();
  assert(
    (await tab.playwright.getByRole("status").innerText()) === "5 categories",
    "Clear filters restores catalog",
  );
  await tab.playwright
    .getByLabel("Packaging type")
    .selectOption("Custom solutions");
  assert(
    (await tab.playwright.getByRole("status").innerText()) === "1 category",
    "Custom packaging filter",
  );
  await tab.playwright.locator('main a[href="/products/custom"]').click();
  await tab.reload();
  assert(
    (await tab.playwright.locator("h1").innerText()) === "Custom Packaging",
    "Direct detail refresh renders selected category",
  );
  await tab.back();
  assert(
    (await tab.playwright.getByRole("status").innerText()) === "1 category",
    "Back restores catalog filter",
  );
  await tab.forward();
  assert(
    (await tab.url()).endsWith("/products/custom"),
    "Forward restores detail route",
  );
  await tab.goto(baseURL + "/not-a-page");
  assert(
    await tab.playwright
      .getByText("404 / PAGE NOT FOUND", { exact: true })
      .isVisible(),
    "Unknown route displays 404",
  );
  await tab.goto(baseURL + "/#/products/cans");
  assert(
    (await tab.playwright.locator("h1").innerText()) === "Lubricant Cans",
    "Shared W01 hash link resolves to path route",
  );
  return { passed: true, checks };
}
