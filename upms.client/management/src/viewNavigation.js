// View state only. Business commands and document relationships are unchanged.
export function readViewFilters(keys,search=location.search){
 const params=new URLSearchParams(search);
 return Object.fromEntries(keys.map(key=>[key,params.get(key)||'']));
}
export function rememberViewFilters(values,{merge=false}={}){
 const params=new URLSearchParams(merge?location.search:'');
 for(const [key,value] of Object.entries(values))if(value)params.set(key,value);else params.delete(key);
 history.replaceState(history.state,'',location.pathname+(params.size?'?'+params:''));
}
export function navigationParent(target,source,state={}){
 if(target.startsWith('/management/items/')&&source.startsWith('/management/items'))return /^\/management\/items(?:\?|$)/.test(source)?source:(state?.returnTo||'/management/items');
 if(target.startsWith('/management/documents/'))return source;
 if(target.startsWith('/management/cheques?')){
  if(source.split('?')[0]!=='/management/cheques')return '/management/cheques';
  const params=new URLSearchParams(source.split('?')[1]);
  return params.has('id')||params.has('new')?returnList('/management/cheques',state):source;
 }
}
export function navigationState(target,source,current){
 const previous=current||{};
 if(previous.returnTo===target)return {...(previous.returnState||{}),v1:true};
 const returnTo=navigationParent(target,source,previous);
 return {v1:true,...(returnTo?{returnTo,returnState:returnTo===previous.returnTo?(previous.returnState||{}):previous}:{})};
}
export function returnList(fallback,state=history.state){
 return typeof state?.returnTo==='string'&&/^\/management(?:[/?]|$)/.test(state.returnTo)?state.returnTo:fallback;
}
export function workspaceForDocument(kind){
 return {CHALLAN:'challans',CHALLAN_RETURN:'challan-returns',PRODUCTION:'stock-in',PURCHASE:'stock-in',STOCK_OPENING:'stock-in',STOCK_CORRECTION:'stock-in',CLIENT_PAYMENT:'client-payments',CLIENT_OPENING:'client-payments',VENDOR_PAYMENT:'vendor-payments',VENDOR_OPENING:'vendor-payments',EXPENSE:'expenses',FINANCIAL_REFUND:'company-transactions'}[kind];
}
