import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {MoneyAccountField,MoneyDocumentEffect} from '../../management/src/MoneyDocumentEffect.jsx';
import {moneyEffect,documentMoneyAmount} from '../../management/src/moneyDocument.js';
import {SimpleV1} from '../../management/src/SimpleV1.jsx';
import {PaymentDocument} from '../../management/src/PaymentDocument.jsx';
const accounts=[{id:'71',name:'Haris',type:'CASH_HOLDER',verified:true,spendable:true,balance:'100.01'},{id:'92',name:'Junaid',type:'CASH_HOLDER',verified:false,spendable:true,balance:null},{id:'105',name:'UBL Official',type:'BANK',verified:true,spendable:true,balance:'15000.03'},{id:'201',name:'Cheques',type:'CHEQUE_CUSTODY',verified:true,spendable:false,balance:'9999.00'}];
const payment={kind:'CLIENT_PAYMENT',method:'CASH',moneyAccountId:'71',amount:'0.02'};
let calls;
beforeEach(()=>{calls=[];vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('requestAnimationFrame',fn=>fn());});
it('previews exact one-cent and large balances without Number arithmetic',()=>{
 expect(moneyEffect(payment,'0.02',accounts).result).toBe('100.03');
 expect(moneyEffect({...payment,kind:'VENDOR_PAYMENT'},'0.02',accounts).result).toBe('99.99');
 expect(moneyEffect({...payment,moneyAccountId:'105',method:'BANK_TRANSFER'},'9999999999999.99',accounts).result).toBe('10000000015000.02');
 expect(documentMoneyAmount({payload:{},lines:[{amount:'0.10'},{amount:'0.20'}]})).toBe('0.30');
});
it('explains missing, unverified, insufficient, custody and method mismatch choices',()=>{
 for(const [p,n,text] of [[{...payment,moneyAccountId:''},'1','Choose'],[{...payment,moneyAccountId:'92'},'1','unverified'],[{...payment,kind:'VENDOR_PAYMENT'},'101','Insufficient'],[{...payment,moneyAccountId:'201'},'1','custody'],[{...payment,moneyAccountId:'105'},'1','matching']])expect(moneyEffect(p,n,accounts).reason).toContain(text);
});
it('searches money choices and prevents choosing invalid holdings with visible reasons',()=>{
 const change=vi.fn();render(<MoneyAccountField payload={{kind:'VENDOR_PAYMENT',method:'CASH'}} amount="101.00" accounts={accounts} value="" onChange={change}/>);
 const combo=screen.getByRole('combobox',{name:'Money account *'});fireEvent.focus(combo);expect(screen.getByRole('option',{name:/Haris/}).getAttribute('aria-disabled')).toBe('true');fireEvent.click(screen.getByRole('option',{name:/Haris/}));expect(screen.getByRole('alert').textContent).toBe('Insufficient verified funds');expect(change).not.toHaveBeenCalled();
 fireEvent.change(combo,{target:{value:'UBL'}});expect(screen.getAllByRole('option')).toHaveLength(1);expect(screen.getByRole('option').textContent).toContain('15000.03 PKR available');
});
it('shows immutable movement link and explicit historic non-allocation',()=>{
 const d={id:'9',kind:'EXPENSE',status:'POSTED',moneyIntegrationEnabled:true,payload:{kind:'EXPENSE',method:'CASH',moneyAccountId:'71'},total:'10.00',moneyMovement:{id:'8',amount:'10.00',from_account_id:'71',to_account_id:null,accountName:'Haris'}};
 const {rerender}=render(<MoneyDocumentEffect detail={d} accounts={accounts}/>);expect(screen.getByRole('link',{name:'View corresponding money movement'}).getAttribute('href')).toContain('account=71');rerender(<MoneyDocumentEffect detail={{...d,moneyMovement:null}} accounts={accounts}/>);expect(screen.getByText(/no money-account allocation was inferred/)).toBeTruthy();
});
it('payment final confirmation includes account, exact effect and expected balance',()=>{
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false),command=vi.fn();render(<PaymentDocument detail={{id:'9',kind:'CLIENT_PAYMENT',status:'DRAFT',version:1,date:'2026-10-30',openingVerified:true,moneyIntegrationEnabled:true,payload:payment,party:{name:'Synthetic Client'},history:[]}} accounts={accounts} run={fn=>fn()} command={command} go={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Finalize entry'}));expect(confirm.mock.calls[0][0]).toContain('Receiving account: Haris · add PKR 0.02 · expected balance PKR 100.03');expect(command).not.toHaveBeenCalled();confirm.mockRestore();
});
function mockApi(){vi.stubGlobal('fetch',vi.fn(async(url,options={})=>{calls.push({url,...options});const p=url.replace('/api/v1/management','');let body={};if(p==='/session/current')body={user:{id:'1',displayName:'Synthetic Admin',roles:['administrator'],permissions:['portal.access']},csrfToken:'synthetic'};else if(p.endsWith('/state'))body={interfaceVersion:'simple-v1.2',state:'READY',moneyAccountsEnabled:true};else if(p.endsWith('/money'))body={accounts,reconciliation:{matched:true}};else if(p.endsWith('/items'))body={records:[{id:'1',code:'B1',description:'Synthetic bottle',active:1,verified:true,quantity:'10',selling_price:'5.00',version:1}]};else if(p.includes('/parties'))body={records:[{id:'1',name:'Synthetic party',active:1,opening_verified:1}]};else if(p.endsWith('/documents'))body=options.method==='POST'?{id:'88'}:{records:[]};else if(p.endsWith('/movements'))body={records:[]};return{ok:true,status:200,json:async()=>body};}));}
it('paid expense form requires searchable paying account and saves selection in the single document request',async()=>{
 mockApi();history.replaceState({},'','/management/expenses/new');render(<SimpleV1/>);await screen.findByRole('combobox',{name:'Money account *'});
 for(const [label,value] of [['Category','Transport'],['Description','Test transport'],['Amount · PKR','0.02'],['Payee','Carrier'],['Payment reference','TEST-EXPENSE']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.focus(screen.getByRole('combobox',{name:'Money account *'}));fireEvent.click(screen.getByRole('option',{name:/Haris/}));expect(screen.getByRole('status').textContent).toContain('expected balance PKR 99.99');fireEvent.click(screen.getByRole('button',{name:'Save expense draft'}));await waitFor(()=>expect(calls.some(c=>c.method==='POST'&&c.url.endsWith('/documents'))).toBe(true));
 const writes=calls.filter(c=>c.method==='POST');expect(writes).toHaveLength(1);expect(JSON.parse(writes[0].body)).toMatchObject({kind:'EXPENSE',moneyAccountId:'71',amount:'0.02'});
});
it('enabled customer form excludes cheques and requires a verified receiving account',async()=>{
 mockApi();history.replaceState({},'','/management/client-payments/new');render(<SimpleV1/>);const method=await screen.findByLabelText('Payment method');expect(within(method).queryByRole('option',{name:'Cheque received'})).toBeNull();expect(screen.getByRole('button',{name:'Save draft'}).disabled).toBe(true);fireEvent.change(screen.getByLabelText('Amount received'),{target:{value:'0.01'}});fireEvent.focus(screen.getByRole('combobox',{name:'Money account *'}));fireEvent.click(screen.getByRole('option',{name:/Haris/}));expect(screen.getByText(/expected balance PKR 100.02/)).toBeTruthy();
});
it('credit purchase does not expose a money effect until Paid immediately is selected',async()=>{
 mockApi();history.replaceState({},'','/management/stock-in/new?kind=PURCHASE');render(<SimpleV1/>);await screen.findByLabelText('Payment method');expect(screen.queryByRole('combobox',{name:'Money account *'})).toBeNull();fireEvent.click(screen.getByRole('checkbox',{name:/Paid immediately/}));expect(screen.getByRole('combobox',{name:'Money account *'})).toBeTruthy();
});
