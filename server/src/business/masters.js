import { createIdentityService } from '../identity/service.js';
import { query } from '../identity/database.js';
import { IdentityError } from '../identity/passwords.js';
import { resources } from './catalog.js';
import { masterInput } from './validation.js';
import { coordinate,businessAudit } from './transactions.js';
const metadata=['id','created_by','updated_by','created_at','updated_at'];
const comparable=value=>value===null||value===undefined?null:String(value);
export function masterService(db){
  const identity=createIdentityService(db);
  const resource=name=>{if(!Object.hasOwn(resources,name))throw new IdentityError(404,'NOT_FOUND');return resources[name];};
  async function reference(trx,table,column,value){
    const row=await query(trx(table).where({[column]:value}).first());
    if(!row||!row.active)throw new IdentityError(400,'INACTIVE_OR_INVALID_REFERENCE');
    return row;
  }
  return {
    async manifest(session){return identity.read(session,'portal.access',async(_,actor)=>Object.entries(resources).filter(([,r])=>actor.permissions.includes(r.read)).map(([code,r])=>({code,label:r.label,kind:r.kind||'simple',canWrite:actor.permissions.includes(r.write)})));},
    async list(session,name,search=''){
      const r=resource(name);
      return identity.read(session,r.read,async trx=>{
        let builder=trx(r.table).select('*').orderBy('code').limit(100);
        if(search)builder=builder.where(q=>q.where('name','like',`%${search}%`).orWhere('code','like',`%${search}%`));
        const rows=await query(builder);
        // No balance/opening fields exist. Sales gets only customer contact/dispatch fields.
        return rows.map(row=>({...row,...(row.id?{id:String(row.id)}:{}),active:Boolean(row.active),...(r.kind==='documentType'?{prefix_approved:Boolean(row.prefix_approved)}:{})}));
      });
    },
    async save(session,name,recordKey,input,commandKey){
      const r=resource(name),parsed=masterInput(name).parse(input);
      if(recordKey&&!parsed.version)throw new IdentityError(400,'VERSION_REQUIRED');
      return coordinate(db,{session,permission:r.write,operation:`master:${name}:${recordKey||'new'}`,commandKey,payload:parsed},async(trx,actor)=>{
        const where=r.kind==='category'?{code:recordKey}:{id:recordKey};
        const before=recordKey?await query(trx(r.table).where(where).forUpdate().first()):null;
        if(recordKey&&!before)throw new IdentityError(404,'NOT_FOUND');
        if(before&&before.version!==parsed.version)throw new IdentityError(409,'STALE_VERSION');
        const {reason,version,...data}=parsed;
        if(before&&before.code!==data.code)throw new IdentityError(409,'CODE_IMMUTABLE');
        if(['bottle-types','sizes','qualities','colours'].includes(name)){
          const duplicate=await query(trx(r.table).where({name:data.name}).first());
          if(duplicate&&String(duplicate.id)!==String(recordKey))throw new IdentityError(409,'DUPLICATE_CANONICAL_VALUE');
        }
        if(r.kind==='item'){
          const finished=data.category_code==='FINISHED_GOODS';
          const dimensions=['bottle_type_id','size_id','quality_id','colour_id'];
          if(dimensions.some(key=>finished?!data[key]:data[key]!==null))throw new IdentityError(400,'INVALID_VARIANT_DIMENSIONS');
          if(before&&['category_code','unit_id',...dimensions].some(key=>comparable(before[key])!==comparable(data[key])))throw new IdentityError(409,'ITEM_IDENTITY_IMMUTABLE');
          if(!before||data.active&&!before.active){
            await reference(trx,'business_categories','code',data.category_code);await reference(trx,'business_units','id',data.unit_id);
            if(finished)for(const [column,table] of [['bottle_type_id','business_bottle_types'],['size_id','business_sizes'],['quality_id','business_qualities'],['colour_id','business_colours']])await reference(trx,table,'id',data[column]);
          }
        }
        if(r.kind==='unit'&&before&&(before.scale!==data.scale||before.name!==data.name)&&await query(trx('business_items').where({unit_id:before.id}).first()))throw new IdentityError(409,'REFERENCED_UNIT_IMMUTABLE');
        if(r.kind==='documentType'){
          if(data.prefix_approved&&!data.prefix)throw new IdentityError(400,'PREFIX_REQUIRED');
          if(data.prefix){const other=await query(trx(r.table).where({prefix:data.prefix}).first());if(other&&String(other.id)!==String(recordKey))throw new IdentityError(409,'PREFIX_ALREADY_ASSIGNED');}
          if(before&&await query(trx('business_number_issues').where({type_id:before.id}).first())&&(before.prefix!==data.prefix||Boolean(before.prefix_approved)!==data.prefix_approved))throw new IdentityError(409,'ISSUED_PREFIX_IMMUTABLE');
        }
        const next=(before?.version||0)+1;
        if(r.kind!=='category')Object.assign(data,{updated_by:actor.id,updated_at:new Date()});
        let id=recordKey;
        if(before)await query(trx(r.table).where(where).update({...data,version:next}));
        else{
          if(r.kind==='category')throw new IdentityError(409,'FIXED_CATEGORY_CATALOGUE');
          const [inserted]=await query(trx(r.table).insert({...data,created_by:actor.id,created_at:new Date()}));id=String(inserted);
          if(name==='customers')await query(trx('business_customer_ledgers').insert(['GST','NON_GST'].map(ledger_class=>({customer_id:id,ledger_class}))));
        }
        const snapshot={...data,version:next};for(const key of metadata)delete snapshot[key];
        await query(trx('business_master_history').insert({resource:name,record_key:String(id),version:next,actor_id:actor.id,snapshot:JSON.stringify(snapshot),created_at:new Date()}));
        await businessAudit(trx,actor,before?'master.updated':'master.created',name,id,next,{reason,changedFields:Object.keys(data).filter(k=>!metadata.includes(k))});
        return {key:String(id),version:next};
      });
    },
  };
}
