import {IdentityError} from '../identity/passwords.js';
import {cents,integer,money} from './exact.js';
export function fieldError(field,message,code='ENTRY_VALIDATION',details){const e=new IdentityError(code==='INSUFFICIENT_STOCK'?409:400,code);e.publicMessage=message;e.fieldErrors={[field]:message};if(details)e.publicDetails=details;throw e;}
export function quantity(value,field,{zero=false,signed=false}={}){try{return integer(value,{zero,signed});}catch{fieldError(field,'Please enter a valid whole-bottle quantity.');}}
export function price(value,field,{zero=false}={}){try{return cents(value,{zero});}catch{fieldError(field,zero?'Enter a valid amount with up to two decimal places.':'Enter a price greater than zero with up to two decimal places.');}}
export function uniqueLines(lines){const seen=new Set();for(const [i,l]of lines.entries()){if(seen.has(String(l.itemId)))fieldError(`lines.${i}.itemId`,'This bottle is already included. Update its quantity in the existing row.','DUPLICATE_BOTTLE');seen.add(String(l.itemId));}}
export function discount(subtotal,mode='NONE',value='0',{allowZero=false}={}){
 const n=price(value,'discountValue',{zero:true});let reduction=0n;
 if(mode==='NONE'){if(n!==0n)fieldError('discountValue','Choose a discount mode before entering a discount.');}
 else if(mode==='FIXED'){if(n>subtotal)fieldError('discountValue','Discount cannot exceed the subtotal.');reduction=n;}
 else if(mode==='PERCENT'){if(n>10000n)fieldError('discountValue','Percentage discount cannot exceed100%.');reduction=(subtotal*n+5000n)/10000n;}
 else fieldError('discountMode','Choose no discount, fixed PKR or percentage.');
 const final=subtotal-reduction;if(!allowZero&&final<=0n)fieldError('discountValue','A zero-total challan cannot be posted. Owner approval is required.','ZERO_TOTAL_BLOCKED');
 return {mode,value:money(n),subtotal:money(subtotal),amount:money(reduction),total:money(final)};
}
