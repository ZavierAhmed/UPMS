import {useState} from 'react';
import {Icon} from './Icons.jsx';

const groups=[
 ['Overview',['']],
 ['Stock & deliveries',['items','stock-in','challans','challan-returns']],
 ['Customers & suppliers',['clients','vendors','client-payments','vendor-payments','cheques']],
 ['Money & people',['money-accounts','employee-hafta','employees','expenses']],
 ['Reports & administration',['ledgers','reports','company-transactions','expense-reports','expense-categories','settings']],
];

// Callers supply only the entries already permitted by their existing policy.
export function WorkspaceNavigation({items,page,onNavigate}){
 const [query,setQuery]=useState('');
 const filtered=items.filter(([,label])=>label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <nav aria-label="Bottle management">
  <label className="workspace-nav-search">Find a workspace<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Items, payments, reports…"/></label>
  {groups.map(([title,keys])=>{
   const entries=filtered.filter(([key])=>keys.includes(key));
   return entries.length>0&&<div className="nav-group" key={title}><p>{title}</p>{entries.map(([key,label,icon])=><button key={key} aria-current={page===key?'page':undefined} onClick={()=>onNavigate(key)}><Icon name={icon}/><span>{label}</span></button>)}</div>;
  })}
  {!filtered.length&&<p role="status" className="workspace-nav-empty">No matching workspace. Try another name.</p>}
 </nav>;
}
