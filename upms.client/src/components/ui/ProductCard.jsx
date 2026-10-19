import { Link } from "react-router";
import Icon from "./Icon";
export function ProductVisual({ product, priority = false }) {
  return product.image ? (
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
    </Link>
  );
}
