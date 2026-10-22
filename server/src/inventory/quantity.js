import { IdentityError } from '../identity/passwords.js';
export const factor=1000000n,maxQuantity=99999999999999999999n;
export function exact(value,scale=6,{signed=false,positive=false}={}){
  if(typeof value!=='string'||!Number.isInteger(scale)||scale<0||scale>6||!(signed?/^-?\d{1,14}(?:\.\d{1,6})?$/:/^\d{1,14}(?:\.\d{1,6})?$/).test(value))throw new IdentityError(400,'INVALID_QUANTITY');
  const negative=value.startsWith('-'),[whole,fraction='']=value.replace('-','').split('.');
  if(fraction.length>scale)throw new IdentityError(400,'INVALID_UNIT_PRECISION');
  let result=BigInt(whole)*factor+BigInt(fraction.padEnd(6,'0'));if(negative)result=-result;
  if(result>maxQuantity||result< -maxQuantity)throw new IdentityError(400,'QUANTITY_OVERFLOW');
  if(positive&&result<=0n)throw new IdentityError(400,'POSITIVE_QUANTITY_REQUIRED');
  return result;
}
export function decimal(value){if(value>maxQuantity||value< -maxQuantity)throw new IdentityError(400,'QUANTITY_OVERFLOW');const abs=value<0n?-value:value;return `${value<0n?'-':''}${abs/factor}.${String(abs%factor).padStart(6,'0')}`;}
