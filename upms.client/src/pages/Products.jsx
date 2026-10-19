import { useSearchParams } from "react-router";
import PageHero from "../components/ui/PageHero";
import ProductCard from "../components/ui/ProductCard";
import Contact from "../components/sections/Contact";
import { products } from "../data/company";
export default function Products() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "",
    group = params.get("group") || "all";
  const filtered = products.filter(
    (p) =>
      (group === "all" || p.group === group) &&
      `${p.title} ${p.text} ${p.uses.join(" ")} ${p.capacities.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function update(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  return (
    <>
      <PageHero
        eyebrow="OUR PRODUCT RANGE"
        title={
          <>
            The right shape.
            <br />A stronger starting point.
          </>
        }
        description="Explore our plastic packaging categories, then talk to our team about the format, quantity and design your application needs."
        crumbs={[["Products"]]}
      >
        <div className="hero-caption">
          <span className="eyebrow">FIVE CATEGORIES. ONE CONVERSATION.</span>
          <p>
            Standard formats and tailored ideas, brought together around your
            packaging brief.
          </p>
        </div>
      </PageHero>
      <section className="section container catalog-section">
        <div className="catalog-controls">
          <div>
            <label htmlFor="product-search">Search packaging</label>
            <input
              id="product-search"
              type="search"
              value={query}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Try buckets, lubricant or 20L"
            />
          </div>
          <div>
            <label htmlFor="product-filter">Packaging type</label>
            <select
              id="product-filter"
              value={group}
              onChange={(e) => update("group", e.target.value)}
            >
              <option value="all">All categories</option>
              <option value="Containers">Containers</option>
              <option value="Custom solutions">Custom solutions</option>
            </select>
          </div>
          <p role="status" aria-live="polite">
            {filtered.length}{" "}
            {filtered.length === 1 ? "category" : "categories"}
          </p>
        </div>
        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} index={products.indexOf(p)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">NO MATCHES</p>
            <h2>Let’s try another direction.</h2>
            <p>
              No categories match these filters. Try a broader term, or clear
              your search to explore the full range.
            </p>
            <button
              className="button"
              onClick={() => setParams({}, { replace: true })}
            >
              Clear search and filters
            </button>
          </div>
        )}
        <aside className="catalog-note">
          <h2>A starting point for your inquiry.</h2>
          <p>
            Bucket capacities shown here come from our company brochure.
            Availability, design details and suitability for your contents
            should be confirmed with our team. Other categories are presented
            without unverified specifications or prices.
          </p>
        </aside>
      </section>
      <Contact />
    </>
  );
}
