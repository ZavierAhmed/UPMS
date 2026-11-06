import {render,screen,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {SimpleV1} from '../../management/src/SimpleV1.jsx';
afterEach(()=>vi.unstubAllGlobals());
for(const matched of [true,false])it(`shows actionable integrity evidence when projection matched is ${matched}`,async()=>{
 window.history.replaceState({},'', '/management/settings');vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const fetch=vi.fn(async url=>({ok:true,status:200,json:async()=>url.endsWith('/session/current')?{user:{displayName:'Synthetic operator'},csrfToken:'fixture'}:url.endsWith('/state')?{interfaceVersion:'simple-v1.2'}:url.endsWith('/reconciliation')?{matched,reviewRequired:true,integrityFindings:[{code:'COMMAND_COVERAGE_UNVERIFIABLE',entity:'document',id:'12',severity:'warning',message:'Historical/import provenance requires review.'}]}:{records:[]}}));vi.stubGlobal('fetch',fetch);
 render(<SimpleV1/>);fireEvent.click(await screen.findByRole('button',{name:'Check reconciliation'}));await screen.findByText(/COMMAND_COVERAGE_UNVERIFIABLE document\/12/);expect(screen.getByRole('alert').textContent).toContain('Original command authenticity is not verified.');expect(fetch.mock.calls.every(([,opts])=>opts.method==='GET')).toBe(true);
});

it('stops the workspace read sequence and shows the reference when readiness fails', async () => {
 window.history.replaceState({}, '', '/management/settings');
 vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
 const reference = 'c3c12a90-d209-4f31-9c1e-e5068b1b0066';
 const fetch = vi.fn(async url => url.endsWith('/session/current')
   ? { ok: true, status: 200, json: async () => ({ user: { displayName: 'Synthetic operator' }, csrfToken: 'fixture' }) }
   : { ok: false, status: 503, headers: new Headers({ 'X-Request-ID': reference }),
     json: async () => ({ error: { code: 'IDENTITY_UNAVAILABLE' } }) });
 vi.stubGlobal('fetch', fetch);

 render(<SimpleV1 />);

 expect((await screen.findByRole('alert')).textContent).toContain('This request could not be completed.');
 expect(screen.getByText(reference).textContent).toBe(reference);
 expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
   ['/api/v1/management/session/current', 'GET'],
   ['/api/v1/management/simple-v1/state', 'GET'],
 ]);
});
