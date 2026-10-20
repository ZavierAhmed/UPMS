import { buildWhatsAppLink, defaultWhatsAppMessage } from "../utils/whatsapp";
import InquiryForm from "../components/inquiries/InquiryForm";
import { useSearchParams } from "react-router";
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
            <h3>WhatsApp</h3>
            <a
              href={buildWhatsAppLink(defaultWhatsAppMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              +{company.whatsappNumber} ↗
            </a>
            <p>Opens WhatsApp with a draft for you to review and send.</p>
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
            <h3>Company location</h3>
            <address>{company.address}</address>
            <a
              className="text-link"
              href={company.map}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open location in Google Maps ↗
            </a>
            <p>
              <a
                className="text-link"
                href={company.directions}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions ↗
              </a>
            </p>
            <p className="small-note">
              Please call to confirm directions before visiting.
            </p>
          </div>
        </div>
        <InquiryForm initialCategory={product?.id || ""} />
      </section>
    </>
  );
}
