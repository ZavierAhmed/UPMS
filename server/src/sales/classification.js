import {z} from 'zod';
import {parseExact,formatExact,totalAmounts} from '../purchases/amounts.js';
import {IdentityError} from '../identity/passwords.js';
export const ledgerType=z.enum(['GST','NON_GST']);
export const classificationPolicy=z.object({scope:z.literal('SYNTHETIC_ONLY'),gstTreatment:z.literal('MANUAL_ADDITION'),numbering:z.literal('SHARED_CHALLAN_SEQUENCE'),zeroGstPosting:z.literal(false),confirm:z.literal(true),reason:z.string().trim().min(3).max(500)}).strict();
export function classifiedAmounts(base,ledger,gst){ledgerType.parse(ledger);const amount=parseExact(gst);if(ledger==='NON_GST'&&amount!==0n)throw new IdentityError(400,'NON_GST_AMOUNT_FORBIDDEN');return {baseSubtotal:base,gstAmount:formatExact(amount),total:totalAmounts([base,gst])};}
export async function syntheticDatabase(trx){const [rows]=await trx.raw('SELECT DATABASE() name');if(!/(?:^upms_test_p(?:25a|26a|26b)_(?:sales|classification|regression|inventory|purchasing|receipts|cheques)_20261022_0[1-8]$|^upms_test_p27a_(?:returns|cheques|receipts|sales|classification|inventory|purchasing|regression)_20261023_0[1-8]$)/.test(rows[0].name))throw new IdentityError(409,'REAL_GST_ACTIVATION_PENDING');}
// P2.6 shape only. No posting, offsets or payment side effects.
export const futureAllocation=z.object({customerId:z.string().regex(/^[1-9]\d*$/),ledgerType,challanId:z.string().regex(/^[1-9]\d*$/),outstanding:z.string(),allocationAmount:z.string(),paymentReference:z.string().trim().min(1).max(100)}).strict().superRefine((v,ctx)=>{try{if(parseExact(v.allocationAmount,2,{positive:true})>parseExact(v.outstanding))ctx.addIssue({code:'custom',message:'Allocation exceeds outstanding'});}catch{ctx.addIssue({code:'custom',message:'Invalid exact allocation'});}});
