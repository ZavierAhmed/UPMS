import {expect,it} from 'vitest';
import {chequeReferencePreview} from '../../management/src/chequeReference.js';

it('normalizes leading zeros, punctuation and decimal amounts without floating point',()=>{
 expect(chequeReferencePreview('00021222312312222','  Client / A  ','00050000.0')).toBe('21222312312222-CLIENT-A-50000-00');
});
it('reserves space for the authoritative 128-bit suffix without truncating the amount',()=>{
 const reference=chequeReferencePreview('9'.repeat(30),'LONG CLIENT NAME '.repeat(8),'9999999999999.99');
 expect(reference.length+33).toBeLessThanOrEqual(100);
 expect(reference.endsWith('-9999999999999-99')).toBe(true);
});
it('uses the same non-ASCII fallback as the PHP server',()=>{
 expect(chequeReferencePreview('12','علی','10.05')).toBe('12-CLIENT-10-05');
});
it('does not preview an incomplete or invalid number and amount',()=>{
 expect(chequeReferencePreview('000','Client','12')).toBe('');
 expect(chequeReferencePreview('12','Client','12.345')).toBe('');
});
