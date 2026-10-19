import { Link } from "react-router";
export default function PageHero({
  eyebrow,
  title,
  description,
  children,
  crumbs = [],
}) {
  return (
    <section className="page-hero">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {crumbs.map(([label, path]) => (
            <span key={label}>
              <span aria-hidden="true">/</span>
              {path ? (
                <Link to={path}>{label}</Link>
              ) : (
                <span aria-current="page">{label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lead">{description}</p>
          </div>
          {children && <div className="page-hero-aside">{children}</div>}
        </div>
      </div>
    </section>
  );
}
