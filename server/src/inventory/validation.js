import { z } from 'zod';
import { key } from '../business/validation.js';
import { conditions,kinds } from './catalog.js';
const quantity=z.string().regex(/^\d{1,14}(?:\.\d{1,6})?$/);
export const reason=z.string().trim().min(3).max(500);
export const documentInput=z.object({kind:z.enum(kinds),businessDate:z.string().date(),reference:z.string().trim().max(150).default(''),remarks:z.string().trim().max(1000).default(''),reason,
  originalDocumentId:key.nullable().default(null),version:z.number().int().positive().optional(),lines:z.array(z.object({itemId:key,quantity,condition:z.enum(conditions).default('AVAILABLE'),originalMovementId:key.nullable().default(null)}).strict()).min(1).max(50)}).strict();
export const versionInput=z.object({version:z.number().int().positive(),reason}).strict();
export const decisionInput=versionInput.extend({decision:z.enum(['APPROVED','REJECTED'])}).strict();
export const activationInput=z.object({mode:z.literal('NEW_ITEM_ZERO'),attestNoHistoricalStock:z.literal(true),reason,version:z.number().int().positive()}).strict();
export const acceptanceInput=z.object({proposalId:key,periodId:key,prefixes:z.object({PRODUCTION:z.string().regex(/^[A-Z0-9]{1,12}$/),CONSUMPTION:z.string().regex(/^[A-Z0-9]{1,12}$/),COUNT:z.string().regex(/^[A-Z0-9]{1,12}$/),CORRECTION:z.string().regex(/^[A-Z0-9]{1,12}$/)}).strict(),confirm:z.literal(true),reason}).strict();
