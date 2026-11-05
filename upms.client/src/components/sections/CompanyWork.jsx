import {Link} from 'react-router';
export default function CompanyWork(){
 return <section className="section container company-work" aria-labelledby="work-title">
  <p className="eyebrow">OUR WORK, CLEARLY DEFINED</p><h2 id="work-title">Manufacturing and packaging support.</h2>
  <div className="work-grid">
   <article><p className="eyebrow">PLASTIC MANUFACTURING</p><h3>Containers for your product.</h3><p>Unique Plastic Industry manufactures plastic buckets, lubricant packaging cans, and plastic cans and containers. The catalog shows container designs and capacities; current availability and suitability require confirmation.</p><ul>{[['buckets','Plastic Buckets'],['cans','Lubricant Cans'],['containers','Plastic Cans']].map(([id,title])=><li key={id}><Link to={'/products/'+id}>{title} →</Link></li>)}</ul></article>
   <article><p className="eyebrow">PACKAGING SUPPORT</p><h3>Labels and outer packaging.</h3><p>Discuss sticker, label and carton requirements with our team. Supply or coordination arrangements, artwork, dimensions, materials and finishes are confirmed against your brief. In-house sticker or carton manufacture is not confirmed.</p><ul><li><Link to="/products/stickers">Stickers and labels →</Link></li><li><Link to="/products/cartons">Cartons →</Link></li></ul></article>
   <article><p className="eyebrow">CUSTOM REQUIREMENTS</p><h3>Start with the application.</h3><p>Share the contents, capacity, quantity, drawing or reference, closure needs and delivery destination. Design, mould/tooling, sampling and quotation requirements depend on the selected product.</p><Link className="text-link" to="/contact">Discuss your requirements →</Link></article>
  </div>
 </section>;
}
