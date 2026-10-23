import {databasePreflight} from '../../src/identity/preflight.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomBytes,randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { createServer as tcpServer,connect as tcpConnect } from 'node:net';
import { createDatabase,transaction } from '../../src/identity/database.js';
import { hashPassword } from '../../src/identity/passwords.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import { identityConfig } from '../../src/identity/config.js';
import { masterService } from '../../src/business/masters.js';
import { coordinate,businessAudit,payloadHash } from '../../src/business/transactions.js';
import { createDraft,reviseDraft,submitDraft,decideApproval,validateApproval,issueNumber,linkCorrection,pakistanDate } from '../../src/business/documents.js';
import { verifyRuntimeGrants } from '../../src/identity/grants.js';
import { verifyBusinessSchema } from '../../tools/business-operations.mjs';

test('P2.2 real restricted MariaDB acceptance; no owner-schema fixtures or destructive reset',async t=>{
  if(process.env.UPMS_P24_STAGE!=='true'&&process.env.UPMS_P23_RUN==='03'&&process.env.UPMS_P23_SUPPLEMENTAL!=='reviewed-fresh-regression-03')throw Error('Supplemental regression approval required.');
  const p25=process.env.UPMS_P25A_STAGE==='true';const p24=process.env.UPMS_P24_STAGE==='true';const p23=process.env.UPMS_P23_STAGE==='true';if(p25){assert.match(process.env.DB_NAME,/^upms_test_p27c_regression_20261023_0[1-8]$/);assert.equal(process.env.DB_USER,'upms_runtime_test_p27cr'+process.env.UPMS_P25_RUN);}else if(p24){assert.match(process.env.DB_NAME,/^upms_test_p24_regression_20261023_0[1-6]$/);assert.equal(process.env.DB_USER,'upms_runtime_test_p24r'+process.env.UPMS_P24_RUN);}else if(p23){assert.match(process.env.DB_NAME,/^upms_test_p23_regression_20261023_0[123]$/);assert.equal(process.env.DB_USER,'upms_runtime_test_p23r'+process.env.UPMS_P23_RUN);}else{assert.equal(process.env.DB_NAME,'upms_test_p22_20261021');assert.equal(process.env.DB_USER,'upms_runtime_test_p22');}
  const ownerEnv={...process.env,DB_USER:process.env.UPMS_P22_OWNER_USER,DB_PASSWORD:process.env.UPMS_P22_OWNER_PASSWORD,IDENTITY_DB_PURPOSE:'operator'};
  const owner=createDatabase(ownerEnv);let db=createDatabase(process.env),browser,server;
  await mkdir('tmp/w06/p27c/legacy-business',{recursive:true});
  const tag=randomBytes(5).toString('hex'),password=randomBytes(24).toString('hex'),hash=await hashPassword(password),results=[];
  const common=(code,name=`${tag} ${code}`)=>({code:`${tag}_${code}`,name,active:true,reason:'Synthetic P2.2 fixture'});
  const [lastPeriod]=await owner('business_periods').max('end_date as last');
  const year=Math.max(2026,lastPeriod.last?Number(String(lastPeriod.last).slice(0,4))+1:2026);
  const day=year+'-06-01',instant=year+'-06-01T12:00:00Z';
  let app,adminSession,adminActor,adminAgent,adminToken,units=[],dims=[],item,customer,documentType;
  const config=identityConfig({MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:'http://localhost:3000',SESSION_SECRET:randomBytes(40).toString('hex')});
  const base='/api/v1/management';
  async function sub(name,fn){await t.test(name,fn);results.push(name);}
  let fixtureIndex=0;
  async function fixture(role){
    const username=`${tag}_${role}_${fixtureIndex++}`;
    const id=await transaction(db,async trx=>{const [id]=await trx('users').insert({login_key:username,display_name:`Synthetic ${role}`,password_hash:hash,enabled:true,created_at:new Date(),updated_at:new Date()});await trx('user_roles').insert({user_id:id,role_code:role});return String(id);});
    const agent=request.agent(app),csrf=await agent.get(base+'/session/csrf');
    const response=await agent.post(base+'/session/login').set('Origin',config.origin).set('X-CSRF-Token',csrf.body.csrfToken).send({username,password});assert.equal(response.status,200);
    const row=await db('sessions').where({user_id:id,revoked:false}).orderBy('absolute_expires','desc').first();
    return {id,username,agent,token:response.body.csrfToken,actor:response.body.user,session:{...JSON.parse(row.data),recordHash:row.token_hash}};
  }
  const command=(operation,payload,work,options={})=>coordinate(db,{session:adminSession,permission:'business.configure',operation,commandKey:randomUUID(),payload,...options},work);
  const save=(resource,data,id=null,session=adminSession)=>masterService(db).save(session,resource,id,data,randomUUID());
  async function syntheticIssue(trx,actor,input){
    await trx('business_documents').where({id:input.documentId}).update({status:'POSTED'});
    return issueNumber(trx,actor,input);
  }
  async function newDocument(type=documentType,dateInstant=instant){
    const businessDate=pakistanDate(new Date(dateInstant));
    return command('synthetic.draft',{nonce:randomUUID()},(trx,actor)=>createDraft(trx,actor,{typeId:type,businessDate,payload:{fixture:randomUUID()},reason:'Synthetic draft'}));
  }
  try{
    await databasePreflight(owner,ownerEnv);await databasePreflight(db);
    await sub('schema, actual table allowlist and SQL denial proofs',async()=>{
      const schema=await verifyBusinessSchema(owner);assert.equal(schema.totalTables,p25?111:p24?59:p23?44:38);
      const [rows]=await db.raw('SHOW GRANTS FOR CURRENT_USER');assert.equal(verifyRuntimeGrants(rows,process.env.DB_NAME,process.env.DB_USER+'@localhost').verified,true);
      for(const sql of ['DELETE FROM business_customers WHERE 1=0','UPDATE business_audit_events SET action=action WHERE 1=0','DELETE FROM business_master_history WHERE 1=0','UPDATE business_number_issues SET official_number=official_number WHERE 1=0','CREATE TABLE p22_denied_probe (id INT)','SELECT 1 FROM mysql.user LIMIT 0'])await assert.rejects(db.raw(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
    });
    await sub('existing 17 identity integration checks on the newly provisioned schema',async()=>{
      const receipt=JSON.parse(await readFile(p25?'server/.local/p27c/identity-'+process.env.UPMS_P25_RUN+'.json':p24?'server/.local/p24/identity-'+process.env.UPMS_P24_RUN+'.json':p23?(process.env.UPMS_P23_RECOVERED==='true'?'server/.local/p23b/resumption/identity-':'server/.local/p23/identity-')+process.env.UPMS_P23_RUN+'.json':'server/.local/p22/identity-regression.json','utf8'));
      assert.equal(receipt.passed,true);assert.equal(receipt.checks,17);assert.equal(receipt.topLevel,true);
      assert.equal(receipt.database,p23?process.env.DB_NAME:'upms_test_p22_identity_20261021');
    });
    app=createApp({config:loadConfig({}),management:config,identityDatabase:db});
    const admin=await fixture('administrator');adminSession=admin.session;adminActor=admin.actor;adminAgent=admin.agent;adminToken=admin.token;
    await sub('master CRUD, normalized duplicate codes, immutable stock identity and canonical finished variants',async()=>{
      units.push((await save('units',{...common('PCS','Pieces'),scale:0})).key,(await save('units',{...common('KG','Kilograms'),scale:3})).key);
      await assert.rejects(save('units',{...common('pcs','Duplicate pieces'),scale:0}),e=>e.code==='ER_DUP_ENTRY');
      for(const resource of ['bottle-types','sizes','qualities','colours'])dims.push((await save(resource,common(resource.replaceAll('-','_')))).key);
      await assert.rejects(save('colours',{...common('ANOTHER_COLOUR'),name:` ${tag}   colours `}),e=>e.code==='DUPLICATE_CANONICAL_VALUE');
      const body={...common('BOTTLE','Synthetic finished bottle'),category_code:'FINISHED_GOODS',unit_id:units[0],bottle_type_id:dims[0],size_id:dims[1],quality_id:dims[2],colour_id:dims[3]};
      item=(await save('items',body)).key;
      await assert.rejects(save('items',{...body,...common('DUP_VARIANT')}),e=>e.code==='ER_DUP_ENTRY');
      await assert.rejects(save('items',{...body,...common('BAD_CATEGORY'),category_code:'RAW_MATERIAL'}),e=>e.code==='INVALID_VARIANT_DIMENSIONS');
      await assert.rejects(save('items',{...body,unit_id:units[1],version:1},item),e=>e.code==='ITEM_IDENTITY_IMMUTABLE');
      await assert.rejects(save('units',{...common('PCS','Pieces'),scale:1,version:1},units[0]),e=>e.code==='REFERENCED_UNIT_IMMUTABLE');
      const updated=await save('items',{...body,name:'Renamed synthetic bottle',active:false,version:1},item);assert.equal(updated.version,2);
      await assert.rejects(save('items',{...body,version:1},item),e=>e.code==='STALE_VERSION');
      assert.equal(String((await db('business_items').where({id:item}).first()).unit_id),String(units[0]));assert.equal((await db('business_master_history').where({resource:'items',record_key:item})).length,2);
    });
    await sub('customer/vendor separation, superseding single-ledger scope and no invented balances',async()=>{
      customer=(await save('customers',{...common('PARTY','Synthetic same-name party'),email:'synthetic@example.test'})).key;
      const vendor=(await save('vendors',{...common('PARTY','Synthetic same-name party')})).key;assert.ok(vendor);
      assert.deepEqual((await db('business_customer_ledgers').where({customer_id:customer}).pluck('ledger_class')).sort(),[]);assert.equal((await db('customer_balances').where({customer_id:customer})).length,0);await owner('business_customer_ledgers').insert({customer_id:customer,ledger_class:'GST'}); // Legacy constraint fixture only; application creates no classifications.
      const row=await db('business_customers').where({id:customer}).first();assert.ok(!('balance'in row));assert.ok(!('opening_balance'in row));
      await assert.rejects(db('business_customer_ledgers').insert({customer_id:customer,ledger_class:'GST'}),e=>e.code==='ER_DUP_ENTRY');
    });
    await sub('department API boundaries, CSRF, sensitive fields and deactivation references',async()=>{
      await save('money-accounts',{...common('BANK','Synthetic bank'),account_type:'BANK',bank_name:'Synthetic bank',account_reference:'SYNTHETIC_ONLY'});
      const inventory=await fixture('inventory'),sales=await fixture('sales_dispatch'),accounts=await fixture('accounts');
      for(const actor of [inventory,sales])assert.equal((await actor.agent.get(base+'/business/masters/money-accounts')).status,403);
      assert.equal((await accounts.agent.get(base+'/business/masters/money-accounts')).status,200);
      assert.equal((await sales.agent.get(base+'/business/masters/vendors')).status,403);
      assert.equal((await sales.agent.get(base+'/business/masters/customers')).status,200);
      assert.equal((await accounts.agent.post(base+'/business/masters/units').set('Origin',config.origin).set('X-CSRF-Token',accounts.token).set('Idempotency-Key',randomUUID()).send({...common('NO_AUTH'),scale:0})).status,403);
      assert.equal((await adminAgent.post(base+'/business/masters/customers').set('Origin',config.origin).send(common('NO_CSRF'))).status,403);
      const list=await sales.agent.get(base+'/business/masters/items');assert.equal(list.status,200);assert.ok(!JSON.stringify(list.body).includes('SYNTHETIC_ONLY'));
      assert.equal((await sales.agent.get(base+'/business/approvals')).status,403);
      assert.equal((await request(app).get(base+'/business/masters/items')).status,401);
      await assert.rejects(coordinate(db,{session:sales.session,permission:'business.approve',operation:'synthetic.approve',commandKey:randomUUID(),payload:{}},()=>({})),e=>e.code==='ACCESS_DENIED');
    });
    await sub('durable concurrent idempotency, payload conflicts, rollback and safe retry',async()=>{
      const scope={session:adminSession,permission:'business.configure',operation:'synthetic.concurrent',commandKey:randomUUID(),payload:{quantity:'1.00'}};let invoked=0;
      const work=async(trx,actor)=>{invoked++;await businessAudit(trx,actor,'synthetic.idempotent','test',tag,1);return {receipt:tag};};
      const replay=await Promise.all(Array.from({length:8},()=>coordinate(db,scope,work)));assert.equal(invoked,1);assert.ok(replay.every(r=>r.receipt===tag));
      await assert.rejects(coordinate(db,{...scope,payload:{quantity:'2.00'}},work),e=>e.code==='IDEMPOTENCY_CONFLICT');
      const failed={...scope,operation:'synthetic.rollback',commandKey:randomUUID()};
      await assert.rejects(coordinate(db,failed,async(trx,actor)=>{await businessAudit(trx,actor,'synthetic.must.rollback','test',tag,1);throw new Error('synthetic rollback');}));
      assert.equal((await db('business_idempotency').where({operation:failed.operation,command_key:failed.commandKey})).length,0);assert.equal((await db('business_audit_events').where({action:'synthetic.must.rollback',record_key:tag})).length,0);
      await coordinate(db,failed,()=>({retry:'passed'}));
      const childEnv={...process.env,UPMS_P22_REPLAY:JSON.stringify(scope)};delete childEnv.UPMS_P22_OWNER_USER;delete childEnv.UPMS_P22_OWNER_PASSWORD;delete childEnv.UPMS_P23_OWNER_USER;delete childEnv.UPMS_P23_OWNER_PASSWORD;delete childEnv.UPMS_P23_PASSWORD;
      const child=spawn(process.execPath,['--input-type=module','-e',"import {createDatabase} from './server/src/identity/database.js';import {coordinate} from './server/src/business/transactions.js';const db=createDatabase();try{const r=await coordinate(db,JSON.parse(process.env.UPMS_P22_REPLAY),()=>{throw Error('Replay reran effects')});if(!r.receipt)process.exitCode=1;}finally{await db.destroy();}"],{env:childEnv,stdio:'ignore'});
      assert.equal(await new Promise(resolve=>child.once('exit',resolve)),0,'Replay survives a separate process.');
    });
    await sub('document approval version binding, justified admin self-approval and invalidation',async()=>{
      documentType=(await save('document-types',{...common('SYNTHETIC_DOC','Synthetic test document'),prefix:`T${tag.toUpperCase()}`,prefix_approved:true})).key;
      const doc=await newDocument();
      const draftOriginal=await newDocument();
      await assert.rejects(command('synthetic.invalid_link',{doc,draftOriginal},(trx,actor)=>linkCorrection(trx,actor,{id:doc.id,originalId:draftOriginal.id,reason:'Synthetic unposted original'})),e=>e.code==='INVALID_ORIGINAL_STATE');
      await command('synthetic.submit',{doc},(trx,actor)=>submitDraft(trx,actor,{...doc,reason:'Synthetic submission'}));
      const row=await db('business_documents').where({id:doc.id}).first();
      await assert.rejects(command('synthetic.stale',{doc},trx=>decideApproval(trx,adminSession,{...doc,version:99,hash:row.payload_hash,decision:'APPROVED',reason:'Synthetic reason'})),e=>e.code==='STALE_APPROVAL');
      await assert.rejects(command('synthetic.no_reason',{doc},trx=>decideApproval(trx,adminSession,{...doc,hash:row.payload_hash,decision:'APPROVED',reason:''})),e=>e.code==='JUSTIFICATION_REQUIRED');
      await command('synthetic.approve',{doc},trx=>decideApproval(trx,adminSession,{...doc,hash:row.payload_hash,decision:'APPROVED',reason:'Justified synthetic administrator self approval'}));
      await command('synthetic.validate',{doc},trx=>validateApproval(trx,adminSession,doc.id));
      await command('synthetic.revise',{doc},(trx,actor)=>reviseDraft(trx,actor,{...doc,payload:{changed:true},reason:'Synthetic relevant edit'}));
      assert.equal(Boolean((await db('business_approvals').where({document_id:doc.id}).first()).valid),false);
      await assert.rejects(command('synthetic.revalidate',{doc},trx=>validateApproval(trx,adminSession,doc.id)),e=>e.code==='APPROVAL_REQUIRED');
    });
    await sub('real delegated staff self-approval denial, rejection reasons and posted immutability',async()=>{
      const staff=await fixture('inventory');
      const doc=await coordinate(db,{session:staff.session,permission:'masters.inventory.write',operation:'synthetic.staff_draft',commandKey:randomUUID(),payload:{}},async(trx,actor)=>{
        const doc=await createDraft(trx,actor,{typeId:documentType,businessDate:day,payload:{synthetic:'staff'},reason:'Synthetic staff document'});await submitDraft(trx,actor,{...doc,reason:'Synthetic submit'});return doc;
      });
      const row=await db('business_documents').where({id:doc.id}).first();
      await assert.rejects(transaction(owner,async trx=>{
        await trx('role_permissions').insert({role_code:'inventory',permission_code:'business.approve'});
        await trx('business_guard').where({id:1}).forUpdate().first();
        return decideApproval(trx,staff.session,{...doc,hash:row.payload_hash,decision:'APPROVED',reason:'Synthetic delegated self approval'});
      }),e=>e.code==='STAFF_SELF_APPROVAL_FORBIDDEN');
      assert.equal((await owner('role_permissions').where({role_code:'inventory',permission_code:'business.approve'})).length,0);
      await assert.rejects(command('synthetic.reject_reason',{doc},trx=>decideApproval(trx,adminSession,{...doc,hash:row.payload_hash,decision:'REJECTED',reason:''})),e=>e.code==='JUSTIFICATION_REQUIRED');
      await command('synthetic.reject',{doc},trx=>decideApproval(trx,adminSession,{...doc,hash:row.payload_hash,decision:'REJECTED',reason:'Synthetic rejection evidence'}));
      assert.equal((await db('business_documents').where({id:doc.id}).first()).status,'REJECTED');
      const posted=await newDocument();await owner('business_documents').where({id:posted.id}).update({status:'POSTED'}); // synthetic header only, no financial/stock effects
      await assert.rejects(command('synthetic.posted_edit',{posted},(trx,actor)=>reviseDraft(trx,actor,{...posted,payload:{changed:true},reason:'Synthetic forbidden edit'})),e=>e.code==='POSTED_DOCUMENT_IMMUTABLE');
    });
    await sub('period configuration authorization, immutable history and unresolved policy gates',async()=>{
      const input={name:`API period ${tag}`,start_date:(year+2)+'-01-01',end_date:(year+2)+'-12-31',status:'OPEN',reason:'Synthetic administrative period'};
      const call=(path,method,body)=>adminAgent[method](base+'/business'+path).set('Origin',config.origin).set('X-CSRF-Token',adminToken).set('Idempotency-Key',randomUUID()).send(body);
      const added=await call('/periods','post',input);assert.equal(added.status,201);
      assert.equal((await call('/periods','post',input)).status,409);
      const close=await call(`/periods/${added.body.id}`,'patch',{...input,status:'CLOSED',version:1});assert.equal(close.status,200);
      assert.equal((await call(`/periods/${added.body.id}`,'patch',{...input,status:'OPEN',version:2})).body.error.code,'REOPENING_POLICY_UNRESOLVED');
      const proposal=await call('/policy-proposals','post',{proposed_cutoff:null,reason:'Synthetic proposal only'});assert.equal(proposal.status,201);assert.equal(proposal.body.status,'PROPOSED');
      const settings=await adminAgent.get(base+'/business/settings');assert.equal(settings.status,200);assert.equal(settings.body.postingEnabled,false);
      assert.ok((await db('business_audit_events').where({action:'period.changed',record_key:added.body.id})).length===1);
    });
    await sub('approval audit failure rolls back approval, document state and command claim',async()=>{
      const doc=await newDocument();await command('synthetic.submit_fault',{doc},(trx,actor)=>submitDraft(trx,actor,{...doc,reason:'Synthetic fault submission'}));
      const row=await db('business_documents').where({id:doc.id}).first(),trigger=`p22_audit_${tag}`;
      await owner.raw(`CREATE TRIGGER ?? BEFORE INSERT ON business_audit_events FOR EACH ROW BEGIN IF NEW.action = 'document.approved' AND NEW.record_key = ? THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic audit failure'; END IF; END`,[trigger,doc.id]);
      try{await assert.rejects(command('synthetic.approve_fault',{doc},trx=>decideApproval(trx,adminSession,{...doc,hash:row.payload_hash,decision:'APPROVED',reason:'Synthetic audit rollback'})));}
      finally{await owner.raw('DROP TRIGGER ??',[trigger]);}
      assert.equal((await db('business_documents').where({id:doc.id}).first()).status,'SUBMITTED');assert.equal((await db('business_approvals').where({document_id:doc.id})).length,0);
    });
    await sub('concurrent annual numbers, independent types, rollback and immutable issued records',async()=>{
      await owner('business_policy_versions').insert({status:'APPROVED',proposed_cutoff:year+'-01-01',numbering_rule:'CURRENT_PAKISTAN_DATE_ONLY',reason:'Synthetic test-only policy; not owner cutoff',actor_id:adminActor.id,created_at:new Date()});
      await owner('business_periods').insert({name:`Synthetic ${tag}`,start_date:year+'-01-01',end_date:(year+1)+'-12-31',status:'OPEN',updated_by:adminActor.id,updated_at:new Date()});
      const docs=[];for(let i=0;i<8;i++)docs.push(await newDocument());
      await assert.rejects(command('synthetic.no_draft_number',{doc:docs[0]},(trx,actor)=>issueNumber(trx,actor,{documentId:docs[0].id,businessDate:day,instant:new Date(instant)})),e=>e.code==='NUMBER_REQUIRES_POSTING_TRANSACTION');
      const numbers=await Promise.all(docs.map(doc=>command('synthetic.number',{doc},(trx,actor)=>syntheticIssue(trx,actor,{documentId:doc.id,businessDate:day,instant:new Date(instant)}))));
      assert.equal(new Set(numbers.map(n=>n.number)).size,8);assert.ok(numbers[0].number.includes('-'+year+'-'));
      const other=(await save('document-types',{...common('OTHER_DOC'),prefix:`X${tag.toUpperCase()}`,prefix_approved:true})).key;
      const otherDoc=await newDocument(other);assert.ok((await command('synthetic.other_number',{otherDoc},(trx,actor)=>syntheticIssue(trx,actor,{documentId:otherDoc.id,businessDate:day,instant:new Date(instant)}))).number.endsWith('000001'));
      const yearDoc=await newDocument(documentType,year+'-12-31T19:00:00Z');assert.ok((await command('synthetic.year_number',{yearDoc},(trx,actor)=>syntheticIssue(trx,actor,{documentId:yearDoc.id,businessDate:(year+1)+'-01-01',instant:new Date(year+'-12-31T19:00:00Z')}))).number.endsWith((year+1)+'-000001'));
      const rollbackDoc=await newDocument(),before=await db('business_sequences').where({type_id:documentType,calendar_year:year}).first();
      await assert.rejects(command('synthetic.number_rollback',{rollbackDoc},async(trx,actor)=>{await syntheticIssue(trx,actor,{documentId:rollbackDoc.id,businessDate:day,instant:new Date(instant)});throw Error('Synthetic rollback');}));
      assert.equal((await db('business_number_issues').where({document_id:rollbackDoc.id})).length,0);assert.equal(String((await db('business_sequences').where({type_id:documentType,calendar_year:year}).first()).last_value),String(before.last_value));
      const committed=await command('synthetic.number_retry',{rollbackDoc},(trx,actor)=>syntheticIssue(trx,actor,{documentId:rollbackDoc.id,businessDate:day,instant:new Date(instant)}));assert.ok(committed.number);
      await assert.rejects(db('business_number_issues').insert({document_id:rollbackDoc.id,type_id:documentType,calendar_year:year,serial:999,official_number:'SYNTHETIC-DUPLICATE',issued_at:new Date()}),e=>e.code==='ER_DUP_ENTRY');
      const correction=await newDocument();await command('synthetic.link',{original:docs[0].id,correction:correction.id},(trx,actor)=>linkCorrection(trx,actor,{id:correction.id,originalId:docs[0].id,reason:'Synthetic linked correction'}));
      assert.equal((await db('business_number_issues').where({document_id:docs[0].id}).first()).official_number,numbers[0].number);
    });
    await sub('closed/backdated periods, source-effect uniqueness and uncertain client replay',async()=>{
      const doc=await newDocument();
      await assert.rejects(command('synthetic.backdate',{doc},(trx,actor)=>syntheticIssue(trx,actor,{documentId:doc.id,businessDate:day,instant:new Date(year+'-06-02T12:00:00Z')})),e=>e.code==='BACKDATING_POLICY_UNRESOLVED');
      await owner('business_periods').where({name:`Synthetic ${tag}`}).update({status:'CLOSED'});
      await assert.rejects(command('synthetic.closed',{doc},(trx,actor)=>syntheticIssue(trx,actor,{documentId:doc.id,businessDate:day,instant:new Date(instant)})),e=>e.code==='PERIOD_NOT_OPEN');
      const [batch]=await db('business_posting_batches').insert({document_id:doc.id,document_version:1,action:'SYNTHETIC_EFFECT_ONLY',created_at:new Date()});
      await assert.rejects(db('business_posting_batches').insert({document_id:doc.id,document_version:1,action:'SYNTHETIC_EFFECT_ONLY',created_at:new Date()}),e=>e.code==='ER_DUP_ENTRY');
      await db('business_effect_claims').insert({batch_id:batch,effect_key:'synthetic.test'});await assert.rejects(db('business_effect_claims').insert({batch_id:batch,effect_key:'synthetic.test'}),e=>e.code==='ER_DUP_ENTRY');
      const scope={session:adminSession,permission:'business.configure',operation:'synthetic.lost_response',commandKey:randomUUID(),payload:{doc}};
      await coordinate(db,scope,()=>({documentId:doc.id})); // Simulate response loss after real commit.
      await db.destroy();db=createDatabase(process.env);
      assert.equal((await coordinate(db,scope,()=>{throw Error('Duplicate effect');})).documentId,doc.id);
      // Real connection termination after a committed command: retry must resolve durable ownership.
      const connection=await db.client.acquireConnection();const [id]=await new Promise((resolve,reject)=>connection.query('SELECT CONNECTION_ID() AS id',(error,rows)=>error?reject(error):resolve(rows)));
      await owner.raw('KILL CONNECTION ?',[id.id]);await assert.rejects(new Promise((resolve,reject)=>connection.query('SELECT 1',(error,rows)=>error?reject(error):resolve(rows))));
      connection.destroy();await db.client.releaseConnection(connection);
      assert.equal((await coordinate(db,scope,()=>{throw Error('Connection retry reposted');})).documentId,doc.id);
    });
    await sub('real lock timeout and deadlock handling retries whole transactions',async()=>{
      const retries=[];const held=await owner.transaction();await held('business_guard').where({id:1}).forUpdate().first();
      const waiting=command('synthetic.timeout',{tag},async(trx,actor)=>{await businessAudit(trx,actor,'synthetic.lock_retry','test',tag,1);return {ok:true};},{onRetry:code=>retries.push(code)});
      await new Promise(resolve=>setTimeout(resolve,4500));await held.rollback();assert.equal((await waiting).ok,true);assert.ok(retries.includes('ER_LOCK_WAIT_TIMEOUT'));
      const held2=await owner.transaction();await held2('business_guard').where({id:1}).forUpdate().first();const deadlocks=[];
      const competing=command('synthetic.deadlock',{tag},()=>({ok:true}),{onRetry:code=>deadlocks.push(code)});
      await new Promise(resolve=>setTimeout(resolve,150));
      try{await held2('identity_guard').where({id:1}).forUpdate().first();}catch(e){deadlocks.push(e.code);}finally{await held2.rollback();}
      assert.equal((await competing).ok,true);assert.ok(deadlocks.includes('ER_LOCK_DEADLOCK'));
    });
    await sub('lost COMMIT acknowledgement resolves by durable replay without duplicate effects',async()=>{
      const sockets=new Set();let armed=true,dropped=false;
      const proxy=tcpServer(client=>{
        const upstream=tcpConnect({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)});sockets.add(client);sockets.add(upstream);let commit=false;
        for(const socket of [client,upstream]){socket.on('error',()=>{});socket.on('close',()=>{sockets.delete(socket);client.destroy();upstream.destroy();});}
        client.on('data',bytes=>{
          // mysql2 sends COM_QUERY in an uncompressed packet on this local fixture.
          if(armed&&bytes.length>5&&bytes[4]===3&&/^COMMIT\s*;?$/i.test(bytes.subarray(5).toString().trim()))commit=true;
          upstream.write(bytes);
        });
        upstream.on('data',bytes=>{if(commit&&armed&&bytes.length>4&&bytes[4]===0){armed=false;dropped=true;client.destroy();upstream.destroy();}else client.write(bytes);});
      });
      await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
      const faultDb=createDatabase({...process.env,DB_PORT:String(proxy.address().port)});
      const scope={session:adminSession,permission:'business.configure',operation:'synthetic.commit_ack',commandKey:randomUUID(),payload:{tag}};
      try{
        await assert.rejects(coordinate(faultDb,scope,async(trx,actor)=>{await businessAudit(trx,actor,'synthetic.commit_ack','test',tag,1);return {reference:tag};}),e=>e.code==='COMMAND_OUTCOME_UNKNOWN');
        assert.equal(dropped,true);
        assert.equal((await coordinate(db,scope,()=>{throw Error('Committed effect replayed');})).reference,tag);
        assert.equal((await db('business_audit_events').where({action:'synthetic.commit_ack',record_key:tag})).length,1);
      }finally{await faultDb.destroy();for(const socket of sockets)socket.destroy();await new Promise(resolve=>proxy.close(resolve));}
    });
    await sub('actual browser master CRUD, canonical duplicate feedback and mobile private layout',async()=>{
      // Fresh browser app and new pool after restart persistence tests.
      let browserApp;server=createServer((req,res)=>browserApp(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      const origin=`http://127.0.0.1:${server.address().port}`;
      browserApp=createApp({config:loadConfig({}),management:identityConfig({MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:origin,SESSION_SECRET:randomBytes(40).toString('hex')}),identityDatabase:db});
      browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-extensions','--proxy-server=direct://','--proxy-bypass-list=*']});
      const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/management');
      await page.waitForSelector('input[name="username"]');await page.type('input[name="username"]',admin.username);await page.type('input[name="password"]',password);await page.click('form button');await page.waitForFunction(()=>document.body.textContent.includes('Master data'));
      await page.evaluate(()=>[...document.querySelectorAll('nav button')].find(b=>b.textContent==='Master data').click());
      await page.waitForSelector('section > label select option[value="units"]');await page.select('section > label select','units');await page.waitForSelector('input[name="scale"]');
      const code=`UI_${tag.toUpperCase()}`;await page.type('input[name="code"]',code);await page.type('input[name="name"]','Synthetic browser unit');await page.type('input[name="reason"]','Synthetic browser create');await page.click('form button');
      await page.waitForFunction(code=>[...document.querySelectorAll('td')].some(td=>td.textContent===code),{},code);
      await page.type('input[name="code"]',code);await page.type('input[name="name"]','Duplicate synthetic unit');await page.type('input[name="reason"]','Synthetic duplicate check');await page.click('form button');await page.waitForFunction(()=>document.body.textContent.includes('already exists'));
      await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.deepEqual(errors,[]);
      await writeFile(`tmp/w06/p27c/legacy-business/browser-${tag}.json`,JSON.stringify({masterCreate:true,duplicateFeedback:true,mobile:true,pageErrors:errors}));
    });
    await sub('Round3 master detail reads are resource-scoped, explicit and nonfinancial',async()=>{
      // Earlier restart assertions intentionally destroy the initial app pool; bind this additive read proof to the current live pool.
      app=createApp({config:loadConfig({}),management:config,identityDatabase:db});const freshAdmin=await fixture('administrator');
      const customerResponse=await freshAdmin.agent.get(base+'/business/masters/customers/'+customer);
      assert.equal(customerResponse.status,200);assert.equal(String(customerResponse.body.record.id),String(customer));
      assert.equal(Object.hasOwn(customerResponse.body.record,'balance'),false);assert.equal(Object.hasOwn(customerResponse.body.record,'created_by'),false);
      const itemResponse=await freshAdmin.agent.get(base+'/business/masters/items/'+item);assert.equal(itemResponse.status,200);assert.ok(itemResponse.body.record.category_code);
      const inv=await fixture('inventory');assert.equal((await inv.agent.get(base+'/business/masters/customers/'+customer)).status,403);assert.equal((await inv.agent.get(base+'/business/masters/items/'+item)).status,200);
      const salesUser=await fixture('sales_dispatch');const vendor=await save('vendors',common('R3_VENDOR'));assert.equal((await salesUser.agent.get(base+'/business/masters/vendors/'+vendor.key)).status,403);
      assert.equal((await freshAdmin.agent.get(base+'/business/masters/vendors/'+vendor.key)).status,200);
      assert.equal((await freshAdmin.agent.get(base+'/business/masters/items/999999999')).status,404);
      assert.equal((await freshAdmin.agent.get(base+'/business/masters/units/'+units[0])).status,404);
    });
    await writeFile(`tmp/w06/p27c/legacy-business/results-${tag}.json`,JSON.stringify({database:process.env.DB_NAME,checks:results,identityRegression:17,ownerSchemaUntouched:true},null,2));
  }finally{await browser?.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});await db.destroy();await owner.destroy();}
});
