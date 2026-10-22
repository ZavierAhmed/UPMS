import {z} from 'zod';
import {key} from '../business/validation.js';
const reason=z.string().trim().min(3).max(500),currency=z.string().regex(/^[A-Z]{3}$/),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const chequeMetadata=z.object({number:z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9 /-]*$/),drawerBank:z.string().trim().min(2).max(150),chequeDate:z.string().date(),receivedDate:z.string().date(),expectedBankId:key.nullable()}).strict();
export const transition=z.object({version:z.number().int().positive(),businessDate:z.string().date(),bankId:key,expectedBankVersion:z.number().int().positive(),bankReference:z.string().trim().min(3).max(100),evidenceReference:z.string().trim().min(3).max(200),remarks:z.string().trim().max(500),reason}).strict();
export const dishonourInput=transition.omit({bankId:true,expectedBankVersion:true}).strict();
export const approvalInput=z.object({version:z.number().int().positive(),hash,decision:z.enum(['APPROVED','REJECTED']),reason}).strict();
export const postInput=z.object({version:z.number().int().positive(),hash,reason}).strict();
export const chequePolicy=z.object({scope:z.literal('SYNTHETIC_ONLY'),recognition:z.literal('IMMEDIATE'),custody:z.literal('HOLD_UNTIL_CLEARANCE'),clearance:z.literal('DEPOSIT_REQUIRED'),dishonour:z.literal('ADMINISTRATOR_EXACT_APPROVAL'),currency,cutoff:z.string().date(),periodId:key,prefixes:z.object({DEPOSIT:z.string().regex(/^[A-Z0-9]{1,12}$/),CLEAR:z.string().regex(/^[A-Z0-9]{1,12}$/),DISHONOUR:z.string().regex(/^[A-Z0-9]{1,12}$/)}).strict(),confirm:z.literal(true),reason}).strict().refine(p=>new Set(Object.values(p.prefixes)).size===3);
