import { useEffect,useRef,useState } from 'react';
const referenceFields=[['bottle_type_id','bottle-types','Bottle type'],['size_id','sizes','Bottle size'],['quality_id','qualities','Bottle quality'],['colour_id','colours','Bottle colour']];
const captions={FINISHED_GOODS:'Finished goods',RAW_MATERIAL:'Raw materials',COMPONENT:'Components',PACKING_MATERIAL:'Packing materials',CASH:'Cash',BANK:'Bank',CASH_HOLDER:'Cash holder',CHEQUE_HOLDING:'Cheque holding',CHEQUE_CLEARING:'Cheque clearing'};
export function BusinessMasters({api,user}){
  const apiRef=useRef(api);useEffect(()=>{apiRef.current=api;},[api]);
  const [resources,setResources]=useState([]),[selected,setSelected]=useState(''),[records,setRecords]=useState([]),[references,setReferences]=useState({});
  const [search,setSearch]=useState(''),[editing,setEditing]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  const pending=useRef(new Map());
  useEffect(()=>{let live=true;apiRef.current('/business/resources').then(data=>{if(live){setResources(data.resources);setSelected(data.resources[0]?.code||'');}}).catch(error=>{if(live)setMessage(error.message);});return()=>{live=false;};},[]);
  useEffect(()=>{
    if(!selected||selected==='settings'||selected==='approvals'||selected==='audit')return;
    let live=true;
    (async()=>{try{
      const data=await apiRef.current(`/business/masters/${selected}?q=${encodeURIComponent(search)}`);
      const refs={};if(selected==='items')await Promise.all(['categories','units','bottle-types','sizes','qualities','colours'].map(async resource=>{refs[resource]=(await apiRef.current(`/business/masters/${resource}`)).records;}));
      if(live){setRecords(data.records);setReferences(refs);}
    }catch(error){if(live)setMessage(error.message);}})();return()=>{live=false;};
  },[selected,search,refresh]);
  async function command(path,method,body){
    const signature=JSON.stringify({path,method,body});let key=pending.current.get(signature);
    if(!key){key=crypto.randomUUID();pending.current.set(signature,key);}
    const result=await apiRef.current(path,method,body,undefined,key);pending.current.delete(signature);return result;
  }
  async function save(body){
    if(busy)return;setBusy(true);setMessage('');
    try{const key=editing?.id||editing?.code;await command(`/business/masters/${selected}${editing?`/${key}`:''}`,editing?'PATCH':'POST',{...body,...(editing?{version:editing.version}:{})});setEditing(null);setRefresh(v=>v+1);setMessage('Record saved. History and references are preserved.');}
    catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  const current=resources.find(r=>r.code===selected),admin=user.permissions.includes('business.configure');
  function choose(value){setSelected(value);setSearch('');setEditing(null);setMessage('');setRecords([]);}
  return <section><p className="eyebrow">BUSINESS FOUNDATION</p><h1>Master data</h1><p>Configure records for future workflows. Stock and money posting are not enabled.</p>
    <label>Master area<select value={selected} onChange={event=>choose(event.target.value)}>{resources.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}{admin&&<option value="settings">Periods and policy proposals</option>}{user.permissions.includes('business.approve')&&<option value="approvals">Approval history</option>}{user.permissions.includes('business.audit.read')&&<option value="audit">Master audit history</option>}</select></label>
    {message&&<p className="notice" role="status">{message}</p>}
    {selected==='settings'?<Settings api={apiRef} command={command}/>:selected==='approvals'||selected==='audit'?<History api={apiRef} area={selected}/>:current&&<>
      <h2>{current.label}</h2><label>Search code or name<input value={search} onChange={e=>setSearch(e.target.value)} maxLength={100}/></label><p className="muted">Up to 100 matching records. Inactive records retain their references.</p>
      <div className="table-wrap"><table><thead><tr><th>Code</th><th>Name</th>{current.kind==='item'&&<th>Stock identity</th>}{current.kind==='unit'&&<th>Decimal places</th>}{current.kind==='party'&&<th>Contact</th>}{current.kind==='money'&&<th>Account details</th>}{current.kind==='documentType'&&<th>Number prefix</th>}<th>Status</th>{current.canWrite&&<th>Action</th>}</tr></thead><tbody>{records.map(row=><tr key={row.id||row.code}><td>{row.code}</td><td>{row.name}</td>
        {current.kind==='item'&&<td>{captions[row.category_code]} · {references.units?.find(r=>String(r.id)===String(row.unit_id))?.name||'Assigned base unit'}{row.category_code==='FINISHED_GOODS'&&<span> · {referenceFields.map(([field,resource])=>references[resource]?.find(r=>String(r.id)===String(row[field]))?.name).join(' / ')}</span>}</td>}
        {current.kind==='unit'&&<td>{row.scale}</td>}{current.kind==='party'&&<td>{[row.contact_name,row.phone,row.email].filter(Boolean).join(' · ')}</td>}{current.kind==='money'&&<td>{[captions[row.account_type],row.bank_name,row.account_reference,row.holder].filter(Boolean).join(' · ')}</td>}{current.kind==='documentType'&&<td>{row.prefix||'Unconfigured'} · {row.prefix_approved?'Approved prefix':'Proposed / disabled'}</td>}
        <td>{row.active?'Active':'Inactive'}</td>{current.canWrite&&<td><button onClick={()=>{setEditing(row);setMessage('');}}>Edit {row.code}</button></td>}</tr>)}</tbody></table></div>
      {!records.length&&<p>No matching records yet. Add approved canonical values; historical abbreviations are not mapped automatically.</p>}
      {current.canWrite&&<>{current.kind==='category'&&!editing?<p>The four confirmed categories are fixed. Choose Edit to rename or deactivate a category.</p>:<MasterForm key={`${selected}:${editing?.id||editing?.code||'new'}:${refresh}`} resource={current} record={editing} references={references} busy={busy} save={save} cancel={()=>setEditing(null)}/>}</>}
    </>}
  </section>;
}
function MasterForm({resource,record,references,busy,save,cancel}){
  const [category,setCategory]=useState(record?.category_code||'FINISHED_GOODS');
  const kind=resource.kind;
  function submit(event){event.preventDefault();const data=new FormData(event.currentTarget);const body={code:data.get('code'),name:data.get('name'),active:data.get('active')==='on',reason:data.get('reason')};
    if(kind==='unit')body.scale=Number(data.get('scale'));
    if(kind==='item'){body.category_code=category;body.unit_id=data.get('unit_id');for(const [field]of referenceFields)body[field]=category==='FINISHED_GOODS'?data.get(field):null;}
    if(kind==='party')for(const field of ['contact_name','email','phone','address','remarks'])body[field]=data.get(field)||null;
    if(kind==='money'){body.account_type=data.get('account_type');for(const field of ['bank_name','account_reference','holder','remarks'])body[field]=data.get(field)||null;}
    if(kind==='documentType'){body.prefix=data.get('prefix')||null;body.prefix_approved=data.get('prefix_approved')==='on';}
    save(body);
  }
  function select(field,collection,label,required=true){return <label key={field}>{label}<select name={field} defaultValue={record?.[field]||''} required={required} disabled={busy}>{!record&&<option value="">Choose {label.toLowerCase()}</option>}{(references[collection]||[]).filter(r=>r.active||String(r.id||r.code)===String(record?.[field])).map(r=><option value={r.id||r.code} key={r.id||r.code}>{r.code} — {r.name}{r.active?'':' (inactive)'}</option>)}</select></label>;}
  return <form className="card" onSubmit={submit}><h2>{record?`Edit ${record.code}`:`Create ${resource.label.toLowerCase()}`}</h2>
    <label>Code<input name="code" defaultValue={record?.code||''} maxLength={64} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*" required readOnly={Boolean(record)} /></label><label>Name<input name="name" defaultValue={record?.name||''} maxLength={150} required/></label>
    {kind==='unit'&&<><label>Allowed decimal places<input type="number" name="scale" min={0} max={6} step={1} defaultValue={record?.scale??0} required/></label><p>Use 0 for whole pieces. Units are never converted automatically; referenced unit meaning is protected.</p></>}
    {kind==='item'&&<><label>Inventory category<select name="category_code" value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(captions).slice(0,4).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>{select('unit_id','units','Base stock unit')}{category==='FINISHED_GOODS'&&referenceFields.map(([field,collection,label])=>select(field,collection,label))}<p>The base unit, category and four variant dimensions stay fixed after creation. Packing is a challan detail and does not distinguish a variant.</p></>}
    {kind==='party'&&<>{[['contact_name','Contact name'],['email','Email'],['phone','Phone'],['address','Address'],['remarks','Remarks']].map(([field,label])=><label key={field}>{label}<input name={field} type={field==='email'?'email':'text'} maxLength={['address','remarks'].includes(field)?1000:field==='email'?254:field==='phone'?64:150} defaultValue={record?.[field]||''}/></label>)}{resource.code==='customers'&&<p>Separate GST and non-GST ledger classifications are created without opening balances.</p>}</>}
    {kind==='money'&&<><label>Account type<select name="account_type" defaultValue={record?.account_type||'CASH'}>{Object.entries(captions).slice(4).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>{[['bank_name','Bank name'],['account_reference','Account reference'],['holder','Account holder'],['remarks','Remarks']].map(([field,label])=><label key={field}>{label}<input name={field} defaultValue={record?.[field]||''} maxLength={field==='remarks'?1000:150}/></label>)}<p>Creating an account does not create a balance or transaction.</p></>}
    {kind==='documentType'&&<><label>Proposed prefix<input name="prefix" pattern="[A-Z0-9]+" maxLength={12} defaultValue={record?.prefix||''}/></label><label className="check"><input name="prefix_approved" type="checkbox" defaultChecked={record?.prefix_approved||false}/>I approve this prefix configuration</label><p>No numbers are issued by this screen. Drafts have no official number. Backdating and actual cutover remain blocked pending separate policy decisions.</p></>}
    <label className="check"><input type="checkbox" name="active" defaultChecked={record?.active??true}/>Active</label><label>Reason for this change<input name="reason" minLength={3} maxLength={500} required/></label>
    <button disabled={busy}>{busy?'Saving…':'Save master record'}</button>{record&&<button type="button" disabled={busy} onClick={cancel}>Cancel edit</button>}
  </form>;
}
function Settings({api,command}){
  const [data,setData]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{let live=true;api.current('/business/settings').then(value=>{if(live)setData(value);}).catch(error=>{if(live)setMessage(error.message);});return()=>{live=false;};},[api,revision]);
  async function run(path,body,method='POST'){if(busy)return;setBusy(true);setMessage('');try{await command(path,method,body);setRevision(v=>v+1);setMessage('Administrative setting saved and audited. Posting remains disabled.');}catch(error){setMessage(error.message);}finally{setBusy(false);}}
  return <div><h2>Periods and policy proposals</h2><p>Posting is disabled. No actual cutoff or monetary policy is selected by setup. Numbering uses proposed Pakistan calendar-year rules; backdating and period reopening remain blocked.</p>{message&&<p role="status">{message}</p>}
    <form className="card" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run('/business/periods',{name:f.get('name'),start_date:f.get('start'),end_date:f.get('end'),status:f.get('status'),reason:f.get('reason')});}}><h3>Add a business period</h3><label>Period name<input name="name" maxLength={150} required/></label><label>Start date<input name="start" type="date" required/></label><label>End date<input name="end" type="date" required/></label><label>Period status<select name="status"><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label><label>Reason<input name="reason" minLength={3} maxLength={500} required/></label><button disabled={busy}>Save period</button></form>
    <ul>{data?.periods.map(p=><li key={p.id}>{p.name} · {p.start_date} to {p.end_date} · {p.status}</li>)}</ul>
    {data?.periods.some(p=>p.status==='OPEN')&&<form className="card" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),p=data.periods.find(p=>String(p.id)===f.get('period'));run(`/business/periods/${p.id}`,{name:p.name,start_date:p.start_date,end_date:p.end_date,status:'CLOSED',version:p.version,reason:f.get('reason')},'PATCH');}}><h3>Close a period</h3><label>Open period<select name="period">{data.periods.filter(p=>p.status==='OPEN').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Closure reason<input name="reason" minLength={3} maxLength={500} required/></label><button disabled={busy}>Close period</button></form>}
    <form className="card" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run('/business/policy-proposals',{proposed_cutoff:f.get('cutoff')||null,reason:f.get('reason')});}}><h3>Record a cutoff proposal</h3><p>A proposal does not approve or activate cutover. Opening balances require a later milestone.</p><label>Proposed cutoff<input name="cutoff" type="date"/></label><label>Proposal reason<input name="reason" minLength={3} maxLength={500} required/></label><button disabled={busy}>Record proposal</button></form>
    <ul>{data?.policies.map(p=><li key={p.id}>{p.status} · {p.proposed_cutoff||'No date proposed'} · {p.reason}</li>)}</ul>
  </div>;
}
function History({api,area}){
  const [rows,setRows]=useState([]),[message,setMessage]=useState('');
  useEffect(()=>{let live=true;api.current(`/business/${area}`).then(data=>{if(live)setRows(data.approvals||data.events);}).catch(error=>{if(live)setMessage(error.message);});return()=>{live=false;};},[api,area]);
  return <div><h2>{area==='approvals'?'Approval history':'Master audit history'}</h2><p>No financial approval actions or posting are enabled.</p>{message&&<p role="alert">{message}</p>}<ol className="history">{rows.map(row=><li key={row.id}><strong>{row.document_type||row.resource} · {row.decision||row.action}</strong><span>Version {row.document_version||row.version} · {row.decided_at||row.created_at} UTC</span><p>{row.justification||row.details}</p></li>)}</ol>{!rows.length&&<p>No records to display.</p>}</div>;
}
