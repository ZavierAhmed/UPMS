import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {SimpleV1} from '../../management/src/SimpleV1.jsx';
const item={id:'1',code:'ITM-0001',description:'Existing bottle',quality:'HDPE',colour:'',packing:'',selling_price:'25.00',active:1,verified:0,quantity:'0',version:3};
let calls;
beforeEach(()=>{
 calls=[];
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('requestAnimationFrame',fn=>fn());
 vi.stubGlobal('fetch',vi.fn(async(url,options={})=>{
  calls.push({url,...options});const path=url.replace('/api/v1/management','');let body={};
  if(path==='/session/current')body={user:{id:'1',displayName:'Synthetic Admin',roles:['administrator'],permissions:['portal.access']},csrfToken:'synthetic'};
  else if(path==='/simple-v1/state')body={interfaceVersion:'simple-v1.2',state:'READY'};
  else if(path==='/simple-v1/items')body=options.method==='POST'?{id:'2',code:'ITM-0002'}:{records:[item]};
  else if(path.startsWith('/simple-v1/items/')&&options.method==='PATCH')body={id:'1',code:item.code};
  else if(['/simple-v1/documents','/simple-v1/movements'].includes(path)||path.startsWith('/simple-v1/parties'))body={records:[]};
  return {ok:true,status:200,json:async()=>body};
 }));
});
it('creates an item with Item Name only; optional values stay blank and price is unset',async()=>{
 history.replaceState({returnTo:'/management/items?q=bottle'},'','/management/items/new');render(<SimpleV1/>);
 const name=await screen.findByLabelText('Item Name');expect(name.required).toBe(true);for(const label of ['Quality (optional)','Colour (optional)','Packing (optional)'])expect(screen.getByLabelText(label).required).toBe(false);
 fireEvent.change(name,{target:{value:'New bottle'}});fireEvent.click(screen.getByRole('button',{name:'Save Item'}));
 await waitFor(()=>expect(calls.some(c=>c.method==='POST'&&c.url.endsWith('/items'))).toBe(true));const body=JSON.parse(calls.find(c=>c.method==='POST'&&c.url.endsWith('/items')).body);expect(body).toMatchObject({description:'New bottle',quality:'',colour:'',packing:'',sellingPrice:null});expect(body.code).toBeUndefined();
});
it('preserves saved price and code when editing, with optimistic version metadata',async()=>{
 history.replaceState({returnTo:'/management/items?q=bottle'},'','/management/items/1/edit');render(<SimpleV1/>);
 const name=await screen.findByLabelText('Item Name');expect(screen.getByDisplayValue('ITM-0001').readOnly).toBe(true);expect(screen.getByLabelText('Selling Price (PKR / bottle)').value).toBe('25.00');fireEvent.change(name,{target:{value:'Revised bottle'}});fireEvent.click(screen.getByRole('button',{name:'Save Item'}));await waitFor(()=>expect(calls.some(c=>c.method==='PATCH')).toBe(true));expect(JSON.parse(calls.find(c=>c.method==='PATCH').body)).toMatchObject({sellingPrice:'25.00',code:'ITM-0001',version:3});
});
it('Back retains list search and does not silently discard unsaved item edits',async()=>{
 history.replaceState({returnTo:'/management/items?q=bottle'},'','/management/items/1/edit');const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);render(<SimpleV1/>);fireEvent.change(await screen.findByLabelText('Item Name'),{target:{value:'Unsaved bottle'}});fireEvent.click(screen.getByRole('button',{name:'Back to items'}));expect(confirm).toHaveBeenCalledOnce();expect(location.pathname).toBe('/management/items/1/edit');confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Back to items'}));await screen.findByLabelText('Search');expect(location.search).toBe('?q=bottle');expect(screen.getByLabelText('Search').value).toBe('bottle');confirm.mockRestore();
});
