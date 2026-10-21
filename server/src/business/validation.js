import { z } from 'zod';
import { categories,resources } from './catalog.js';
export const key=z.string().regex(/^[1-9][0-9]{0,18}$/);
export const code=z.string().trim().min(1).max(64).transform(s=>s.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]*$/));
const name=z.string().trim().min(1).max(150).transform(s=>s.replace(/\s+/g,' '));
const optional=(length)=>z.string().trim().max(length).nullable().optional().transform(v=>v||null);
export function masterInput(resource){
  const kind=resources[resource]?.kind;
  const fields={code,name,active:z.boolean(),reason:z.string().trim().min(3).max(500),version:z.number().int().positive().optional()};
  if(kind==='category')fields.code=z.enum(categories);
  if(kind==='unit')fields.scale=z.number().int().min(0).max(6);
  if(kind==='item'){
    fields.category_code=z.enum(categories);fields.unit_id=key;
    for(const field of ['bottle_type_id','size_id','quality_id','colour_id'])fields[field]=key.nullable().optional().transform(v=>v||null);
  }
  if(kind==='party')Object.assign(fields,{contact_name:optional(150),email:z.union([z.string().email().max(254),z.literal(''),z.null()]).optional().transform(v=>v||null),phone:optional(64),address:optional(1000),remarks:optional(1000)});
  if(kind==='money')Object.assign(fields,{account_type:z.enum(['CASH','BANK','CASH_HOLDER','CHEQUE_HOLDING','CHEQUE_CLEARING']),bank_name:optional(150),account_reference:optional(150),holder:optional(150),remarks:optional(1000)});
  if(kind==='documentType')Object.assign(fields,{prefix:z.string().trim().max(12).regex(/^[A-Z0-9]*$/).nullable(),prefix_approved:z.boolean()});
  return z.object(fields).strict();
}
export function validateQuantity(value,scale){
  if(!Number.isInteger(scale)||scale<0||scale>6||typeof value!=='string'||!/^\d+(?:\.\d+)?$/.test(value))throw new Error('INVALID_QUANTITY');
  const [whole,fraction='']=value.split('.');
  if(whole.length>14||fraction.length>scale)throw new Error('INVALID_UNIT_PRECISION');
  return value; // Exact string, never float or implicit rounding/conversion.
}
export const periodInput=z.object({name,start_date:z.string().date(),end_date:z.string().date(),status:z.enum(['OPEN','CLOSED']),version:z.number().int().positive().optional(),reason:z.string().trim().min(3).max(500)}).strict().refine(v=>v.start_date<=v.end_date);
export const policyInput=z.object({proposed_cutoff:z.string().date().nullable(),reason:z.string().trim().min(3).max(500)}).strict();
