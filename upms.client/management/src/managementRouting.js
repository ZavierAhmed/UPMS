import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';

// All browser-history writes and route definitions live here. History contains UI
// paths/opaque IDs only; draft fields and filters stay in authenticated memory.
export const RoutingContext=createContext(false);
export const routePermissions={home:null,inventory:'inventory.read',purchases:'purchases.read',sales:'sales.challans.read',customers:'customers.ledger.read',receipts:'customers.receipts.read',cheques:'cheques.read',returns:'returns.read',credits:'credits.read',expenses:'expenses.read',masters:'masters.inventory.read',users:'users.read',audit:'audit.read',profile:null};
const views={inventory:['overview','documents','history','reconcile','configuration'],purchases:['documents','vendors','money','reconciliation'],sales:['documents','customers','reconciliation','configuration'],receipts:['reconciliation'],cheques:['reconciliation'],returns:['reconciliation'],credits:['reconciliation'],expenses:['reconciliation']};
let origin='external',serial=0;
const listeners=new Set(),remembered=new Map(),unsaved=new Map();
const emit=()=>{serial++;for(const fn of listeners)fn();};
const pop=()=>{origin='external';emit();};
const subscribe=fn=>{if(!listeners.size)window.addEventListener('popstate',pop);listeners.add(fn);return()=>{listeners.delete(fn);if(!listeners.size)window.removeEventListener('popstate',pop);};};
const snapshot=()=>window.location.pathname+window.location.search+'|'+serial;
export function parseManagementPath(path){const raw=path.split('?')[0].replace(/\/$/,'')||'/management',parts=raw.split('/').filter(Boolean);if(raw==='/'||raw==='/management')return {workspace:'home',view:'',path:'/management'};if(parts[0]!=='management'||!Object.hasOwn(routePermissions,parts[1]))return {workspace:'notfound',path:raw};const workspace=parts[1],tail=parts.slice(2);if(!tail.length)return {workspace,view:workspace==='customers'?'customers':'',path:raw};if(workspace==='returns'&&tail[0]==='new'&&tail.length===2&&['receipt','inspection'].includes(tail[1]))return {workspace,view:'new',draftKind:tail[1],path:raw};if(tail.length===1&&tail[0]==='new'&&views[workspace])return {workspace,view:'new',path:raw};if(workspace==='cheques'&&tail[0]==='drafts'&&tail.length===2&&/^\d+$/.test(tail[1]))return {workspace,draftId:tail[1],view:'draft',path:raw};if(views[workspace]&&tail[0]==='documents'&&/^\d+$/.test(tail[1]||'')&&(tail.length===2||tail.length===3&&tail[2]==='history'))return {workspace,documentId:tail[1],view:tail[2]||'detail',path:raw};if(tail.length===1&&views[workspace]?.includes(tail[0]))return {workspace,view:tail[0],path:raw};return {workspace:'notfound',path:raw};}
export function useManagementRoute(){useSyncExternalStore(subscribe,snapshot,()=>'/management|0');return {...parseManagementPath(window.location.pathname),origin};}
export function navigatePath(path,{replace=false,source='shell'}={}){const route=parseManagementPath(path);if(route.workspace==='notfound'&&!path.startsWith('/management/'))throw Error('Only private management routes are supported');const current=window.location.pathname+window.location.search;if(current===path)return;origin=source;window.history[replace?'replaceState':'pushState']({upms:true},'',path);remembered.set(route.workspace,path);emit();}
export function workspacePath(workspace){if(workspace==='home')return '/management';return remembered.get(workspace)||'/management/'+workspace;}
export function clearManagementMemory(){remembered.clear();unsaved.clear();}

