import {render,screen,fireEvent,act} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {ReturnForm,ReturnDetail} from '../../management/src/ChallanReturn.jsx';
import {EntryErrors} from '../../management/src/entryErrors.js';
const source={id:'1',party_id:'2',official_number:'DC-0001',date:'2026-10-24',party:{name:'Synthetic Client'},returnableLines:[{id:'3',item_id:'4',quantity:'500',returned:'150',remaining:'350',rate:'25.00',snapshot:{code:'ITM-0001',description:'Bottle',quality:'Virgin',colour:'White',packing:'Carton'}}]};
it('shows original quantities and submits selected original lines with historical rate',async()=>{
 const command=vi.fn().mockResolvedValue({id:'5'}),go=vi.fn(),onSaved=vi.fn();render(<ReturnForm source={source} command={command} go={go} onSaved={onSaved} run={fn=>fn()}/>);
 expect(screen.getByText('350')).toBeTruthy();expect(screen.getByText('150')).toBeTruthy();fireEvent.change(screen.getByLabelText('Return ITM-0001'),{target:{value:'100'}});fireEvent.change(screen.getByLabelText('Return reason'),{target:{value:'Accepted resalable'}});
 await act(async()=>fireEvent.submit(screen.getByRole('button',{name:'Save Draft'}).closest('form')));
 expect(command.mock.calls[0][2].lines).toEqual([{originalLineId:'3',itemId:'4',quantity:'100',rate:'25.00'}]);expect(onSaved).toHaveBeenCalledOnce();expect(go).toHaveBeenCalledWith('/management/documents/5');
});
it('shows transaction validation errors beside the relevant line input',()=>{render(<EntryErrors.Provider value={{'lines.0.quantity':'Only 350 bottles remain returnable.'}}><ReturnForm source={source}/></EntryErrors.Provider>);expect(screen.getByRole('alert').textContent).toContain('350');});
it('posted return removes mutation actions and keeps credit inside a no-print container',()=>{
 const detail={id:'5',status:'POSTED',date:'2026-10-26',official_number:'DCR-0005',total:'2500.00',party:{name:'Synthetic Client'},payload:{originalId:'1',originalReference:'DC-0001',reason:'Accepted resalable'},lines:[]};
 render(<ReturnDetail detail={detail} Table={()=>null} SummaryCards={()=> <span>Client credit</span>}/>);expect(screen.queryByRole('button',{name:'Finalize'})).toBeNull();expect(screen.getByRole('button',{name:'Print Return Acknowledgment'})).toBeTruthy();expect(screen.getByText('Client credit').closest('.no-print')).toBeTruthy();
});
