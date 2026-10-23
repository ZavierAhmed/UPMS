import express from 'express';
import { createIdentityService } from '../identity/service.js';
import { query } from '../identity/database.js';
import { IdentityError } from '../identity/passwords.js';
import { masterService } from './masters.js';
import { key,periodInput,policyInput } from './validation.js';
import { coordinate,businessAudit } from './transactions.js';
export function businessRouter(db){
  const router=express.Router(),masters=masterService(db),identity=createIdentityService(db);
  router.get('/resources',async(req,res)=>res.json({resources:await masters.manifest(req.session)}));
  router.get('/masters/:resource',async(req,res)=>{
    const search=String(req.query.q||'').trim();if(search.length>100)throw new IdentityError(400,'INVALID_INPUT');
    res.json({records:await masters.list(req.session,req.params.resource,search),limit:100});
  });
  router.get('/masters/:resource/:key',async(req,res)=>res.json({record:await masters.detail(req.session,req.params.resource,key.parse(req.params.key))}));
  router.post('/masters/:resource',async(req,res)=>res.status(201).json(await masters.save(req.session,req.params.resource,null,req.body,req.get('Idempotency-Key'))));
  router.patch('/masters/:resource/:key',async(req,res)=>{
    const recordKey=req.params.resource==='categories'?req.params.key:key.parse(req.params.key);
    res.json(await masters.save(req.session,req.params.resource,recordKey,req.body,req.get('Idempotency-Key')));
  });
  router.get('/settings',async(req,res)=>res.json(await identity.read(req.session,'business.configure',async trx=>({
    periods:await query(trx('business_periods').orderBy('start_date').limit(100)),policies:await query(trx('business_policy_versions').orderBy('id','desc').limit(20)),postingEnabled:false,timezone:'Asia/Karachi',backdating:'UNRESOLVED — blocked',cutoff:'No actual cutoff selected by setup',quantityStorageProposal:'DECIMAL(20,6)',moneyStorageProposal:'DECIMAL(20,2); financial rounding unresolved',
  }))));
  router.post('/periods',async(req,res)=>{
    const input=periodInput.parse(req.body);
    res.status(201).json(await coordinate(db,{session:req.session,permission:'business.configure',operation:'period.create',commandKey:req.get('Idempotency-Key'),payload:input},async(trx,actor)=>{
      if(await query(trx('business_periods').where('start_date','<=',input.end_date).where('end_date','>=',input.start_date).first()))throw new IdentityError(409,'OVERLAPPING_PERIOD');
      const {reason,version,...data}=input;
      const [id]=await query(trx('business_periods').insert({...data,updated_by:actor.id,updated_at:new Date()}));
      await businessAudit(trx,actor,'period.created','periods',id,1,{...data,reason});return {id:String(id),version:1};
    }));
  });
  router.patch('/periods/:id',async(req,res)=>{
    const id=key.parse(req.params.id),input=periodInput.parse(req.body);
    res.json(await coordinate(db,{session:req.session,permission:'business.configure',operation:`period.update:${id}`,commandKey:req.get('Idempotency-Key'),payload:input},async(trx,actor)=>{
      const before=await query(trx('business_periods').where({id}).forUpdate().first());if(!before)throw new IdentityError(404,'NOT_FOUND');
      if(before.version!==input.version)throw new IdentityError(409,'STALE_VERSION');
      if(before.start_date!==input.start_date||before.end_date!==input.end_date)throw new IdentityError(409,'PERIOD_DATES_IMMUTABLE');
      if(before.status==='CLOSED'&&input.status==='OPEN')throw new IdentityError(409,'REOPENING_POLICY_UNRESOLVED');
      await query(trx('business_periods').where({id}).update({name:input.name,status:input.status,version:before.version+1,updated_by:actor.id,updated_at:new Date()}));
      await businessAudit(trx,actor,'period.changed','periods',id,before.version+1,{before:before.status,after:input.status,reason:input.reason});return {id,version:before.version+1};
    }));
  });
  router.post('/policy-proposals',async(req,res)=>{
    const input=policyInput.parse(req.body);
    res.status(201).json(await coordinate(db,{session:req.session,permission:'business.configure',operation:'policy.propose',commandKey:req.get('Idempotency-Key'),payload:input},async(trx,actor)=>{
      const [id]=await query(trx('business_policy_versions').insert({...input,status:'PROPOSED',numbering_rule:'CURRENT_PAKISTAN_DATE_ONLY',actor_id:actor.id,created_at:new Date()}));
      await businessAudit(trx,actor,'policy.proposed','policies',id,Number(id),{...input,status:'PROPOSED'});return {id:String(id),status:'PROPOSED'};
    }));
  });
  router.get('/audit',async(req,res)=>res.json({events:await identity.read(req.session,'business.audit.read',trx=>query(trx('business_audit_events').orderBy('id','desc').limit(100)))}));
  router.get('/approvals',async(req,res)=>res.json({approvals:await identity.read(req.session,'business.approve',trx=>query(trx('business_approvals as a').join('business_documents as d','d.id','a.document_id').join('business_document_types as t','t.id','d.type_id').select('a.*','t.name as document_type','d.status as document_status').orderBy('a.id','desc').limit(100))),postingEnabled:false}));
  // Deliberately no financial documents, posting, number issuance or approval action API.
  return router;
}
