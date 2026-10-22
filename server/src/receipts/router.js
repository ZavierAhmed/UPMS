import express from 'express';
import {key} from '../business/validation.js';
import {receiptService} from './service.js';
export function receiptRouter(db){const r=express.Router(),s=receiptService(db),command=req=>req.get('Idempotency-Key');
 r.get('/configuration',async(req,res)=>res.json(await s.configuration(req.session)));
 for(const action of ['prepare','accept'])r.post(`/configuration/${action}`,async(req,res)=>res.json(await s[action==='accept'?'acceptPolicy':'prepare'](req.session,req.body,command(req))));
 r.get('/documents',async(req,res)=>res.json(await s.list(req.session,req.query)));r.get('/accounts',async(req,res)=>res.json({records:await s.accounts(req.session)}));
 r.post('/documents',async(req,res)=>res.status(201).json(await s.save(req.session,req.body,command(req))));r.get('/documents/:id',async(req,res)=>res.json(await s.document(req.session,key.parse(req.params.id))));r.patch('/documents/:id',async(req,res)=>res.json(await s.save(req.session,req.body,command(req),key.parse(req.params.id))));
 for(const action of ['submit','decide','post'])r.post(`/documents/:id/${action}`,async(req,res)=>res.json(await s[action](req.session,key.parse(req.params.id),req.body,command(req))));
 for(const action of ['outstanding','unapplied','position'])r.get(`/customers/:id/${action}`,async(req,res)=>res.json(await s[action](req.session,key.parse(req.params.id),req.query)));
 r.get('/reconciliation',async(req,res)=>res.json(await s.reconcile(req.session)));return r;
}
