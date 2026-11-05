import {useEffect,useRef,useState} from 'react';

export function ChequeAttachments({files,onChange,onBusy,disabled=false,fieldError}) {
 const [error,setError]=useState(''),sequence=useRef(0),input=useRef(null);
 useEffect(()=>{const tracker=sequence;return()=>{tracker.current++;};},[]);
 async function select(event) {
  const request=++sequence.current,chosen=[...event.target.files];
  setError('');onChange([]);
  onBusy?.(true);
  if(chosen.length>2||chosen.some(file=>file.size===0||file.size>262144||!(/\.(pdf|jpe?g|png)$/i).test(file.name))) {
   setError('Choose at most two PDF, JPEG or PNG files, each up to 256 KiB.');return;
  }
  let completed=false;
  try {
   const result=await Promise.all(chosen.map(file=>new Promise((done,fail)=>{
    const reader=new FileReader();reader.onerror=()=>fail(Error('File could not be read. Select it again.'));
    reader.onabort=()=>fail(Error('File reading was interrupted. Select it again.'));
    reader.onload=()=>done({filename:file.name,content:String(reader.result).split(',')[1]});
    reader.readAsDataURL(file);
   })));
   if(sequence.current===request){onChange(result);completed=true;}
  } catch(failure) {if(sequence.current===request)setError(failure.message);}
  finally {if(sequence.current===request&&completed)onBusy?.(false);}
 }
 return <fieldset className="v1-wide" data-entry-field="attachments" disabled={disabled}><legend>Supporting Documents</legend>
  <label>Optional cheque evidence<input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={select} aria-invalid={Boolean(error||fieldError)}/></label>
  <button type="button" onClick={()=>{sequence.current++;if(input.current)input.current.value='';onChange([]);setError('');onBusy?.(false);}}>Clear selected attachments</button>
  <p>Up to two files per event, 256 KiB each. Textual bank evidence remains required. Content validation is performed on the server. Malware scanning is unavailable in this synthetic UAT environment.</p>
  {files?.map((file,index)=><p key={file.filename+index}>{file.filename} · selected</p>)}
  {(error||fieldError)&&<p role="alert">{error||fieldError}</p>}
 </fieldset>;
}
