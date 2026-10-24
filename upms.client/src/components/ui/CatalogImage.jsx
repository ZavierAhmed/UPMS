import {useEffect,useRef,useState} from 'react';
export const catalogFallback='/assets/catalog-w07-image-unavailable.svg';
export default function CatalogImage({image,priority=false,sizes='(max-width: 650px) 90vw, 480px',...props}){
 const [failed,setFailed]=useState(null),unavailable=failed===image.src;
 const element=useRef(null);
 useEffect(()=>{if(element.current?.complete&&element.current.naturalWidth===0)setFailed(image.src);},[image.src]);
 return <img ref={element} {...props} src={unavailable?catalogFallback:image.src} srcSet={unavailable?undefined:image.srcSet} sizes={image.srcSet?sizes:undefined} width={image.width} height={image.height} alt={unavailable?'Product image unavailable. Contact us for product photographs.':image.alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} decoding="async" onError={()=>setFailed(image.src)}/>;
}
