import express from 'express';import {key} from '../business/validation.js';import {salesService} from './service.js';
export function salesRouter(db){const router=express.Router(),service=salesService(db),command=req=>req.get('Idempotency-Key');
 router.get('/configuration',async(req,res)=>res.json(await service.configuration(req.session)));
 router.post('/configuration/classification',async(req,res)=>res.json(await service.acceptClassificationPolicy(req.session,req.body,command(req))));
 router.post('/configuration/prepare',async(req,res)=>res.json(await service.prepare(req.session,req.body,command(req))));
 router.post('/configuration/accept',async(req,res)=>res.json(await service.acceptPolicy(req.session,req.body,command(req))));
 router.post('/customers/:id/activate',async(req,res)=>res.json(await service.activateCustomer(req.session,key.parse(req.params.id),req.body,command(req))));
 for(const [path,method]of [['documents','list'],['items','items'],['customers','customers']])router.get('/'+path,async(req,res)=>res.json(await service[method](req.session,req.query)));
 router.get('/customers/:id/ledger',async(req,res)=>res.json(await service.ledger(req.session,key.parse(req.params.id),req.query)));
 router.get('/documents/:id',async(req,res)=>res.json(await service.document(req.session,key.parse(req.params.id))));
 router.post('/documents',async(req,res)=>res.status(201).json(await service.save(req.session,req.body,command(req))));
 router.patch('/documents/:id',async(req,res)=>res.json(await service.save(req.session,req.body,command(req),key.parse(req.params.id))));
 for(const method of ['submit','decide','post'])router.post(`/documents/:id/${method}`,async(req,res)=>res.json(await service[method](req.session,key.parse(req.params.id),req.body,command(req))));
 router.get('/reconciliation',async(req,res)=>res.json(await service.reconcile(req.session)));return router;
}
