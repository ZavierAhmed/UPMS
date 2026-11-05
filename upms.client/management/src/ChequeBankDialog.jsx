import {useEffect,useRef,useState} from 'react';
import {ActionButton} from './ActionUI.jsx';
import './expense-masters.css';

export function ChequeBankDialog({save,onSaved,onCancel}) {
 const dialog=useRef(null),active=useRef(false),focus=useRef(document.activeElement);
 const [fields,setFields]=useState({name:'',code:'',description:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const element=dialog.current,previous=focus.current;
  if(element.showModal)element.showModal();else element.setAttribute('open','');
  return()=>{if(element.open&&element.close)element.close();if(previous?.isConnected)previous.focus();};
 },[]);
 async function submit(event) {
  event.preventDefault();event.stopPropagation();if(active.current)return;
  active.current=true;setBusy(true);setError('');
  try {const result=await save(fields);onSaved({id:result.id,...fields});}
  catch(failure){setError(failure.message);}
  finally{active.current=false;setBusy(false);}
 }
 return <dialog ref={dialog} className="expense-master-dialog" aria-labelledby="issuing-bank-title" onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}>
  <h2 id="issuing-bank-title">Add Issuing Bank</h2><p>This creates a synthetic UAT directory entry. Operational institution verification requires separate approval.</p>
  {error&&<p role="alert">{error}</p>}
  <form onSubmit={submit}><fieldset disabled={busy}>
   {[['name','Bank name',150],['code','Unique bank code',32],['description','Description (optional)',500]].map(([key,label,max])=><label key={key}>{label}<input required={key!=='description'} maxLength={max} value={fields[key]} onChange={event=>setFields({...fields,[key]:event.target.value})}/></label>)}
  </fieldset><footer><ActionButton type="button" disabled={busy} onClick={onCancel}>Cancel</ActionButton><ActionButton type="submit" disabled={busy}>Save issuing bank</ActionButton></footer></form>
 </dialog>;
}
