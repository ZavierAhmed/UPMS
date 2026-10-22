import express from 'express';
import { z } from 'zod';
import { key } from '../business/validation.js';
import { inventoryService } from './service.js';
export function inventoryRouter(db){
  const router=express.Router(),service=inventoryService(db);
  router.get('/configuration',async(req,res)=>res.json(await service.configuration(req.session)));
  router.post('/configuration/prepare',async(req,res)=>res.json(await service.prepare(req.session,z.object({reason:z.string()}).strict().parse(req.body),req.get('Idempotency-Key'))));
  router.post('/configuration/accept',async(req,res)=>res.json(await service.accept(req.session,req.body,req.get('Idempotency-Key'))));
  router.post('/items/:id/activate',async(req,res)=>res.json(await service.activate(req.session,key.parse(req.params.id),req.body,req.get('Idempotency-Key'))));
  router.get('/overview',async(req,res)=>res.json({items:await service.overview(req.session,z.string().max(100).parse(req.query.q||'')),limit:100}));
  router.get('/documents',async(req,res)=>res.json({documents:await service.documents(req.session),limit:100}));
  router.get('/documents/:id',async(req,res)=>res.json(await service.document(req.session,key.parse(req.params.id))));
  router.post('/documents',async(req,res)=>res.status(201).json(await service.save(req.session,req.body,req.get('Idempotency-Key'))));
  router.patch('/documents/:id',async(req,res)=>res.json(await service.save(req.session,req.body,req.get('Idempotency-Key'),key.parse(req.params.id))));
  for(const action of ['submit','decide','post'])router.post(`/documents/:id/${action}`,async(req,res)=>res.json(await service[action](req.session,key.parse(req.params.id),req.body,req.get('Idempotency-Key'))));
  router.get('/history',async(req,res)=>{
    const filters=z.object({itemId:key.optional(),type:z.enum(['PRODUCTION','CONSUMPTION','COUNT_ADJUSTMENT','CORRECTION','PURCHASE_RECEIPT','CHALLAN_DISPATCH']).optional(),from:z.string().date().optional(),to:z.string().date().optional(),reference:z.string().max(64).optional()}).strict().parse(req.query);
    res.json({movements:await service.history(req.session,filters),limit:200});
  });
  router.get('/reconciliation',async(req,res)=>res.json(await service.reconcile(req.session)));
  return router;
}
