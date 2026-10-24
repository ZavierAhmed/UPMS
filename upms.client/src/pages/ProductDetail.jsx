import WhatsAppIcon from "../components/ui/WhatsAppIcon";
import { buildWhatsAppLink, productWhatsAppMessage } from "../utils/whatsapp";
import { Link, useParams } from "react-router";
import { products } from "../data/company";
import PageHero from "../components/ui/PageHero";
import ProductCard from "../components/ui/ProductCard";
import ProductGallery from "../components/ui/ProductGallery";
import Contact from "../components/sections/Contact";
import NotFound from "./NotFound";
export default function ProductDetail() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  if (!product) return <NotFound />;
  return (
    <>
      <PageHero
        eyebrow="PACKAGING, WITH PURPOSE"
        title={product.title}
        description={product.text}
        crumbs={[["Products", "/products"], [product.title]]}
      />
      <section className="section container detail-grid">
        <ProductGallery key={product.id} product={product}/>
        <div className="detail-copy">
          <p className="eyebrow">THE CATEGORY</p>
          <h2>
            Packaging around
            <br />
            your requirements.
          </h2>
          <p>{product.description}</p>
          <dl className="spec-list">
            <div>
              <dt>Applications to discuss</dt>
              <dd>{product.uses.join(" · ")}</dd>
            </div>
            <div>
              <dt>
                {product.capacities.length
                  ? "Brochure capacities"
                  : "Sizing & specifications"}
              </dt>
              <dd>
                {product.capacities.length > 0 && (
                  <div className="capacity-tags">
                    {product.capacities.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                )}
                {product.capacityNote}
              </dd>
            </div>
          </dl>
          <div className="product-contact-actions">
            <Link className="button" to={`/contact?category=${product.id}`}>
              Inquire about {product.title} ↗
            </Link>
            <a
              className="button whatsapp-secondary"
              href={buildWhatsAppLink(productWhatsAppMessage(product.title))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon /> Contact on WhatsApp
            </a>
          </div>
        </div>
      </section>
      <section className="products-section section">
        <div className="container split-content reveal">
          <div>
            <p className="eyebrow">START WITH YOUR BRIEF</p>
            <h2>
              A little detail helps
              <br />
              us help you.
            </h2>
            <p>
              Send the information you have. We’ll discuss the next steps
              directly.
            </p>
          </div>
          <ul className="brief-list">
            {product.discussion.map((item, i) => (
              <li key={item}>
                <span>0{i + 1}</span>
                {item}
              </li>
            ))}
            <li>
              <Link
                to={`/contact?category=${product.id}`}
                className="text-link"
              >
                Contact our team →
              </Link>
            </li>
          </ul>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KEEP EXPLORING</p>
            <h2>Other packaging possibilities.</h2>
          </div>
          <Link to="/products" className="text-link">
            All categories →
          </Link>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => p.id !== id)
            .slice(0, 3)
            .map((p) => (
              <ProductCard key={p.id} product={p} index={products.indexOf(p)} />
            ))}
        </div>
      </section>
      <Contact />
    </>
  );
}
