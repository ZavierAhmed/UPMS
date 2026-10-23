import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {Returns} from '../../management/src/Returns.jsx';
import {returnRemainder,returnable} from '../../management/src/returnAmounts.js';
afterEach(cleanup);
const user={permissions:['returns.read','returns.request.create','returns.request.post']},api=()=>vi.fn(async p=>p==='/returns/configuration'?{policy:null}:{records:[]});
it('distinguishes physical receipt from financial credit and blocks real activation',async()=>{render(<Returns api={api()} user={user}/>);await screen.findByText('Return requests, physical receipt and inspection history');expect(screen.getByText(/Financial credit not processed/)).toBeTruthy();expect(screen.getByText(/Real activation remains blocked/)).toBeTruthy();expect(screen.queryByRole('button',{name:'Approve exact return disposition'})).toBeNull();});
it('requires an explicit posted source line before drafting a return',async()=>{render(<Returns api={api()} user={user}/>);await screen.findByText('Return requests, physical receipt and inspection history');fireEvent.click(screen.getByRole('button',{name:'New customer return request'}));expect(screen.getByLabelText('Original dispatched line').value).toBe('');expect(screen.getByRole('button',{name:'Save physical return for review'}).disabled).toBe(true);});
it('previews exact partial disposition and returnable quantity without floating point',()=>{expect(returnRemainder('100','70','30')).toEqual({remaining:'0.000000',valid:true});expect(returnRemainder('0.000003','0.000001','0.000001')).toEqual({remaining:'0.000001',valid:true});expect(returnRemainder('10','11','0').valid).toBe(false);expect(returnable('1000','500')).toBe('500.000000');});
