import { IdentityError } from '../identity/passwords.js';
export const moneyMaximum=99999999999999999999n;
export function parseExact(value,scale=2,{signed=false,positive=false,whole=18}={}){
  if(typeof value!=='string'||!(signed?/^-?\d+(?:\.\d+)?$/:/^\d+(?:\.\d+)?$/).test(value))throw new IdentityError(400,'INVALID_MONEY');
  const negative=value.startsWith('-'),[integer,fraction='']=value.replace(/^-/,'').split('.');
  if(integer.length>whole||fraction.length>scale)throw new IdentityError(400,'INVALID_MONEY_PRECISION');
  const amount=BigInt(integer)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,'0'));
  if(amount>moneyMaximum)throw new IdentityError(400,'MONEY_OVERFLOW');
  if(positive&&amount===0n)throw new IdentityError(400,'POSITIVE_MONEY_REQUIRED');
  return negative?-amount:amount;
}
export function formatExact(value,scale=2){const n=value<0n?-value:value,base=10n**BigInt(scale);return `${value<0n?'-':''}${n/base}.${(n%base).toString().padStart(scale,'0')}`;}
export function lineAmount(quantity,rate){const q=parseExact(quantity,6,{positive:true,whole:14}),r=parseExact(rate,6,{positive:true,whole:12}),product=q*r;const result=(product+5000000000n)/10000000000n;if(result<=0n)throw new IdentityError(400,'ZERO_ROUNDED_LINE_UNSUPPORTED');if(result>moneyMaximum)throw new IdentityError(400,'MONEY_OVERFLOW');return formatExact(result);}
export function totalAmounts(values){const sum=values.reduce((a,b)=>a+parseExact(b),0n);if(sum>moneyMaximum)throw new IdentityError(400,'MONEY_OVERFLOW');return formatExact(sum);}
