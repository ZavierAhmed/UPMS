import CatalogImage from "./CatalogImage";
import { useState } from "react";
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
    <div className="custom-visual" aria-hidden="true">
      <Icon name="Custom Packaging Solutions" />
    </div>
  );
}
export default function ProductCard({ product, index = 0 }) {
  const [prepared, setPrepared] = useState(false);
  const [ready, setReady] = useState(false);
  function prepare(event) {
    if (event.pointerType !== 'touch' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setPrepared(true);
  }
  return (
    <Link className={`product-card reveal${ready ? ' hover-ready' : ''}`} to={`/products/${product.id}`} onPointerEnter={prepare} onFocus={prepare}>
      <span className="product-number">0{index + 1}</span>
      <div className="product-card-copy">
      <div className="product-title">
        <h3>{product.title}</h3>
      </div>
      <p>{product.text}</p>
      {product.capacities.length>0&&<div className="product-capacities">Catalog sizes: {product.capacities.join(" · ")}</div>}
      {!product.capacities.length&&<div className="product-capacities">Design consultation · Concept illustration</div>}
      <span className="product-details-link">View Details <span aria-hidden="true">→</span><span className="product-arrow" aria-hidden="true">↗</span></span>
      </div>
      <div className="product-image">
        <span className="product-decoration" aria-hidden="true"/>
        <div className="product-primary"><ProductVisual product={product} /></div>
        {prepared&&product.hoverImage&&<CatalogImage className="product-secondary" image={{...product.hoverImage,alt:''}} aria-hidden="true" priority sizes="(max-width: 1000px) 200px, 320px" onLoad={e=>setReady(!e.currentTarget.currentSrc.endsWith('.svg'))}/>}
      </div>
    </Link>
  );
}
