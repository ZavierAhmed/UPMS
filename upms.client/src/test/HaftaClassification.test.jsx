import {act,fireEvent,render,renderHook,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {useProductionStock} from '../../management/src/productionWorkflow.js';
import {ProductionStockReview} from '../../management/src/ProductionReview.jsx';
import {LaborExpenseAllocation} from '../../management/src/LaborExpenseAllocation.jsx';
import {employeeHaftaWorkbook} from '../../management/src/employeeHaftaUtils.js';
import {workbook} from '../../management/src/simpleV1Export.js';

it('inline initialization requires current eligibility, separate authorization, explicit confirmation and a selected valid-range date',async()=>{
 const record={itemId:'1',status:'MISSING',initialZeroEligible:true};
 const api=vi.fn(async()=>({ready:false,records:[record]}));
 const {result}=renderHook(()=>useProductionStock(api,[{itemId:'1'}],'2026-11-03',true,null,'',true));
 await waitFor(()=>expect(result.current.state).not.toBeNull());
 expect(result.current.canFinalize(result.current.state)).toBe(false);
 act(()=>result.current.setInitial('1',{confirmed:true}));expect(result.current.canFinalize(result.current.state)).toBe(false);
 act(()=>result.current.setInitial('1',{date:'2026-11-04'}));expect(result.current.canFinalize(result.current.state)).toBe(false);
 act(()=>result.current.setInitial('1',{date:'2026-11-02'}));expect(result.current.canFinalize(result.current.state)).toBe(true);
 expect(result.current.initialFor(result.current.state)).toEqual([{itemId:'1',date:'2026-11-02',confirmed:true}]);
 expect(result.current.canFinalize({...result.current.state,records:[{...record,initialZeroEligible:false}]})).toBe(false);
});
it('an eligible server result cannot grant the missing inline-opening permission',async()=>{
 const api=vi.fn(async()=>({ready:false,records:[{itemId:'1',status:'MISSING',initialZeroEligible:true}]}));
 const {result}=renderHook(()=>useProductionStock(api,[{itemId:'1'}],'2026-11-03',true));
 await waitFor(()=>expect(result.current.state).not.toBeNull());act(()=>result.current.setInitial('1',{confirmed:true,date:'2026-11-02'}));
 expect(result.current.canFinalize(result.current.state)).toBe(false);
});
it('verified stock does not show a permanent opening warning',()=>{
 render(<ProductionStockReview review={{state:{ready:true},pending:false}} date="2026-11-03"/>);
 expect(screen.queryByText('Opening-stock verification')).toBeNull();
});
it('unsupported existing payments show the reason and cannot be submitted as labor',async()=>{
 const api=vi.fn(async()=>({records:[{expenseId:'7',employeeId:'2',employeeName:'Ahmed',sourceDate:'2026-11-01',amount:'1200.00',reference:'PAID-7',verifiedPayable:null,eligible:false,blockedReason:'Opening coverage is unverified'}]}));
 render(<LaborExpenseAllocation api={api} run={vi.fn()} go={vi.fn()} employeeId="2"/>);
 fireEvent.focus(screen.getByRole('combobox'));await screen.findByRole('option');fireEvent.click(screen.getByRole('option'));
 expect(screen.getByRole('alert').textContent).toContain('unverified');expect(screen.queryByLabelText('Effective classification date')).toBeNull();
 expect(api.mock.calls).toHaveLength(1);
});
it('Excel distinguishes direct payment and existing noncash allocation without inventing an additional cash row',()=>{
 const w=employeeHaftaWorkbook({from:'2026-11-03',to:'2026-11-03',blocks:[{names:['Ahmed'],verified:true,opening:'0.00',earned:'2000.00',paid:'1200.00',directPaid:'0.00',allocatedPaid:'1200.00',closing:'800.00',records:[{type:'EXPENSE_ALLOCATION',employeeName:'Ahmed',date:'2026-11-03',description:'Existing expense applied to Hafta (no new cash)',earned:'',paid:'1200.00'}]}]});
 expect(w.rows.find(r=>String(r[2]).startsWith('Closing payable / Amount owed'))[8]).toBe('800.00');
 expect(w.rows.find(r=>r[2]==='Direct Hafta payments')[8]).toBe('0.00');
 expect(w.rows.find(r=>r[2]==='Existing expenses applied to Hafta')[8]).toBe('1200.00');expect(w.rows.filter(r=>r[1]==='2026-11-03'&&r[6]==='1200.00')).toHaveLength(1);
});
it('downloaded labor money cells are numeric so Excel totals can use earned and paid amounts',async()=>{
 const file=workbook(['Employee','Labor Rate · PKR','Earned · PKR','Paid · PKR'],[['Ahmed','10.00','2000.00','1200.00']]);
 const bytes=await new Promise((done,fail)=>{const reader=new FileReader();reader.onload=()=>done(reader.result);reader.onerror=fail;reader.readAsArrayBuffer(file);});
 const xml=new TextDecoder().decode(bytes);
 for(const value of ['10.00','2000.00','1200.00'])expect(xml).toContain('<c><v>'+value+'</v></c>');
});
