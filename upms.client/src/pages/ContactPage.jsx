import { Link, useSearchParams } from "react-router";
import { company, email, products, productInquiry } from "../data/company";
import PageHero from "../components/ui/PageHero";
export default function ContactPage() {
  const [params] = useSearchParams();
  const product = products.find((p) => p.id === params.get("category"));
  return (
    <>
      <PageHero
        eyebrow="CONTACT UNIQUE PLASTIC INDUSTRY"
        title={
          <>
            Let’s talk about
            <br />
            your next packaging idea.
          </>
        }
        description="Tell us what you’re packaging, what you need and where you want to go next. Our Karachi team is ready to discuss the possibilities."
        crumbs={[["Contact"]]}
      />
      <section className="section container contact-page-grid">
        <div>
          <p className="eyebrow">REACH OUR TEAM</p>
          <h2>
            A direct conversation.
            <br />A practical next step.
          </h2>
          <div className="contact-method">
            <h3>Call us</h3>
            {company.phones.map((phone) => (
              <a href={phone.href} key={phone.href}>
                {phone.label} ↗
              </a>
            ))}
          </div>
          <div className="contact-method">
            <h3>Email your inquiry</h3>
            <a href={product ? productInquiry(product.title) : email}>
              {company.email} ↗
            </a>
            <p>
              {product
                ? `Inquiry topic: ${product.title}`
                : "Include your product category and requirements to help us understand your inquiry."}
            </p>
          </div>
          <div className="contact-method">
            <h3>Find us in Karachi</h3>
            <address>{company.address}</address>
            <a
              className="text-link"
              href={company.map}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open address in Google Maps ↗
            </a>
            <p className="small-note">
              Searches the business address. Please call to confirm directions
              before visiting.
            </p>
          </div>
        </div>
        <aside className="inquiry-panel">
          <p className="eyebrow">A USEFUL STARTING POINT</p>
          <h2>
            What to include
            <br />
            in your inquiry.
          </h2>
          <p>
            A brief message is enough to start. Share any of the following
            details you have:
          </p>
          <ol>
            <li>Product or packaging category</li>
            <li>Intended contents and application</li>
            <li>Required size or design reference</li>
            <li>Approximate order quantity</li>
            <li>Delivery location and preferred timing</li>
          </ol>
          <a
            className="button dark-button"
            href={product ? productInquiry(product.title) : email}
          >
            Write an email inquiry ↗
          </a>
          <p className="small-note">
            Opens your email application. If one isn’t configured, copy the
            email address above into your preferred mail service.
          </p>
          <Link className="text-link" to="/products">
            Still exploring? View our range →
          </Link>
        </aside>
      </section>
    </>
  );
}
