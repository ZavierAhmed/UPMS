import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {it,expect,vi} from 'vitest';
import ProductCard from '../components/ui/ProductCard';
import {products} from '../data/company';
import {publicPage,publicPages} from '../data/publicRoutes';
import {notFoundMeta} from '../data/pages';

it('uses exactly four approved categories and preserves the containers URL',()=>{
 expect(products.map(p=>p.title)).toEqual(['Plastic Buckets','Lubricant Cans','Plastic Cans','Custom Packaging']);
 expect(publicPage('/products/jars')).toBe(notFoundMeta);
 expect(publicPages.some(p=>p.path==='/products/jars')).toBe(false);
 expect(publicPage('/products/containers').title).toBe('Plastic Cans');
 for(const p of products.filter(p=>p.hoverImage))expect(p.hoverImage.categoryId).toBe(p.catalogImage.categoryId);
 expect(products[2].catalogImage.id).toBe('jerrycan-20l');
 expect(products[2].hoverImage.id).toBe('jerrycan-30l');
});
it('prepares one same-category secondary image only on fine-pointer intent',()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})));
 const {container}=render(<MemoryRouter><ProductCard product={products[0]}/></MemoryRouter>);
 expect(container.querySelector('.product-secondary')).toBeNull();
 fireEvent.pointerEnter(screen.getByRole('link'));
 const image=container.querySelector('.product-secondary');
 expect(image.getAttribute('src')).toBe(products[0].hoverImage.src);
 expect(container.querySelectorAll('.product-secondary')).toHaveLength(1);
 expect(screen.getByRole('link').textContent).toContain('View Details');
});
it('keeps the primary image for coarse pointers and an explicit custom illustration',()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false})));
 const {container,rerender}=render(<MemoryRouter><ProductCard product={products[1]}/></MemoryRouter>);
 fireEvent.pointerEnter(screen.getByRole('link'));
 expect(container.querySelector('.product-secondary')).toBeNull();
 rerender(<MemoryRouter><ProductCard product={products[3]}/></MemoryRouter>);
 expect(screen.getAllByText(/Concept illustration/).length).toBeGreaterThan(0);
 expect(container.querySelector('img')).toBeNull();
});
