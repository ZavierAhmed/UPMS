import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { afterEach,describe,it,expect,vi } from 'vitest';
import { BusinessMasters } from '../../management/src/BusinessMasters.jsx';
afterEach(cleanup);
describe('business master workspace',()=>{
  it('creates an exact-scale unit with an idempotency key and a required reason',async()=>{
    const api=vi.fn(async(path,method)=>path==='/business/resources'?{resources:[{code:'units',label:'Measurement units',kind:'unit',canWrite:true}]}:method==='POST'?{key:'1',version:1}:{records:[]});
    render(<BusinessMasters api={api} user={{permissions:['masters.inventory.read']}}/>);
    await screen.findByRole('heading',{name:'Measurement units'});
    fireEvent.change(screen.getByLabelText('Code'),{target:{value:'PCS'}});fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Pieces'}});
    fireEvent.change(screen.getByLabelText('Reason for this change'),{target:{value:'Approved canonical unit'}});fireEvent.click(screen.getByRole('button',{name:'Save master record'}));
    await waitFor(()=>expect(api).toHaveBeenCalledWith('/business/masters/units','POST',expect.objectContaining({code:'PCS',scale:0,active:true,reason:'Approved canonical unit'}),undefined,expect.any(String)));
    expect(screen.queryByLabelText(/opening balance/i)).toBeNull();
  });
  it('renders only permitted read-only customer contacts without financial account controls',async()=>{
    const api=vi.fn(async path=>path==='/business/resources'?{resources:[{code:'customers',label:'Customers',kind:'party',canWrite:false}]}:{records:[{id:'1',code:'C1',name:'Synthetic customer',active:true,phone:'Synthetic contact'}]});
    render(<BusinessMasters api={api} user={{permissions:['masters.customers.read']}}/>);
    await screen.findByText('Synthetic customer');expect(screen.queryByRole('button',{name:'Save master record'})).toBeNull();expect(screen.queryByRole('option',{name:'Money accounts'})).toBeNull();
    expect(screen.getByText('Synthetic contact')).toBeTruthy();
  });
  it('retains references by editing status and making an existing code read-only',async()=>{
    const api=vi.fn(async path=>path==='/business/resources'?{resources:[{code:'units',label:'Measurement units',kind:'unit',canWrite:true}]}:{records:[{id:'1',code:'PCS',name:'Pieces',active:true,version:2,scale:0}]});
    render(<BusinessMasters api={api} user={{permissions:['masters.inventory.read']}}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Edit PCS'}));expect(screen.getByLabelText('Code').readOnly).toBe(true);
    expect(screen.getByRole('checkbox',{name:'Active'}).checked).toBe(true);expect(screen.queryByRole('button',{name:/delete/i})).toBeNull();
  });
});
