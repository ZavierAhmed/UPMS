import {render,screen,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {SimpleV1} from '../../management/src/SimpleV1.jsx';
afterEach(()=>vi.unstubAllGlobals());
for(const status of ['DRAFT','POSTED'])it(`prints an accurate ${status} expense heading without a mutation`,async()=>{
 window.history.replaceState({},'', '/management/documents/12');
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const print=vi.spyOn(window,'print').mockImplementation(()=>{});
 const detail={id:'12',kind:'EXPENSE',status,date:'2026-10-28',version:1,total:'12.34',official_number:null,lines:[],history:[],payload:{amount:'12.34',category:'Utilities',payee:'Synthetic payee',description:'Synthetic electricity',reference:'PHP7',method:'CASH'}};
 const fetch=vi.fn(async url=>({ok:true,status:200,json:async()=>url.endsWith('/session/current')?{user:{displayName:'Synthetic operator'},csrfToken:'fixture'}:url.endsWith('/state')?{interfaceVersion:'simple-v1.2'}:url.endsWith('/documents/12')?detail:{records:[]}}));vi.stubGlobal('fetch',fetch);
 render(<SimpleV1/>);expect(await screen.findByRole('heading',{level:2,name:status==='POSTED'?'Expense 12':'Draft 12'})).toBeTruthy();
 if(status==='POSTED'){fireEvent.click(screen.getByRole('button',{name:'Print',exact:true}));expect(print).toHaveBeenCalledOnce();expect(screen.queryByRole('heading',{name:'Draft 12'})).toBeNull();}
 expect(fetch.mock.calls.every(([,options])=>options.method==='GET')).toBe(true);print.mockRestore();
});
