import {useState} from 'react';
import {SearchableEntitySelect} from './SearchableEntitySelect.jsx';

import {needsMoney,moneyEffect,documentMoneyAmount,cents} from './moneyDocument.js';
export function MoneyAccountField({payload,amount,accounts=[],value,onChange,error}){
 const [message,setMessage]=useState('');
 if(!needsMoney(payload))return null;
 const effect=moneyEffect({...payload,moneyAccountId:value},amount,accounts);
 const reason=a=>!a.verified?'Opening unverified':!a.spendable?'Cheque custody is not spendable':a.type!==(payload.method==='CASH'?'CASH_HOLDER':'BANK')?'Payment method requires a different account type':payload.kind!=='CLIENT_PAYMENT'&&cents(amount)!==null&&cents(a.balance)!==null&&cents(a.balance)<cents(amount)?'Insufficient verified funds':'';
 return <fieldset className="money-document-effect"><legend>{payload.kind==='CLIENT_PAYMENT'?'Account receiving the money':'Account paying the money'}</legend><SearchableEntitySelect label="Money account" name="moneyAccountId" required records={accounts} value={value} onChange={id=>{setMessage('');onChange(id);}} disabledIds={accounts.filter(a=>reason(a)).map(a=>a.id)} disabledReason={reason} onRejected={a=>setMessage(reason(a))} formatLabel={a=>`${a.name} · ${a.type==='BANK'?'Bank':a.type==='CHEQUE_CUSTODY'?'Cheque custody':'Cash holder'} · ${a.verified?a.balance+' PKR available':'Unverified'}`} error={error}/><p role="status">{effect.text}</p>{message&&<p role="alert">{message}</p>}<p>The business document and its money movement post together. Current funds are checked again on posting.</p></fieldset>;
}
export function MoneyDocumentEffect({detail,accounts=[]}){
 if(!detail.moneyIntegrationEnabled)return null;
 if(detail.moneyMovementRedacted)return <p>Money-account detail access is not granted.</p>;
 const p=detail.payload,m=detail.moneyMovement,effect=moneyEffect(p,detail.status==='POSTED'?detail.total:documentMoneyAmount(detail),accounts);
 if(m)return <section className="money-document-effect"><h3>Linked money movement</h3><p>{m.accountName} · PKR {m.amount} · MA-{String(m.id).padStart(6,'0')}</p><a href={'/management/money-accounts?view=statement&account='+(m.from_account_id||m.to_account_id)}>View corresponding money movement</a></section>;
 if(detail.status==='POSTED')return <p>Historical document: no money-account allocation was inferred or backfilled.</p>;
 if(!needsMoney(p))return null;
 return <section className="money-document-effect"><h3>Money effect on finalization</h3><p>{effect.text}</p><p>Associated {detail.kind.replaceAll('_',' ').toLowerCase()} · Draft {detail.id} · {detail.party?.name||p.payee||p.reference}</p></section>;
}
