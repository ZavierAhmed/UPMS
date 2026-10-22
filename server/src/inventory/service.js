import {lockStockPlans,advanceStockBalance,stockReconciliation} from './stock.js';
import { query } from '../identity/database.js';
import { createIdentityService } from '../identity/service.js';
import { IdentityError } from '../identity/passwords.js';
import { coordinate,businessAudit } from '../business/transactions.js';
import { createDraft,reviseDraft,submitDraft,decideApproval,validateApproval,issueNumber,linkCorrection } from '../business/documents.js';
import { conditions,typeCodes } from './catalog.js';
import { exact,decimal } from './quantity.js';
import { documentInput,activationInput,versionInput,decisionInput,acceptanceInput,reason as reasonSchema } from './validation.js';
const labels={PRODUCTION:'Finished production',CONSUMPTION:'Material consumption',COUNT:'Stock-count adjustment',CORRECTION:'Inventory correction'};
const permissionFor=kind=>kind==='COUNT'?'inventory.counts.record':kind==='CORRECTION'?'inventory.corrections.request':'inventory.drafts.create';
const postingPermission=kind=>({PRODUCTION:'inventory.production.post',CONSUMPTION:'inventory.consumption.post',COUNT:'inventory.adjustments.post',CORRECTION:'inventory.corrections.post'})[kind];
const approvalPermission=kind=>kind==='COUNT'?'inventory.adjustments.approve':'inventory.corrections.approve';
const fail=(code,status=409)=>{throw new IdentityError(status,code);};
const isAdmin=actor=>{if(!actor.roles.includes('administrator'))fail('ADMINISTRATOR_REQUIRED',403);};
const rowKey=row=>`${row.item_id}:${row.stock_condition}`;
async function item(trx,id){const row=await query(trx('business_items as i').join('business_units as u','u.id','i.unit_id').where('i.id',id).select('i.*','u.scale','u.active as unit_active').first());if(!row)fail('INVALID_ITEM',400);return row;}
async function tracked(trx,row){const state=await query(trx('inventory_tracking').where({item_id:row.id}).first());if(!state||state.state==='UNVERIFIED')fail('INITIAL_STATE_UNVERIFIED');return state;}
async function load(trx,id){const doc=await query(trx('business_documents as d').join('inventory_documents as i','i.document_id','d.id').where('d.id',id).select('d.*','i.kind','i.original_document_id','i.count_closed').first());if(!doc)fail('NOT_FOUND',404);return doc;}
async function lifecycle(trx,actor,doc,event,reason){await query(trx('business_document_events').insert({document_id:doc.id,version:doc.version,event,actor_id:actor.id,reason,created_at:new Date()}));await businessAudit(trx,actor,`inventory.${event.toLowerCase()}`,'inventory',doc.id,doc.version,{reason});}
async function catalogue(trx,actor,prefixes=null,reason='Prepare inventory document catalogue'){
  const result={};for(const [kind,code] of Object.entries(typeCodes)){
    let type=await query(trx('business_document_types').where({code}).first());
    if(!type){const [id]=await query(trx('business_document_types').insert({code,name:labels[kind],active:true,prefix:prefixes?.[kind]||null,prefix_approved:Boolean(prefixes),created_by:actor.id,updated_by:actor.id,created_at:new Date(),updated_at:new Date()}));type={id,version:1,prefix:prefixes?.[kind]||null};}
    else if(prefixes){
      if(await query(trx('business_number_issues').where({type_id:type.id}).first())&&type.prefix!==prefixes[kind])fail('ISSUED_PREFIX_IMMUTABLE');
      await query(trx('business_document_types').where({id:type.id}).update({prefix:prefixes[kind],prefix_approved:true,active:true,version:type.version+1,updated_by:actor.id,updated_at:new Date()}));type.version++;
    }
    if(prefixes){const duplicate=await query(trx('business_document_types').where({prefix:prefixes[kind]}).whereNot({id:type.id}).first());if(duplicate)fail('PREFIX_ALREADY_ASSIGNED');}
    await businessAudit(trx,actor,'inventory.catalogue.configured','document-types',type.id,type.version,{code,prefix:prefixes?.[kind]||type.prefix,reason});result[kind]=String(type.id);
  }return result;
}
async function normalizedLines(trx,actor,input){
  const result=[],seen=new Set();let original=null;
  if(input.kind==='CORRECTION'){
    if(!input.originalDocumentId)fail('ORIGINAL_DOCUMENT_REQUIRED',400);
    original=await load(trx,input.originalDocumentId);
    if(original.status!=='POSTED'||!['PRODUCTION','CONSUMPTION'].includes(original.kind))fail('INVALID_ORIGINAL_STATE');
  }else if(input.originalDocumentId)fail('INVALID_ORIGINAL_STATE',400);
  for(const [index,line] of input.lines.entries()){
    const current=await item(trx,line.itemId);if(!current.active||!current.unit_active)fail('INACTIVE_ITEM',400);
    const value=exact(line.quantity,current.scale,{positive:input.kind!=='COUNT'});
    if(input.kind==='PRODUCTION'&&current.category_code!=='FINISHED_GOODS'||input.kind==='CONSUMPTION'&&!['RAW_MATERIAL','COMPONENT','PACKING_MATERIAL'].includes(current.category_code))fail('INVALID_ITEM_CATEGORY',400);
    if(input.kind!=='COUNT'&&line.condition!=='AVAILABLE')fail('CONDITION_ACTION_DISABLED',400);
    const row={line_index:index,item_id:line.itemId,unit_id:String(current.unit_id),stock_condition:line.condition,quantity:decimal(value),expected_quantity:null,expected_version:null,original_movement_id:null,counted_at:null,recorded_by:actor.id};
    if(input.kind==='COUNT'){
      await tracked(trx,current);const key=`${line.itemId}:${line.condition}`;if(seen.has(key))fail('DUPLICATE_COUNT_LINE',400);seen.add(key);
      const balance=await query(trx('inventory_balances').where({item_id:line.itemId,stock_condition:line.condition}).first());if(!balance)fail('INITIAL_STATE_UNVERIFIED');
      Object.assign(row,{expected_quantity:balance.quantity,expected_version:String(balance.version),counted_at:new Date()});
    }
    if(original){
      const movement=await query(trx('inventory_movements').where({id:line.originalMovementId,document_id:original.id,item_id:line.itemId,stock_condition:'AVAILABLE'}).first());
      if(!movement)fail('INVALID_CORRECTION_REFERENCE',400);row.original_movement_id=String(movement.id);
    }else if(line.originalMovementId)fail('INVALID_CORRECTION_REFERENCE',400);
    result.push(row);
  }return result;
}
function bodyFrom(input,lines){return {kind:input.kind,businessDate:input.businessDate,reference:input.reference,remarks:input.remarks,reason:input.reason,originalDocumentId:input.originalDocumentId,lines:lines.map(row=>({itemId:String(row.item_id),unitId:String(row.unit_id),quantity:row.quantity,condition:row.stock_condition,expectedQuantity:row.expected_quantity,expectedVersion:row.expected_version,originalMovementId:row.original_movement_id}))};}
export function inventoryService(db){
  const identity=createIdentityService(db);
  const run=(session,permission,operation,key,payload,work)=>coordinate(db,{session,permission,operation,commandKey:key,payload},work);
  return {
    async configuration(session){return identity.read(session,'inventory.read',async(trx,actor)=>({conditions,warehouse:'One shared factory/warehouse',conditionTransfersEnabled:false,canConfigure:actor.permissions.includes('inventory.configure'),canActivate:actor.permissions.includes('inventory.activate'),acceptance:await query(trx('inventory_policy_acceptances').orderBy('id','desc').first()),types:await query(trx('business_document_types').whereIn('code',Object.values(typeCodes)).select('code','name','prefix','prefix_approved')),postingRequires:'Explicit inventory policy acceptance, open period, approved prefixes and authorized item starting state'}));},
    async prepare(session,input,key){const reason=reasonSchema.parse(input.reason);return run(session,'inventory.configure','inventory.prepare',key,{reason},async(trx,actor)=>{isAdmin(actor);return {types:await catalogue(trx,actor,null,reason)};});},
    async accept(session,raw,key){const input=acceptanceInput.parse(raw);return run(session,'inventory.configure','inventory.policy.accept',key,input,async(trx,actor)=>{
      isAdmin(actor);if(new Set(Object.values(input.prefixes)).size!==4)fail('PREFIX_ALREADY_ASSIGNED',400);
      const proposal=await query(trx('business_policy_versions').where({id:input.proposalId,status:'PROPOSED'}).first()),period=await query(trx('business_periods').where({id:input.periodId,status:'OPEN'}).first());
      if(!proposal?.proposed_cutoff||!period)fail('POLICY_PREREQUISITES_MISSING');
      if(proposal.proposed_cutoff>period.end_date)fail('POLICY_PREREQUISITES_MISSING');
      await catalogue(trx,actor,input.prefixes,input.reason);
      const [id]=await query(trx('business_policy_versions').insert({status:'APPROVED',proposed_cutoff:proposal.proposed_cutoff,numbering_rule:'CURRENT_PAKISTAN_DATE_ONLY',reason:input.reason,actor_id:actor.id,created_at:new Date()}));
      await query(trx('inventory_policy_acceptances').insert({policy_id:id,approved_by:actor.id,reason:input.reason,created_at:new Date()}));
      await businessAudit(trx,actor,'inventory.policy.accepted','policies',id,1,{proposalId:input.proposalId,periodId:input.periodId,prefixes:input.prefixes,cutoff:proposal.proposed_cutoff,reason:input.reason});return {policyId:String(id),scope:'INVENTORY_ONLY'};
    });},
    async activate(session,id,raw,key){const input=activationInput.parse(raw);return run(session,'inventory.activate',`inventory.activate:${id}`,key,input,async(trx,actor)=>{
      isAdmin(actor);const current=await item(trx,id);if(!current.active)fail('INACTIVE_ITEM');let state=await query(trx('inventory_tracking').where({item_id:id}).first());
      if(!state){await query(trx('inventory_tracking').insert({item_id:id,unit_id:current.unit_id,state:'UNVERIFIED',created_at:new Date()}));state={state:'UNVERIFIED',version:1};}
      if(state.state!=='UNVERIFIED')fail('INITIAL_STATE_ALREADY_AUTHORIZED');if(state.version!==input.version)fail('STALE_VERSION');
      if(await query(trx('inventory_movements').where({item_id:id}).first())||await query(trx('inventory_balances').where({item_id:id}).first()))fail('INITIAL_STATE_INCONSISTENT');
      await query(trx('inventory_balances').insert(conditions.map(stock_condition=>({item_id:id,unit_id:current.unit_id,stock_condition,quantity:'0.000000',version:1,updated_at:new Date()}))));
      await query(trx('inventory_tracking').where({item_id:id}).update({state:'NEW_OPERATIONAL',version:input.version+1,activated_by:actor.id,activation_reason:input.reason,activated_at:new Date()}));
      await businessAudit(trx,actor,'inventory.new_item.authorized','items',id,input.version+1,{mode:input.mode,attestation:true,reason:input.reason,historicalOpening:false});return {itemId:id,state:'NEW_OPERATIONAL'};
    });},
    async save(session,raw,key,id=null){const input=documentInput.parse(raw);return run(session,permissionFor(input.kind),`inventory.draft:${id||'new'}`,key,input,async(trx,actor)=>{
      const rows=await normalizedLines(trx,actor,input),payload=bodyFrom(input,rows);let result;
      if(id){const before=await load(trx,id);if(before.kind!==input.kind||String(before.original_document_id||'')!==String(input.originalDocumentId||''))fail('DOCUMENT_IDENTITY_IMMUTABLE');if(before.count_closed)fail('COUNT_ALREADY_VERIFIED');if(!input.version)fail('VERSION_REQUIRED',400);result=await reviseDraft(trx,actor,{id,version:input.version,payload,reason:input.reason});await query(trx('business_documents').where({id}).update({business_date:input.businessDate}));}
      else{const type=await query(trx('business_document_types').where({code:typeCodes[input.kind],active:true}).first());if(!type)fail('INVENTORY_CATALOGUE_NOT_PREPARED');result=await createDraft(trx,actor,{typeId:type.id,businessDate:input.businessDate,payload,reason:input.reason});id=result.id;await query(trx('inventory_documents').insert({document_id:id,kind:input.kind,original_document_id:input.originalDocumentId}));if(input.kind==='CORRECTION')await linkCorrection(trx,actor,{id,originalId:input.originalDocumentId,reason:input.reason});}
      await query(trx('inventory_lines').insert(rows.map(row=>({...row,document_id:id,document_version:result.version}))));return {...result,status:'DRAFT'};
    });},
    async submit(session,id,raw,key){const input=versionInput.parse(raw);const kind=await identity.read(session,'inventory.read',async trx=>(await load(trx,id)).kind);return run(session,kind==='COUNT'?'inventory.adjustments.request':'inventory.corrections.request',`inventory.submit:${id}`,key,input,async(trx,actor)=>{
      const doc=await load(trx,id);if(!['COUNT','CORRECTION'].includes(doc.kind))fail('ORDINARY_POSTING_REQUIRES_NO_APPROVAL');if(doc.count_closed)fail('COUNT_ALREADY_VERIFIED');if(doc.version!==input.version)fail('STALE_VERSION');
      if(doc.kind==='COUNT'){
        const rows=await query(trx('inventory_lines').where({document_id:id,document_version:doc.version}));
        if(rows.every(row=>exact(row.quantity)===exact(row.expected_quantity))){
          for(const row of rows){const balance=await query(trx('inventory_balances').where({item_id:row.item_id,stock_condition:row.stock_condition}).first());if(String(balance?.version)!==String(row.expected_version)||balance.quantity!==row.expected_quantity)fail('STALE_STOCK_COUNT');}
          if(!['DRAFT','REJECTED'].includes(doc.status))fail('INVALID_DOCUMENT_STATE');await query(trx('inventory_documents').where({document_id:id}).update({count_closed:true}));await lifecycle(trx,actor,doc,'COUNT_VERIFIED',input.reason);return {id,status:'VERIFIED',movementCount:0};
        }
      }
      await submitDraft(trx,actor,{id,version:input.version,reason:input.reason});return {id,status:'SUBMITTED',version:doc.version};
    });},
    async decide(session,id,raw,key){const input=decisionInput.parse(raw);const kind=await identity.read(session,'inventory.read',async trx=>(await load(trx,id)).kind);return run(session,approvalPermission(kind),`inventory.approval:${id}`,key,input,async(trx,actor)=>{
      isAdmin(actor);const doc=await load(trx,id);if(!['COUNT','CORRECTION'].includes(doc.kind))fail('INVALID_DOCUMENT_STATE');return decideApproval(trx,session,{id,version:input.version,hash:doc.payload_hash,decision:input.decision,reason:input.reason});
    });},
    async post(session,id,raw,key){const input=versionInput.parse(raw);const kind=await identity.read(session,'inventory.read',async trx=>(await load(trx,id)).kind);return run(session,postingPermission(kind),`inventory.post:${id}`,key,input,async(trx,actor)=>{
      const doc=await load(trx,id);if(doc.status==='POSTED')fail('DUPLICATE_POSTING');if(doc.count_closed)fail('COUNT_ALREADY_VERIFIED');if(doc.version!==input.version)fail('STALE_VERSION');
      if(['COUNT','CORRECTION'].includes(doc.kind)){
        isAdmin(actor);const approval=await validateApproval(trx,session,id);
        const permitted=await query(trx('user_roles as ur').join('role_permissions as rp','ur.role_code','rp.role_code').where({'ur.user_id':approval.approver_id,'ur.role_code':'administrator','rp.permission_code':approvalPermission(doc.kind)}).first());if(!permitted)fail('APPROVAL_AUTHORITY_REVOKED');
      }else if(doc.status!=='DRAFT')fail('INVALID_DOCUMENT_STATE');
      const acceptance=await query(trx('inventory_policy_acceptances').orderBy('id','desc').first());if(!acceptance)fail('INVENTORY_POLICY_PENDING');
      const rows=await query(trx('inventory_lines').where({document_id:id,document_version:doc.version}).orderBy('line_index'));
      const deltas=[],totals=new Map(),originalTotals=new Map();
      for(const row of rows){
        const current=await item(trx,row.item_id);if(!current.active||!current.unit_active)fail('INACTIVE_ITEM');await tracked(trx,current);
        const quantity=exact(row.quantity);if(quantity%(10n**BigInt(6-current.scale))!==0n)fail('INVALID_UNIT_PRECISION',400);
        if(doc.kind==='PRODUCTION'&&current.category_code!=='FINISHED_GOODS'||doc.kind==='CONSUMPTION'&&!['RAW_MATERIAL','COMPONENT','PACKING_MATERIAL'].includes(current.category_code))fail('INVALID_ITEM_CATEGORY');
        let delta=doc.kind==='CONSUMPTION'?-quantity:quantity;
        if(doc.kind==='COUNT')delta=quantity-exact(row.expected_quantity);
        if(doc.kind==='CORRECTION'){
          const original=await query(trx('inventory_movements').where({id:row.original_movement_id,document_id:doc.original_document_id,item_id:row.item_id}).first());if(!original)fail('INVALID_CORRECTION_REFERENCE');
          const value=exact(original.delta,6,{signed:true});delta=value>0n?-quantity:quantity;
          originalTotals.set(String(original.id),(originalTotals.get(String(original.id))||0n)+quantity);
        }
        if(doc.kind!=='COUNT'&&(row.stock_condition!=='AVAILABLE'||quantity<=0n))fail('CONDITION_ACTION_DISABLED');
        deltas.push({row,delta});const key=rowKey(row);totals.set(key,{item_id:row.item_id,stock_condition:row.stock_condition,delta:(totals.get(key)?.delta||0n)+delta});
      }
      for(const [movementId,proposed]of originalTotals){const original=await query(trx('inventory_movements').where({id:movementId}).first()),corrections=await query(trx('inventory_movements').where({original_movement_id:movementId}));const used=corrections.reduce((sum,row)=>{const q=exact(row.delta,6,{signed:true});return sum+(q<0n?-q:q);},0n),source=exact(original.delta,6,{signed:true});if(used+proposed>(source<0n?-source:source))fail('CORRECTION_LIMIT_EXCEEDED');}
      const balances=await lockStockPlans(trx,totals.values());
      if(doc.kind==='COUNT')for(const {row}of deltas){const balance=balances.get(rowKey(row));if(String(balance.version)!==String(row.expected_version)||balance.quantity!==row.expected_quantity)fail('STALE_STOCK_COUNT');}
      const [batch]=await query(trx('business_posting_batches').insert({document_id:id,document_version:doc.version,action:`INVENTORY_${doc.kind}`,created_at:new Date()}));let movementCount=0;
      for(const {row,delta}of deltas){if(delta===0n)continue;const balance=balances.get(rowKey(row)),before=exact(balance.quantity),after=before+delta;if(after<0n)fail('INSUFFICIENT_AVAILABLE_STOCK');
        const effect=`line:${row.id}`;await query(trx('business_effect_claims').insert({batch_id:batch,effect_key:effect}));
        const version=BigInt(balance.version)+1n;const [movement]=await query(trx('inventory_movements').insert({document_id:id,batch_id:batch,line_id:row.id,effect_key:effect,item_id:row.item_id,unit_id:row.unit_id,stock_condition:row.stock_condition,delta:decimal(delta),before_quantity:decimal(before),after_quantity:decimal(after),balance_version:version.toString(),movement_type:doc.kind==='COUNT'?'COUNT_ADJUSTMENT':doc.kind,original_movement_id:row.original_movement_id,actor_id:actor.id,reason:input.reason,created_at:new Date()}));
        await advanceStockBalance(trx,balance,delta,movement);movementCount++;
      }
      if(!movementCount)fail('NO_ADJUSTMENT_REQUIRED');
      await query(trx('business_documents').where({id}).update({status:'POSTED',updated_at:new Date()}));
      const number=await issueNumber(trx,actor,{documentId:id,businessDate:doc.business_date,policyId:acceptance.policy_id});
      await lifecycle(trx,actor,doc,'POSTED',input.reason);return {id,status:'POSTED',number:number.number,movementCount};
    });},
    async overview(session,search=''){return identity.read(session,'inventory.read',async trx=>{
      const items=await query(trx('business_items as i').leftJoin('inventory_tracking as t','t.item_id','i.id').join('business_units as u','u.id','i.unit_id').where(q=>q.where('i.name','like',`%${search}%`).orWhere('i.code','like',`%${search}%`)).select('i.id','i.code','i.name','i.category_code','i.active','i.unit_id','u.name as unit','u.scale','t.state','t.version as tracking_version').orderBy('i.code').limit(100));
      const balances=items.length?await query(trx('inventory_balances').whereIn('item_id',items.map(row=>row.id))):[];
      return items.map(row=>({...row,id:String(row.id),state:row.state||'UNVERIFIED',tracking_version:row.tracking_version||1,balances:conditions.map(condition=>{const balance=balances.find(b=>String(b.item_id)===String(row.id)&&b.stock_condition===condition);return {condition,quantity:balance?.quantity??null,version:balance?String(balance.version):null};})}));
    });},
    async documents(session){return identity.read(session,'inventory.read',trx=>query(trx('business_documents as d').join('inventory_documents as i','i.document_id','d.id').leftJoin('business_number_issues as n','n.document_id','d.id').join('users as u','u.id','d.created_by').select('d.id','d.version','d.status','d.business_date','d.payload_hash','i.kind','i.count_closed','n.official_number','u.display_name as creator').orderBy('d.id','desc').limit(100)));},
    async document(session,id){return identity.read(session,'inventory.read',async trx=>{const doc=await load(trx,id);return {...doc,payload:JSON.parse(doc.payload),lines:await query(trx('inventory_lines').where({document_id:id,document_version:doc.version})),events:await query(trx('business_document_events').where({document_id:id}).orderBy('id')),approvals:await query(trx('business_approvals').where({document_id:id}).orderBy('id'))};});},
    async history(session,filters={}){return identity.read(session,'inventory.read',async trx=>{
      const select=(table,external)=>{let builder=trx(table+' as m').join('business_items as i','i.id','m.item_id').join('users as u','u.id','m.actor_id').join('business_number_issues as n','n.document_id','m.document_id').select('m.*','i.code as item_code','i.name as item_name','u.display_name as actor','n.official_number').orderBy('m.id','desc').limit(200);if(filters.itemId)builder=builder.where('m.item_id',filters.itemId);if(filters.type)builder=builder.where(external?'m.movement_code':'m.movement_type',filters.type);if(filters.from)builder=builder.where('m.created_at','>=',filters.from+' 00:00:00');if(filters.to)builder=builder.where('m.created_at','<=',filters.to+' 23:59:59.999999');if(filters.reference)builder=builder.where('n.official_number','like','%'+filters.reference+'%');return query(builder);};
      const old=await select('inventory_movements',false),receipts=await select('purchase_stock_movements',true),dispatch=await select('sales_stock_movements',true);return [...old,...receipts.map(row=>({...row,id:'purchase:'+row.id,movement_type:row.movement_code})),...dispatch.map(row=>({...row,id:'sales:'+row.id,movement_type:row.movement_code,reason:'Finished-goods dispatch'}))].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,200);
    });},
    async reconcile(session){return identity.read(session,'inventory.read',stockReconciliation);},
  };
}
