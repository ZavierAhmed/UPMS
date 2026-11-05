const steps=[
 ['Prepare','Select suitable material and keep it clean. Requirements guide resin and tooling selection.'],
 ['Melt & extrude','An extruder melts plastic pellets. A die forms a hollow tube called a parison.'],
 ['Mould & inflate','A mould closes around the tube. Air expands it against the mould walls to form the hollow article.'],
 ['Cool & finish','The article cools in the mould, is released, and excess material is trimmed.'],
 ['Inspect','Check the finished shape, closure fit and relevant dimensions. Application-specific checks, such as leak testing, should be agreed.'],
];
export default function BlowMoulding(){return <section className="products-section section" aria-labelledby="hdpe-title"><div className="container">
 <p className="eyebrow">GENERAL TECHNICAL OVERVIEW</p><h2 id="hdpe-title">HDPE Blow Moulding</h2>
 <div className="split-content"><div><p>HDPE means high-density polyethylene. Extrusion blow moulding forms hollow plastic articles by inflating a hot plastic tube inside a mould.</p><p>Typical packaging applications include bottles, lubricant containers and jerrycans. Material compatibility, closure design and the intended contents must be assessed for each application.</p></div><div><p>The mould determines the container shape and neck features. Tooling, material and wall distribution must suit the required capacity, handling and closure.</p><p>This is a general process explanation. It does not specify equipment installed at Unique Plastic Industry or confirm the material or process for every catalog product. Ask our team to confirm the proposed manufacturing route.</p></div></div>
 <figure className="blow-process"><figcaption>Process diagram — general extrusion blow moulding sequence, not a factory photograph.</figcaption><ol>{steps.map(([title,text],i)=><li key={title}><span aria-hidden="true">0{i+1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></figure>
 <p className="process-sources">General technical references: <a href="https://www.lyondellbasell.com/globalassets/documents/polymers-technical-literature/a-guide-to-polyolefin-blow-molding.pdf?id=13941" target="_blank" rel="noopener noreferrer">polyolefin blow moulding guide</a> and <a href="https://mueller-ebm.com/en/blow-molding-101/" target="_blank" rel="noopener noreferrer">extrusion process glossary</a>.</p>
 </div></section>;}
