import { Link } from "react-router";
import PageHero from "../components/ui/PageHero";
export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404 / PAGE NOT FOUND"
        title={
          <>
            This page isn’t
            <br />
            in our range.
          </>
        }
        description="The link may have changed, or this page may not exist. Explore our packaging categories or speak with our team."
        crumbs={[["Page not found"]]}
      />
      <section className="section container error-actions">
        <Link className="button" to="/">
          Back to home →
        </Link>
        <Link className="text-link" to="/products">
          Explore products →
        </Link>
        <Link className="text-link" to="/contact">
          Contact our team →
        </Link>
      </section>
    </>
  );
}
