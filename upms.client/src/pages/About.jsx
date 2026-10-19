import { Link } from "react-router";
import PageHero from "../components/ui/PageHero";
import Contact from "../components/sections/Contact";
import Icon from "../components/ui/Icon";
import { values } from "../data/pages";
import { products } from "../data/company";
import hero from "../assets/products/hero.jpg";
export default function About() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT UNIQUE PLASTIC INDUSTRY"
        title={
          <>
            Built on care.
            <br />
            Made for business.
          </>
        }
        description="A Karachi manufacturer bringing quality, customization and dependable service to plastic packaging since 2018."
        crumbs={[["About Us"]]}
      >
        <div className="year-panel">
          <span>ESTABLISHED</span>
          <strong>2018</strong>
          <p>Karachi, Pakistan</p>
        </div>
      </PageHero>
      <section className="section container split-content reveal">
        <div>
          <p className="eyebrow">OUR STORY</p>
          <h2>
            A practical partner,
            <br />
            from the beginning.
          </h2>
        </div>
        <div>
          <p>
            Unique Plastic Industry was established in 2018 to manufacture
            plastic containers and packaging for industrial and commercial
            needs. Our range includes buckets, lubricant cans, jars and other
            plastic packaging products.
          </p>
          <p>
            Based in S.I.T.E., Karachi, we focus on understanding each
            customer’s requirements and bringing together product quality,
            design discussions and dependable service. Our company brochure
            describes a commitment to innovation and customer satisfaction
            throughout our work.
          </p>
          <Link className="text-link" to="/contact">
            Start a conversation →
          </Link>
        </div>
      </section>
      <section className="products-section section">
        <div className="container split-content reveal">
          <div className="editorial-image">
            <img
              src={hero}
              alt="Cans and a bucket from the Unique Plastic Industry brochure"
              width="630"
              height="550"
              loading="lazy"
            />
            <small>Packaging illustrated in our company brochure.</small>
          </div>
          <div>
            <p className="eyebrow">OUR CAPABILITIES</p>
            <h2>
              Different formats.
              <br />
              The same attention.
            </h2>
            <p>
              From familiar container formats to tailored plastic molding, our
              capabilities support a range of packaging conversations.
            </p>
            <ul className="capability-list">
              {products.map((p) => (
                <li key={p.id}>
                  <Link to={`/products/${p.id}`}>
                    {p.title}
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading reveal">
          <div>
            <p className="eyebrow">WHAT GUIDES US</p>
            <h2>
              Quality. Collaboration.
              <br />
              Continued care.
            </h2>
          </div>
          <p className="heading-note">
            Our values are reflected in the way we approach your product and
            your business.
          </p>
        </div>
        <div className="values-grid">
          {values.map((v, i) => (
            <article className="value-card reveal" key={v.title}>
              <span className="eyebrow">0{i + 1}</span>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="manufacturing-section section">
        <div className="container split-content reveal">
          <div>
            <p className="eyebrow">OUR APPROACH</p>
            <h2>
              A process with your
              <br />
              requirements in mind.
            </h2>
          </div>
          <div>
            <span className="feature-icon">
              <Icon name="Quality Assurance" />
            </span>
            <p>
              Quality begins with raw-material checks and product samples.
              Modern production technology supports consistency, while design
              and customization discussions keep your requirements central.
            </p>
            <p>
              Our service philosophy extends to delivery planning and
              after-sales support, with a focus on building lasting working
              relationships.
            </p>
            <Link className="text-link" to="/manufacturing">
              Explore manufacturing →
            </Link>
          </div>
        </div>
      </section>
      <Contact />
    </>
  );
}
