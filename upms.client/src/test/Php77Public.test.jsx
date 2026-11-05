import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {it,expect} from 'vitest';
import App from '../App';
import {company} from '../data/company';
it('removes the former telephone without changing the retained phone, location or WhatsApp',()=>{render(<MemoryRouter initialEntries={['/contact']}><App/></MemoryRouter>);expect(company.phones).toEqual([{label:'+92 315 2209511',href:'tel:+923152209511',purpose:'Primary phone'},{label:'+92 314 2113472',href:'tel:+923142113472',purpose:'Secondary phone'}]);expect(document.body.textContent).not.toContain('0342-2743901');expect(document.querySelector('a[href="tel:+923422743901"]')).toBeNull();expect(screen.getAllByRole('link',{name:/\+92 314 2113472/}).length).toBeGreaterThan(0);expect(company.address).toContain('F-260/A');expect(company.whatsappNumber).toBe('923142113472');});
