import {render,screen,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {SimpleV1} from '../../management/src/SimpleV1.jsx';
afterEach(()=>vi.unstubAllGlobals());
for(const matched of [true,false])it(`shows actionable integrity evidence when projection matched is ${matched}`,async()=>{
 window.history.replaceState({},'', '/management/settings');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const fetch=vi.fn(async url=>({ok:true,status:200,json:async()=>url.endsWith('/session/current')?{user:{displayName:'Synthetic operator'},csrfToken:'fixture'}:url.endsWith('/state')?{interfaceVersion:'simple-v1.2'}:url.endsWith('/reconciliation')?{matched,reviewRequired:true,integrityFindings:[{code:'COMMAND_COVERAGE_UNVERIFIABLE',entity:'document',id:'12',severity:'warning',message:'Historical/import provenance requires review.'}]}:{records:[]}}));vi.stubGlobal('fetch',fetch);
 render(<SimpleV1/>);fireEvent.click(await screen.findByRole('button',{name:'Check reconciliation'}));await screen.findByText(/COMMAND_COVERAGE_UNVERIFIABLE document\/12/);expect(screen.getByRole('alert').textContent).toContain('Original command authenticity is not verified.');expect(fetch.mock.calls.every(([,opts])=>opts.method==='GET')).toBe(true);
});
