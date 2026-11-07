import {useState} from 'react';
import {ActionButton} from './ActionUI.jsx';
import {ChequeReadiness} from './ChequeReadiness.jsx';
import {ChequeAttachments} from './ChequeAttachments.jsx';

const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi'}).format(new Date());
const title=value=>value.charAt(0)+value.slice(1).toLowerCase();

export function ChequeLifecycleForm({action,selected,data,api,user,errors,busy,drafts,save,cancel}) {
 const key='cheque-action:'+selected.id+':'+action;
 const [draft,setDraft]=useState(()=>drafts?.get(key)||{date:today(),reference:'',reason:'',evidence:'',bankId:'',approved:false,selfApprovalReason:'',attachments:[]});
 const [reading,setReading]=useState(false),[readiness,setReadiness]=useState(null);
 const update=(name,value)=>{const next={...draft,[name]:value};drafts?.set(key,next);setDraft(next);};
 const field=(name,label,props={})=><label data-entry-field={name}><span className="cheque-field-label">{label}</span><input name={name} value={draft[name]} onChange={event=>update(name,event.target.value)} aria-invalid={Boolean(errors[name])} {...props}/>{errors[name]&&<span className="field-error" role="alert">{errors[name]}</span>}</label>;
 const involved=selected.events.some(event=>String(event.actor_id)===String(user.id));
 const blocked=action==='CLEARED'&&(readiness?.clearanceDate!==draft.date||Boolean(readiness?.blocker));
 return <form className="card v1-form" onSubmit={event=>{
  event.preventDefault();if(reading||blocked||busy)return;
  const body={date:draft.date,reference:draft.reference,reason:draft.reason,evidence:draft.evidence,
   ...(action==='DEPOSITED'?{bankId:draft.bankId}:{}),
   ...(action==='CLEARED'?{approved:draft.approved,selfApprovalReason:draft.selfApprovalReason}:{}),
   ...((data.attachmentsEnabled??data.extrasEnabled)&&['DEPOSITED','CLEARED'].includes(action)&&draft.attachments.length?{attachments:draft.attachments}:{})};
  save(body,key);
 }}>
  <fieldset disabled={busy}><legend>{title(action)} · complete instrument PKR {selected.amount}</legend>
   {field('date','Event date',{type:'date',required:true,min:selected.events.at(-1).date,max:today()})}
   {field('reference','Bank / disposition reference',{required:true,maxLength:150})}
   {field('reason','Reason',{required:true,minLength:10,maxLength:500})}
   {field('evidence','Supporting evidence reference',{required:true,minLength:10,maxLength:1000})}
   {action==='DEPOSITED'&&<label><span className="cheque-field-label">Verified receiving bank</span><select name="bankId" required value={draft.bankId} onChange={event=>update('bankId',event.target.value)}><option value="">Choose receiving BANK</option>{data.banks.map(bank=><option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></label>}
   {action==='CLEARED'&&<>
    <ChequeReadiness api={api} selected={selected} date={draft.date} onResult={setReadiness}/>
    <label data-entry-field="approved"><input type="checkbox" name="approved" required checked={draft.approved} aria-invalid={Boolean(errors.approved)} onChange={event=>update('approved',event.target.checked)}/>I confirm actual bank clearance evidence for the complete instrument.{errors.approved&&<span className="field-error" role="alert">{errors.approved}</span>}</label>
    {field('selfApprovalReason','Exceptional administrator self-approval justification (if involved in receipt/deposit)',{required:involved,minLength:involved?10:undefined,maxLength:500})}
    <p>No partial cheque, overpayment, future or unsupported backdated recognition is permitted.</p>
   </>}
  </fieldset>
  {(data.attachmentsEnabled??data.extrasEnabled)&&['DEPOSITED','CLEARED'].includes(action)&&<ChequeAttachments fieldError={errors.attachments} disabled={busy} files={draft.attachments} onChange={files=>update('attachments',files)} onBusy={setReading}/>}
  <div className="cheque-lifecycle-actions"><ActionButton type="submit" disabled={busy||reading||blocked}>Record {title(action)}</ActionButton>
  <ActionButton type="button" disabled={busy} onClick={cancel}>Dismiss action</ActionButton></div>
 </form>;
}
