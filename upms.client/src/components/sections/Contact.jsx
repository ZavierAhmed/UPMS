import { Link } from "react-router";
import { company, email } from "../../data/company";
export default function Contact({ page = false }) {
  const Heading = page ? "h1" : "h2";
  return (
    <section className="contact-section">
      <div className="container contact-grid">
        <div>
          <p className="eyebrow">YOUR NEXT IDEA STARTS HERE</p>
          <Heading>
            Let’s build your next
            <br />
            packaging solution.
          </Heading>
          <p>
            Tell us what you have in mind. We’ll help you explore the
            possibilities.
          </p>
          <Link className="button dark-button" to="/contact">
            Request a quote ↗
          </Link>
        </div>
        <div className="contact-details">
          <span>CONTACT OUR TEAM</span>
          {company.phones.map(phone=><a key={phone.href} href={phone.href}>{phone.label} ↗</a>)}
          <a className="email" href={email}>
            {company.email}
          </a>
          <address>{company.address}</address>
          <a href={company.map} target="_blank" rel="noopener noreferrer">
            View Location ↗
          </a>
          <Link className="text-link" to="/products">
            Explore our products →
          </Link>
        </div>
      </div>
    </section>
  );
}
