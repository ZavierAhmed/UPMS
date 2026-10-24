import {useRef,useState} from 'react';
import CatalogImage from './CatalogImage';
import {ProductVisual} from './ProductCard';
export default function ProductGallery({product,images=product.gallery||[]}){
 const [index,setIndex]=useState(0),touch=useRef(null),buttons=useRef([]);
 const move=delta=>select((index+delta+images.length)%images.length);
 function select(next){setIndex(next);buttons.current[next]?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});}
 if(!images.length)return <figure className="detail-visual"><ProductVisual product={product}/><figcaption>Design consultation illustration. Share your packaging brief with our team.</figcaption></figure>;
 const image=images[index];
 return <figure className="detail-visual product-gallery" role="region" aria-roledescription="carousel" aria-label={product.title+' product gallery'} tabIndex={0} onKeyDown={e=>{if(images.length>1&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}}>
  <div className="gallery-stage" onTouchStart={e=>{const t=e.touches[0];touch.current=t?{x:t.clientX,y:t.clientY}:null;}} onTouchEnd={e=>{const start=touch.current,t=e.changedTouches[0];touch.current=null;if(start&&t&&images.length>1){const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.2)move(dx<0?1:-1);}}} onTouchCancel={()=>{touch.current=null;}}><CatalogImage key={image.id} image={image} priority sizes="(max-width: 900px) 90vw, 560px"/></div>
  <div className="gallery-controls"><button type="button" aria-label="Previous product image" disabled={images.length===1} onClick={()=>move(-1)}>← <span>Previous</span></button><span aria-live="polite" aria-atomic="true">{index+1} of {images.length}</span><button type="button" aria-label="Next product image" disabled={images.length===1} onClick={()=>move(1)}><span>Next</span> →</button></div>
  {images.length>1&&<div className="gallery-thumbnails" aria-label="Choose a product image">{images.map((item,i)=><button key={item.id} ref={node=>{buttons.current[i]=node;}} type="button" aria-label={'Show image '+(i+1)+': '+item.alt} aria-pressed={i===index} onClick={()=>select(i)}><img src={item.thumbnail||item.src} alt="" width="160" height="160" loading="lazy"/></button>)}</div>}
  <figcaption>{image.caption}</figcaption>
 </figure>;
}