// Bridge the existing tested business forms to URL-backed list/draft/detail views.
// It restores reads/local state only. It never invokes a save/approve/post command.
export function useWorkspaceRoute({workspace,detail,draft,view='',defaultView='',setDetail,setDraft,setView,open,onNew,onView,onReset,cancelOpen,loadDraft,ready=true,setMessage}){
 const baseline=useRef({key:null,signature:null}),dirty=useRef(false);
 const enabled=useContext(RoutingContext),route=useManagementRoute(),memory=useRef({path:null,ui:null,applying:false,cache:new Map(),generation:0}),[problem,setProblem]=useState(''),[,refreshRouting]=useState(0);
 useEffect(()=>{const key=draft?.id?String(draft.id)+':'+draft.version:null,signature=JSON.stringify(draft);if(key&&baseline.current.key!==key)baseline.current={key,signature};dirty.current=Boolean(draft)&&(!key||signature!==baseline.current.signature);unsaved.set(workspace,dirty.current||[...memory.current.cache.values()].some(s=>s.dirty));return()=>unsaved.delete(workspace);});
 const mode=draft?(draft.id&&loadDraft?'drafts/'+draft.id:workspace==='returns'&&draft.kind!=='REQUEST'?'new/'+draft.kind.toLowerCase():'new'):detail?'documents/'+(detail.id||detail.receipt_id):view&&view!==defaultView?view:'';
 useEffect(()=>{if(!enabled)return;const warn=e=>{if(!dirty.current&&![...memory.current.cache.values()].some(s=>s.dirty))return;e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[enabled]);
 useEffect(()=>{
  if(!enabled||!([workspace,...(workspace==='sales'?['customers']:[])].includes(route.workspace)))return;
  const m=memory.current;
  if(m.path!==route.path){
   if(m.path&&/\/new(?:\/(?:receipt|inspection))?$/.test(m.path))m.cache.set(m.path,{draft,dirty:dirty.current});
   m.path=route.path;m.ui=mode;remembered.set(route.workspace,route.path);
   if(route.origin==='view:'+workspace)return;
   cancelOpen?.();const saved=m.cache.get(route.path);m.applying=true;const generation=++m.generation;
   const finish=()=>{if(generation!==m.generation)return;m.applying=false;m.ui=route.draftId?'drafts/'+route.draftId:route.documentId?'documents/'+route.documentId:route.view==='new'?'new'+(route.draftKind?'/'+route.draftKind:''):route.view||'';refreshRouting(n=>n+1);};
   Promise.resolve().then(async()=>{
    setProblem('');
    if(route.draftId&&loadDraft){await loadDraft(route.draftId);}
    else if(route.documentId){await open(route.documentId);if(route.view==='history')requestAnimationFrame(()=>[...document.querySelectorAll('.module-view:not([hidden]) h3')].find(h=>/audit|history|timeline/i.test(h.textContent))?.scrollIntoView({block:'start'}));}
    else if(route.view==='new'){if(saved?.draft){setDetail(null);setDraft(saved.draft);}else if(route.draftKind){setDetail(null);setDraft(null);setMessage?.('Open the posted source return and choose Receive or Inspect to start this draft.');}else if(ready&&onNew){onNew();}else{m.path=null;m.applying=false;return;}}
    else{setDetail(null);setDraft(null);onReset?.();const next=route.workspace==='customers'?'customers':route.view||defaultView;if(onView)await onView(next);else setView?.(next);}
    finish();
   }).catch(error=>{m.applying=false;m.ui=mode;setProblem(error.message||'This view could not be loaded.');setMessage?.(error.message);});
   return;
  }
  if(m.applying)return;
  if(/\/new(?:\/(?:receipt|inspection))?$/.test(route.path))m.cache.set(route.path,{draft,dirty:dirty.current});else m.cache.delete(route.path);
  if(m.ui!==mode){const wasDraft=m.ui?.startsWith('new');if(wasDraft&&(detail||draft?.id))m.cache.delete(route.path);m.ui=mode;const next='/management/'+workspace+(mode?'/'+mode:'');navigatePath(next,{source:'view:'+workspace,replace:wasDraft&&Boolean(detail||draft?.id)});}
 });
 return problem;
}

export function confirmDraftReplacement(draft){return !draft||window.confirm('Replace this unsaved draft? Choose Cancel to keep your current entries.');}

export function routePermission(route){if(route.workspace==='returns'&&route.draftKind)return route.draftKind==='receipt'?'returns.receive':'returns.inspect';if(route.view==='new')return ({inventory:'inventory.drafts.create',purchases:'purchases.draft',sales:'sales.challans.create',receipts:'customers.receipts.create',cheques:'cheques.receive',returns:'returns.request.create',credits:'credits.create',expenses:'expenses.create'})[route.workspace];if(route.view==='configuration')return route.workspace+'.configure';if(route.view==='customers'||route.workspace==='customers')return 'customers.ledger.read';if(route.view==='vendors')return 'vendors.ledger.read';if(route.view==='money')return 'money.accounts.read';if(['reconciliation','reconcile'].includes(route.view))return ({inventory:'inventory.read',purchases:'money.audit.read',sales:'sales.reconcile.read',receipts:'customers.reconcile.read',cheques:'cheques.reconcile.read',returns:'returns.reconcile.read',credits:'credits.reconcile.read',expenses:'expenses.reconcile.read'})[route.workspace];return routePermissions[route.workspace];}

export function hasUnsavedDrafts(){return [...unsaved.values()].some(Boolean);}
