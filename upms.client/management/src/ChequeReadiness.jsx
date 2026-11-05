import {useEffect,useRef,useState} from 'react';

export function ChequeReadiness({api,selected,date,onResult}) {
 const [checked,setChecked]=useState(null),apiRef=useRef(api);
 const key=selected.id+':'+date;
 const result=checked?.key===key?checked.result:null,error=checked?.key===key?checked.error:'';
 useEffect(()=>{apiRef.current=api;},[api]);
 useEffect(()=>{
  let live=true;
  apiRef.current('/simple-v1/cheques?'+new URLSearchParams({readiness:selected.id,date})).then(data=>{if(live){setChecked({key,result:data,error:''});onResult(data);};}).catch(failure=>{if(live){setChecked({key,result:null,error:failure.message});onResult({clearanceDate:date,blocker:true});};});
  return()=>{live=false;};
 },[selected.id,date,key,onResult]);
 return <section className="v1-wide" aria-label="Clearance readiness"><h3>Clearance readiness</h3>
  {error?<p role="alert">Readiness could not be verified. {error}</p>:!result?<p role="status">Checking current bank and customer evidence…</p>:<>
   <dl className="cheque-facts">{[['Status',result.status],['Cheque date',result.chequeDate],['Proposed clearance date',result.clearanceDate],['Receiving bank',result.bank?.name||'Not deposited'],['Verified bank opening',result.bankOpeningVerified?'Verified for this date':'Missing for this date'],['Customer receivable coverage','PKR '+result.receivable],['Full instrument amount','PKR '+result.amount],['Required approval',result.selfApprovalRequired?'Independent approver or administrator exceptional justification':'Explicit bank clearance approval']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   {result.blocker&&<p role="alert">{result.blocker.message||'Clearance is blocked. Review the proposed date, verified openings and current balances.'}</p>}
   <p>On successful clearance, customer receivable decreases by PKR {result.amount} and receiving bank balance increases by PKR {result.amount}. Posting independently rechecks current evidence and authorization.</p>
  </>}
 </section>;
}
