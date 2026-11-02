export const needsMoney=p=>['CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE'].includes(p.kind)||(p.kind==='PURCHASE'&&p.paidImmediately);
export const cents=s=>/^\d{1,14}(?:\.\d{1,2})?$/.test(String(s))?BigInt(String(s).split('.')[0])*100n+BigInt((String(s).split('.')[1]||'').padEnd(2,'0')):null;
const money=n=>(n<0n?'-':'')+String((n<0n?-n:n)/100n)+'.'+String((n<0n?-n:n)%100n).padStart(2,'0');
export function moneyEffect(p,amount,accounts=[]){
 const a=accounts.find(a=>String(a.id)===String(p.moneyAccountId)),n=cents(amount),balance=a?.verified?cents(a.balance):null,credit=p.kind==='CLIENT_PAYMENT';
 const reason=!needsMoney(p)?'No immediate money movement for this document.':p.method==='CHEQUE_RECEIVED'||p.kind==='PAYMENT_REVERSAL'?'Cheque posting is unavailable until P3.2C.':!a?'Choose a verified receiving or paying account.':!a.verified||balance===null?'Opening is unverified; no balance is assumed.':!a.spendable||a.type!==(p.method==='CASH'?'CASH_HOLDER':'BANK')?'Choose a matching cash holder or bank; cheque custody is not spendable.':n===null||n<=0n?'Enter a valid positive amount.':!credit&&balance<n?'Insufficient verified funds.':'';
 return {account:a,blocked:Boolean(reason),reason,text:reason||`${credit?'Receiving':'Paying'} account: ${a.name} · ${credit?'add':'deduct'} PKR ${money(n)} · expected balance PKR ${money(credit?balance+n:balance-n)}.`,result:!reason?money(credit?balance+n:balance-n):null};
}

export function documentMoneyAmount(d){return d.lines?.length?money(d.lines.reduce((n,l)=>n+(cents(l.amount)||0n),0n)):d.payload.amount;}
