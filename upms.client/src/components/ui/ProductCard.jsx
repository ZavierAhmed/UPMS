import CatalogImage from "./CatalogImage";
import { Link } from "react-router";
import Icon from "./Icon";
export function ProductVisual({ product, priority = false }) {
  return product.catalogImage ? <CatalogImage image={product.catalogImage} priority={priority} sizes="(max-width: 650px) 90vw, (max-width: 1000px) 45vw, 400px"/> : product.image ? (
    <img
      src={product.image}
      alt={product.alt}
      loading={priority ? "eager" : "lazy"}
      width="630"
      height="420"
    />
  ) : (
    <div className="custom-visual">
      <Icon name="Custom Packaging Solutions" />
      <span>
        YOUR IDEA.
        <br />
        YOUR PACKAGING.
      </span>
      <small>Design consultation · Concept illustration</small>
    </div>
  );
}
export default function ProductCard({ product, index = 0 }) {
  return (
    <Link className="product-card reveal" to={`/products/${product.id}`}>
      <div className="product-image">
        <span className="product-number">0{index + 1}</span>
        <ProductVisual product={product} />
      </div>
      <div className="product-title">
        <h3>{product.title}</h3>
        <span aria-hidden="true">↗</span>
      </div>
      <p>{product.text}</p>
      {product.capacities.length>0&&<div className="product-capacities">Catalog sizes: {product.capacities.join(" · ")}</div>}
      <span className="product-details-link">View Details →</span>
    </Link>
  );
}
