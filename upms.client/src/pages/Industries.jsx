import { Link } from "react-router";
import PageHero from "../components/ui/PageHero";
import Contact from "../components/sections/Contact";
import { industryDetails } from "../data/pages";
import { products } from "../data/company";
import { ProductVisual } from "../components/ui/ProductCard";
export default function Industries() {
  return (
    <>
      <PageHero
        eyebrow="INDUSTRIES WE SERVE"
        title={
          <>
            Different industries.
            <br />
            One dependable approach.
          </>
        }
        description="Packaging conversations for lubricant, chemical, industrial and commercial applications. Start with your product; we’ll explore the possibilities together."
        crumbs={[["Industries We Serve"]]}
      />
      <div className="container industry-stories">
        {industryDetails.map((industry, i) => (
          <section className="section industry-story reveal" key={industry.id}>
            <div>
              <p className="eyebrow">0{i + 1} / APPLICATIONS</p>
              <h2>{industry.title}</h2>
              <h3>{industry.intro}</h3>
              <p>{industry.text}</p>
              <p>{industry.questions}</p>
              <div className="category-links">
                {industry.ids.map((id) => (
                  <Link key={id} to={`/products/${id}`}>
                    {products.find((p) => p.id === id).title} ↗
                  </Link>
                ))}
              </div>
            </div>
            <div className="industry-visual">
              <ProductVisual
                product={products.find((p) => p.id === industry.ids[0])}
              />
            </div>
          </section>
        ))}
      </div>
      <section className="manufacturing-section section">
        <div className="container split-content reveal">
          <h2>
            Your application
            <br />
            deserves a conversation.
          </h2>
          <div>
            <p>
              Packaging suitability depends on the contents and conditions of
              use. Share your requirements so we can discuss formats, samples
              and the next steps.
            </p>
            <Link className="button" to="/contact">
              Discuss your application ↗
            </Link>
          </div>
        </div>
      </section>
      <Contact />
    </>
  );
}
