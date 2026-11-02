import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {HaftaBlocks,HaftaReport} from '../../management/src/HaftaReport.jsx';
import {weekRange,haftaWorkbook} from '../../management/src/haftaReportUtils.js';
import {workbook} from '../../management/src/simpleV1Export.js';
const block={partyId:'1',partyName:'Synthetic Client',partyKind:'CLIENT',classification:'Not recorded',rows:[{date:'2026-10-26',kind:'CHALLAN',reference:'TEST-1',description:'Historic '+('bottle description '.repeat(10)),quantity:'3',rate:'0.20',amount:'0.60'}],grossSales:'0.60',discounts:'0.06',returns:'0.18',total:'0.36',receipts:'10.00',receiptReversals:'10.00',openingEntries:'0.00',opening:'100.00',movement:'0.36',balance:'100.36',warnings:[]};
const report={from:'2026-10-26',to:'2026-11-01',blocks:[block,{...block,partyId:'2',partyName:'Unverified client',rows:[],opening:null,balance:null,warnings:['Opening balance is unverified.']}],sourceLimitations:['No dedicated advance or charge source.']};
beforeEach(()=>history.replaceState({},'','/management/reports?report=hafta&from=2026-10-26&to=2026-11-01'));
it('renders distinct bordered party blocks, long snapshots, exact amounts and visible unverified/empty states',()=>{
 const {container}=render(<HaftaBlocks report={report}/>);expect(container.querySelector('.hafta-grid').children).toHaveLength(2);expect(screen.getAllByAltText('Unique Plastic Industry')).toHaveLength(2);expect(screen.getByText(block.rows[0].description.trim())).toBeTruthy();expect(screen.getByText('No posted activity in this range.')).toBeTruthy();expect(screen.getByText('Opening balance is unverified.')).toBeTruthy();expect(screen.getAllByText('UNVERIFIED')).toHaveLength(2);expect(screen.getByText('100.36')).toBeTruthy();expect(screen.getByText('0.20')).toBeTruthy();
});
it('defaults Monday–Sunday including Pakistan-local Sunday/Monday boundary',()=>{expect(weekRange('2026-11-01')).toEqual({from:'2026-10-26',to:'2026-11-01'});expect(weekRange('2026-11-02')).toEqual({from:'2026-11-02',to:'2026-11-08'});});
it('uses read-only endpoint, persists dates and selected clients, searches, and invokes print',async()=>{
 const api=vi.fn().mockResolvedValue(report),print=vi.spyOn(window,'print').mockImplementation(()=>{});render(<HaftaReport api={api} clients={[{id:'1',name:'Alpha'},{id:'2',name:'Beta'}]}/>);
 await screen.findByText('100.36');expect(api.mock.calls.every(([p])=>p.startsWith('/simple-v1/hafta?'))).toBe(true);
 fireEvent.change(screen.getByLabelText('Week containing'),{target:{value:'2026-11-04'}});await waitFor(()=>expect(api.mock.calls.at(-1)[0]).toContain('from=2026-11-02&to=2026-11-08'));
 fireEvent.change(screen.getByLabelText('Clients'),{target:{value:'selected'}});await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Print / Save as PDF'}).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Search clients'),{target:{value:'beta'}});expect(screen.queryByLabelText('Alpha')).toBeNull();fireEvent.click(screen.getByLabelText('Beta'));await waitFor(()=>expect(api.mock.calls.at(-1)[0]).toContain('parties=2'));await screen.findByText('100.36');expect(location.search).toContain('parties=2');fireEvent.click(screen.getByRole('button',{name:'Print / Save as PDF'}));expect(print).toHaveBeenCalledOnce();print.mockRestore();
});
it('shows a readable endpoint error and no exportable stale report',async()=>{render(<HaftaReport api={vi.fn().mockRejectedValue(Error('Access denied'))} clients={[]}/>);expect(await screen.findByRole('alert')).toHaveProperty('textContent','Access denied');expect(screen.getByRole('button',{name:'Export Excel'}).disabled).toBe(true);});
it('exports each client as a labelled logical section with separate receipts, returns, warnings and exact strings',()=>{
 const w=haftaWorkbook(report);expect(w.rows.some(r=>r[0]==='Synthetic Client')).toBe(true);expect(w.rows.some(r=>r[3]==='Client receipts (not advances)'&&r[6]==='10.00')).toBe(true);expect(w.rows.some(r=>r[3]==='BALANCE'&&r[6]==='UNVERIFIED')).toBe(true);expect(w.rows.filter(r=>r[3]==='TOTAL · net weekly sales').map(r=>r[6])).toEqual(['0.36','0.36']);expect(workbook(w.columns,w.rows,w.metadata).size).toBeGreaterThan(1000);
});
it('renders no-clients empty state and A3 print class',()=>{const {container}=render(<HaftaBlocks report={{...report,blocks:[]}} paper="A3"/>);expect(screen.getByText('No clients match this selection.')).toBeTruthy();expect(container.querySelector('.paper-A3')).toBeTruthy();});
