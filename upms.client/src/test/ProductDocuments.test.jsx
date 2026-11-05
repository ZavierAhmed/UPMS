import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {it,expect} from 'vitest';
import App from '../App';
import {products,company} from '../data/company';
import documents from '../data/productDocuments.json';
import ownerImages from '../data/ownerProductImages.json';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
it.each(products)('offers a valid approved PDF for $title',p=>{
 render(<MemoryRouter initialEntries={['/products/'+p.id]}><App/></MemoryRouter>);
 const a=screen.getByRole('link',{name:/Download Product PDF/}),doc=documents.documents[p.id];
 expect(a.getAttribute('href')).toBe(doc.url);expect(a.getAttribute('download')).toBe(doc.filename);
 const bytes=readFileSync(new URL('../../public'+doc.url,import.meta.url));
 expect(bytes.subarray(0,5).toString()).toBe('%PDF-');expect(bytes.length).toBe(doc.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(doc.sha256);
 expect(screen.getByRole('link',{name:/Contact on WhatsApp/}).getAttribute('href')).toContain('https://wa.me/923142113472?text=');
 expect(screen.getAllByRole('link',{name:company.phones[0].label}).length).toBeGreaterThan(0);
});
it('uses approved representative images with explicit brand separation, without invented specifications',()=>{
 for(const [category,images] of Object.entries(ownerImages)){
  expect(products.find(p=>p.id===category).capacities).toEqual([]);
  for(const img of images){expect(img.categoryId).toBe(category);expect(img.caption).toMatch(/representative/i);expect(img.approval).toMatch(/Owner explicitly authorized/);expect(img.originalWidth).toBeGreaterThanOrEqual(img.width);for(const v of img.variants)expect(existsSync(new URL('../../public'+v.src,import.meta.url))).toBe(true);}
 }
 expect(ownerImages.stickers.every(i=>i.caption.includes('not a Unique Plastic Industry brand'))).toBe(true);
});
it('separates general blow moulding information and packaging support from company equipment claims',()=>{
 render(<MemoryRouter initialEntries={['/manufacturing']}><App/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'HDPE Blow Moulding'})).toBeTruthy();
 expect(screen.getByText(/does not specify equipment installed/)).toBeTruthy();
 expect(screen.getByText(/In-house sticker or carton manufacture is not confirmed/)).toBeTruthy();
 expect(screen.getByText(/Process diagram/)).toBeTruthy();
});
