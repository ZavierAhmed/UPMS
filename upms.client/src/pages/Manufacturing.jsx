import { Link } from "react-router";
import PageHero from "../components/ui/PageHero";
import Contact from "../components/sections/Contact";
import { process } from "../data/pages";
import machine from "../assets/products/manufacturing.jpg";
export default function Manufacturing() {
  return (
    <>
      <PageHero
        eyebrow="OUR MANUFACTURING APPROACH"
        title={
          <>
            Care in the process.
            <br />
            Consistency in the product.
          </>
        }
        description="Plastic molding supported by production technology, raw-material checks and conversations that keep your requirements in focus."
        crumbs={[["Manufacturing"]]}
      />
      <section className="section container split-content reveal">
        <div className="editorial-image">
          <img
            src={machine}
            width="1050"
            height="440"
            alt="Plastic manufacturing machinery illustrated in the company brochure"
            loading="lazy"
          />
          <small>
            Machinery illustration from the company brochure; not a factory
            photograph.
          </small>
        </div>
        <div>
          <p className="eyebrow">FROM IDEA TO CONTAINER</p>
          <h2>
            Built around your
            <br />
            packaging brief.
          </h2>
          <p>
            Our brochure describes modern machinery and production technology
            for plastic packaging, with an emphasis on product consistency and
            attention to detail.
          </p>
          <p>
            We manufacture buckets, lubricant cans, plastic cans and containers, and
            discuss customized plastic molding for individual requirements. The
            right starting point depends on your product and application.
          </p>
          <Link className="text-link" to="/products">
            Explore packaging categories →
          </Link>
        </div>
      </section>
      <section className="products-section section">
        <div className="container">
          <div className="section-heading reveal">
            <div>
              <p className="eyebrow">A CONNECTED APPROACH</p>
              <h2>Considered at every stage.</h2>
            </div>
            <p className="heading-note">
              Talk to our team about the checks and samples appropriate to your
              particular application.
            </p>
          </div>
          <div className="process-grid">
            {process.map((step, i) => (
              <article className="value-card reveal" key={step.title}>
                <span className="eyebrow">0{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container split-content reveal">
        <div>
          <p className="eyebrow">CUSTOMIZATION</p>
          <h2>
            Your ideas are
            <br />
            part of the process.
          </h2>
        </div>
        <div>
          <p>
            Share a reference, drawing or description of your packaging needs.
            We’ll discuss design, sizing, quantity and sampling before the
            project moves ahead.
          </p>
          <p>
            Our approach is collaborative: understand the requirements, explore
            the options and agree on practical next steps.
          </p>
          <Link className="button" to="/contact">
            Discuss your packaging brief ↗
          </Link>
        </div>
      </section>
      <Contact />
    </>
  );
}
