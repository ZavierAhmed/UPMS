import express from 'express';
import {key} from '../business/validation.js';
import {chequeService} from './service.js';
export function chequeRouter(db){const r=express.Router(),s=chequeService(db),command=req=>req.get('Idempotency-Key');
 r.get('/configuration',async(req,res)=>res.json(await s.configuration(req.session)));
 r.post('/configuration/accept',async(req,res)=>res.json(await s.acceptPolicy(req.session,req.body,command(req))));
 r.get('/',async(req,res)=>res.json(await s.list(req.session,req.query)));
 r.get('/accounts',async(req,res)=>res.json({records:await s.accounts(req.session)}));
 r.get('/reconciliation',async(req,res)=>res.json(await s.reconcile(req.session)));
 r.get('/:id',async(req,res)=>res.json(await s.detail(req.session,key.parse(req.params.id))));
 for(const action of ['deposit','clear','requestDishonour','decide','postDishonour'])r.post(`/:id/${action}`,async(req,res)=>res.json(await s[action](req.session,key.parse(req.params.id),req.body,command(req))));
 return r;
}
