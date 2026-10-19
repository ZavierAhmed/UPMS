import Icon from "../components/ui/Icon";
import hero from "../assets/products/hero.jpg";
import machine from "../assets/products/manufacturing.jpg";
import { products, features, industries } from "../data/company";
import Contact from "../components/sections/Contact";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="orange-line" /> BUILT AROUND YOUR BUSINESS
            </p>
            <h1>
              Precision in every product.
              <br />
              <em>Quality in every detail.</em>
            </h1>
            <p className="lead">
              Plastic packaging with a purpose. We manufacture buckets, jars,
              lubricant cans and containers for the demands of your business.
            </p>
            <div className="actions">
              <a className="button" href="#/products">
                Explore Products ↗
              </a>
              <a className="button outline" href="#/contact">
                Request a Quote ↗
              </a>
            </div>
            <div className="hero-note">
              <span>EST. 2018</span>
              <span>
                Manufactured in Karachi.
                <br />
                Made for your next step.
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-top">
              <span>THE UNIQUE STANDARD</span>
              <span>01 / 05</span>
            </div>
            <img
              src={hero}
              width="630"
              height="550"
              alt="Plastic cans and bucket pictured in the Unique Plastic Industry brochure"
              fetchPriority="high"
            />
            <div className="visual-bottom">
              <span>
                Purposeful design.
                <br />
                <strong>Dependable packaging.</strong>
              </span>
              <a href="#/products" aria-label="Explore our packaging">
                ↗
              </a>
            </div>
          </div>
        </div>
        <div className="container hero-bottom">
          <span>PLASTIC PACKAGING & CONTAINER MANUFACTURING</span>
          <span>QUALITY · CUSTOMIZATION · SERVICE</span>
        </div>
      </section>
      <section className="section container about-grid reveal">
        <p className="eyebrow">01 / ABOUT UNIQUE</p>
        <div>
          <h2>
            A practical partner.
            <br />A commitment to quality.
          </h2>
          <div className="about-copy">
            <p>
              Since 2018, Unique Plastic Industry has manufactured plastic
              packaging for industrial and commercial businesses. Based in
              Karachi, we bring together quality manufacturing, thoughtful
              customization and dependable service.
            </p>
            <a className="text-link" href="#/about">
              Get to know us →
            </a>
          </div>
        </div>
      </section>
      <section className="products-section section">
        <div className="container">
          <div className="section-heading reveal">
            <div>
              <p className="eyebrow">02 / OUR PRODUCTS</p>
              <h2>
                The right shape for
                <br />
                your business.
              </h2>
            </div>
            <a className="text-link" href="#/products">
              Explore the range →
            </a>
          </div>
          <div className="product-grid">
            {products.map((p, i) => (
              <a
                className="product-card reveal"
                key={p.id}
                href={`#/products/${p.id}`}
              >
                <div className="product-image">
                  <span className="product-number">0{i + 1}</span>
                  <img
                    src={p.image}
                    alt={`${p.title} shown in the company brochure`}
                    loading="lazy"
                    width="420"
                    height="300"
                  />
                </div>
                <div className="product-title">
                  <h3>{p.title}</h3>
                  <span aria-hidden="true">↗</span>
                </div>
                <p>{p.text}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading reveal">
          <div>
            <p className="eyebrow">03 / THE UNIQUE DIFFERENCE</p>
            <h2>
              More than a container.
              <br />
              Confidence in every order.
            </h2>
          </div>
          <p className="heading-note">
            From the first conversation to continued support, we focus on what
            your business needs.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(([, title, text]) => (
            <article className="feature reveal" key={title}>
              <span className="feature-icon" aria-hidden="true">
                <Icon name={title} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="manufacturing-section section">
        <div className="container manufacturing-grid reveal">
          <div className="machine-visual">
            <span className="eyebrow">ENGINEERED FOR CONSISTENCY</span>
            <img
              src={machine}
              alt="Manufacturing machinery illustrated in the company brochure"
              width="1050"
              height="440"
              loading="lazy"
            />
            <small>Manufacturing imagery from our company brochure.</small>
          </div>
          <div>
            <p className="eyebrow">04 / MANUFACTURING</p>
            <h2>
              Care in the process.
              <br />
              Consistency in the product.
            </h2>
            <p>
              Modern production technology and attention to detail support our
              plastic molding capabilities. We work with your requirements to
              create packaging that fits.
            </p>
            <ul className="process-list">
              <li>
                <span>01</span> Production technology for consistent results
              </li>
              <li>
                <span>02</span> Raw-material inspection and product samples
              </li>
              <li>
                <span>03</span> Design and customization discussions
              </li>
            </ul>
            <a className="text-link" href="#/manufacturing">
              Discover our approach →
            </a>
          </div>
        </div>
      </section>
      <section className="section container industry-section reveal">
        <p className="eyebrow">05 / INDUSTRIES WE SERVE</p>
        <h2>
          Different industries.
          <br />
          One dependable approach.
        </h2>
        <p>
          Packaging for lubricant, chemical and wider commercial applications.
          Let’s discuss the requirements of your product.
        </p>
        <div className="industry-grid">
          {industries.map((name, i) => (
            <a href="#/industries" key={name}>
              <span>0{i + 1}</span>
              <h3>{name} ↗</h3>
            </a>
          ))}
        </div>
      </section>
      <Contact />
    </>
  );
}
