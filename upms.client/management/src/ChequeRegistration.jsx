import {ChequeAttachments} from './ChequeAttachments.jsx';
import {ChequeBankDialog} from './ChequeBankDialog.jsx';
import {useEffect,useRef,useState} from 'react';
import {ActionButton} from './ActionUI.jsx';
import {SearchableEntitySelect} from './SearchableEntitySelect.jsx';

import {chequeReferencePreview} from './chequeReference.js';

export function ChequeRegistration({api,data,draft,setDraft,errors,busy,submit,createBank,onBankCreated,canCreateBank}) {
 const [bankPopup,setBankPopup]=useState(false),[reading,setReading]=useState(false);
 const [checked,setChecked]=useState(null),apiRef=useRef(api);
 const {number,drawerAccount,issuingBankId}=draft;
 const identityKey=JSON.stringify([number,drawerAccount,issuingBankId]);
 const identity=checked?.key===identityKey?checked.result:number&&drawerAccount&&issuingBankId?{checking:true}:null;
 useEffect(()=>{apiRef.current=api;},[api]);
 useEffect(()=>{
  let live=true;
  if(!number||!drawerAccount||!issuingBankId)return;
  const timer=setTimeout(()=>{
   apiRef.current('/simple-v1/cheque-identity','POST',{number,drawerAccount,issuingBankId}).then(result=>{
    if(live)setChecked({key:identityKey,result});
   }).catch(error=>{if(live)setChecked({key:identityKey,result:{error:error.message}});});
  },350);
  return()=>{clearTimeout(timer);live=false;};
 },[number,drawerAccount,issuingBankId,identityKey]);
 const update=(key,value)=>setDraft(current=>({...current,[key]:value}));
 const field=(name,label,props={})=><label data-entry-field={name}><span className="cheque-field-label">{label}</span><input name={name} value={draft[name]||''} onChange={event=>update(name,event.target.value)} aria-invalid={Boolean(errors[name])} {...props}/>{errors[name]&&<span className="field-error" role="alert">{errors[name]}</span>}</label>;
 const preview=chequeReferencePreview(draft.number||'',data.clients.find(c=>String(c.id)===draft.clientId)?.name||'',draft.amount||'');
 return <><form className="card v1-form no-print" onSubmit={event=>{
  event.preventDefault();
  if(identity?.available===false||identity?.checking||reading)return;
  submit(draft);
 }}>
  <fieldset disabled={busy}><legend>Customer &amp; Cheque</legend>
   <SearchableEntitySelect name="clientId" label="Client" value={draft.clientId} onChange={value=>update('clientId',value)} records={data.clients} required error={errors.clientId}/>
   {field('number','Cheque number',{required:true,inputMode:'numeric',pattern:'[0-9]{1,30}',maxLength:30})}
   <div className="cheque-issuer-field"><SearchableEntitySelect name="issuingBankId" label="Issuing bank" value={draft.issuingBankId} onChange={value=>update('issuingBankId',value)} records={data.issuers} formatLabel={bank=>`${bank.name} · ${bank.code||'Synthetic UAT issuer'}`} required error={errors.issuingBankId}/>
   {data.extrasEnabled&&canCreateBank&&<ActionButton type="button" onClick={()=>setBankPopup(true)}>+ Add Issuing Bank</ActionButton>}</div>
   {field('drawerName','Drawer name',{required:true,maxLength:150})}
   {field('drawerAccount','Full drawer account identity',{required:true,minLength:6,maxLength:34,autoComplete:'off'})}
   {field('amount','Amount · PKR',{required:true,inputMode:'decimal'})}
  </fieldset>
  <div aria-live="polite">
   {identity?.checking&&<p role="status">Checking cheque identity...</p>}
   {identity?.available===true&&<p>Cheque identity is available.</p>}
   {identity?.available===false&&<p role="alert">This instrument is already registered. {identity.existingId&&<a href={'/management/cheques?id='+identity.existingId}>Review existing instrument</a>}</p>}
   {identity?.error&&<p role="alert">Identity check could not complete. {identity.error} Registration will independently check identity.</p>}
  </div>
  <p>Matching cheque numbers from different issuing accounts may be legitimate.</p>
  <fieldset disabled={busy}><legend>Dates &amp; Reference</legend>
   {field('chequeDate','Cheque date',{type:'date',required:true})}
   {field('receivedDate','Received date',{type:'date',required:true,max:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi'}).format(new Date())})}
   <label><span className="cheque-field-label">Generated business reference</span><output aria-label="Generated business reference">{preview||'Complete the client, cheque number and amount.'}</output><small>A unique suffix is assigned on registration.</small></label>
  </fieldset>
  {(data.attachmentsEnabled??data.extrasEnabled)&&<ChequeAttachments fieldError={errors.attachments} disabled={busy} files={draft.attachments||[]} onChange={files=>update('attachments',files)} onBusy={setReading}/>}
  <p>Receiving a cheque does not mark the customer's payment as cleared.</p>
  <p>Synthetic issuer directory. Added names require operational bank identity approval.</p>
  <ActionButton variant="primary" type="submit" disabled={busy||reading||identity?.checking||identity?.available===false}>Register cheque in custody</ActionButton>
 </form>{bankPopup&&<ChequeBankDialog save={createBank} onCancel={()=>setBankPopup(false)} onSaved={bank=>{onBankCreated(bank);update('issuingBankId',String(bank.id));setBankPopup(false);}}/>}</>;
}
