import {it,expect} from 'vitest';
import {navigationParent,navigationState,returnList,readViewFilters,rememberViewFilters,workspaceForDocument} from '../../management/src/viewNavigation.js';
it('retains filtered query values without adding a history entry for every keystroke',()=>{
 history.replaceState({v1:true},'','/management/cheques');const length=history.length;
 rememberViewFilters({reference:'CH & 100',status:'DEPOSITED',from:''});
 expect(readViewFilters(['reference','status','from'])).toEqual({reference:'CH & 100',status:'DEPOSITED',from:''});
 expect(history.length).toBe(length);expect(history.state.v1).toBe(true);
});
it('returns a new cheque to its filtered register rather than its completed entry form',()=>{
 const list='/management/cheques?status=DEPOSITED&reference=TEST';
 expect(navigationParent('/management/cheques?new=1',list,{})).toBe(list);
 expect(navigationParent('/management/cheques?id=9','/management/cheques?new=1',{returnTo:list})).toBe(list);
 expect(returnList('/management/cheques',{returnTo:'https://foreign.example/'})).toBe('/management/cheques');
 const detail=navigationState('/management/cheques?id=9',list,{}),receipt=navigationState('/management/documents/2','/management/cheques?id=9',detail),restored=navigationState('/management/cheques?id=9','/management/documents/2',receipt);
 expect(restored.returnTo).toBe(list);expect(navigationState(list,'/management/cheques?id=9',restored).returnTo).toBeUndefined();
});
it('preserves document entry context from company transactions and original item search behavior',()=>{
 expect(navigationParent('/management/documents/8','/management/company-transactions?reference=TEST')).toBe('/management/company-transactions?reference=TEST');
 expect(navigationParent('/management/items/8/edit','/management/items/8',{returnTo:'/management/items?q=blue'})).toBe('/management/items?q=blue');
});
it('indicates the business workspace of a document detail without changing its identity',()=>{
 expect(workspaceForDocument('CHALLAN')).toBe('challans');expect(workspaceForDocument('CLIENT_PAYMENT')).toBe('client-payments');expect(workspaceForDocument('PRODUCTION')).toBe('stock-in');expect(workspaceForDocument('UNKNOWN')).toBeUndefined();
});
