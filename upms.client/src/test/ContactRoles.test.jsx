import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {it,expect} from 'vitest';
import App from '../App';
import {company,products} from '../data/company';
import {buildWhatsAppLink,productWhatsAppMessage} from '../utils/whatsapp';

it('keeps calling and WhatsApp destinations independent on public pages',()=>{
 render(<MemoryRouter initialEntries={['/contact']}><App/></MemoryRouter>);
 expect(company.phones[0]).toMatchObject({label:'+92 315 2209511',href:'tel:+923152209511'});
 expect(company.phones[1]).toMatchObject({label:'+92 314 2113472',href:'tel:+923142113472'});
 expect(screen.getAllByRole('link',{name:/Primary phone/}).every(a=>a.getAttribute('href')==='tel:+923152209511')).toBe(true);
 expect(screen.getByRole('link',{name:'Call our team'}).getAttribute('href')).toBe('tel:+923152209511');
 const whatsApp=[...document.querySelectorAll('a[href*="wa.me/"]')];
 expect(whatsApp.length).toBeGreaterThan(0);
 expect(whatsApp.every(a=>new URL(a.href).pathname==='/923142113472')).toBe(true);
 expect(buildWhatsAppLink()).toBe('https://wa.me/923142113472');
 for(const product of products)expect(new URL(buildWhatsAppLink(productWhatsAppMessage(product.title))).pathname).toBe('/923142113472');
 expect(document.body.textContent).not.toMatch(/Z\.?A\.? Khan|Unique Lubricants/i);
});
