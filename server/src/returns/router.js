import express from 'express';
import {key} from '../business/validation.js';
import {returnService} from './service.js';
export function returnRouter(db){const r=express.Router(),s=returnService(db),command=req=>req.get('Idempotency-Key');
 r.get('/configuration',async(req,res)=>res.json(await s.configuration(req.session)));
 r.post('/configuration/accept',async(req,res)=>res.json(await s.acceptPolicy(req.session,req.body,command(req))));
 r.get('/sources',async(req,res)=>res.json(await s.sources(req.session)));r.get('/documents',async(req,res)=>res.json(await s.list(req.session,req.query)));
 r.get('/reconciliation',async(req,res)=>res.json(await s.reconcile(req.session)));
 r.post('/documents',async(req,res)=>res.status(201).json(await s.save(req.session,req.body,command(req))));
 r.get('/documents/:id',async(req,res)=>res.json(await s.document(req.session,key.parse(req.params.id))));
 r.patch('/documents/:id',async(req,res)=>res.json(await s.save(req.session,req.body,command(req),key.parse(req.params.id))));
 for(const action of ['submit','decide','post'])r.post(`/documents/:id/${action}`,async(req,res)=>res.json(await s[action](req.session,key.parse(req.params.id),req.body,command(req))));return r;
}
