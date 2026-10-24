import {IdentityError} from '../identity/passwords.js';
export const fail=(code,status=409)=>{throw new IdentityError(status,code);};
export function integer(value,{signed=false,zero=false}={}){const s=String(value);if(!(signed?/^-?\d{1,15}$/:/^\d{1,15}$/).test(s))fail('INVALID_BOTTLE_QUANTITY',400);const n=BigInt(s);if(!signed&&(zero?n<0n:n<=0n))fail('INVALID_BOTTLE_QUANTITY',400);return n;}
export function cents(value,{signed=false,zero=false}={}){const s=String(value);if(!(signed?/^-?\d{1,13}(?:\.\d{1,2})?$/:/^\d{1,13}(?:\.\d{1,2})?$/).test(s))fail('INVALID_AMOUNT',400);const negative=s.startsWith('-'),[a,b='']=s.replace('-','').split('.'),n=(BigInt(a)*100n+BigInt(b.padEnd(2,'0')))*(negative?-1n:1n);if(!signed&&(zero?n<0n:n<=0n))fail('INVALID_AMOUNT',400);return n;}
export function money(n){const sign=n<0n?'-':'';n=n<0n?-n:n;if(n>9999999999999999n)fail('AMOUNT_OVERFLOW',400);return sign+(n/100n)+'.'+String(n%100n).padStart(2,'0');}
export function dcNumber(sequence){if(!Number.isSafeInteger(sequence)||sequence<1||sequence>10999)fail('DC_ROLLOVER_REQUIRES_OWNER_DECISION');return sequence<=1000?'DC-'+String(sequence).padStart(4,'0'):'DC-A'+String(sequence-1000).padStart(4,'0');}
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

// Synthetic V1 convention: shared immutable document IDs, not gapless payment sequences.
// Prefixes require owner cutover review before use with historical company data.
export function paymentNumber(kind,documentId){const prefix={CLIENT_PAYMENT:'CR',VENDOR_PAYMENT:'VP'}[kind],id=String(documentId);if(!prefix||!/^\d{1,20}$/.test(id)||BigInt(id)<1n||BigInt(id)>18446744073709551615n)fail('INVALID_PAYMENT_IDENTITY');return prefix+'-'+BigInt(id).toString().padStart(4,'0');}
export const validLocalTime=value=>value===''||/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
