import {useId,useMemo,useState} from 'react';

const entityLabel = r => r.code
  ? `${r.code} — ${r.description} — ${r.quality} — ${r.colour} — ${r.packing}`
  : `${r.name}${r.kind ? ' · '+r.kind : ''}`;

// V1 read endpoints return the complete authorized directory (no pagination).
// Selection and search text are intentionally independent.
export function SearchableEntitySelect({label,name,value,onChange,records,required=false,loading=false,disabledIds=[],onRejected,error}) {
  const id=useId(),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[index,setIndex]=useState(0);
  const selected=records.find(r=>String(r.id)===String(value));
  const matches=useMemo(()=>records.filter(r=>[r.code,r.description,r.quality,r.colour,r.packing,r.name,r.phone].join(' ').toLowerCase().includes(query.toLowerCase())),[records,query]);
  const choose=r=>{if(disabledIds.map(String).includes(String(r.id))){onRejected?.(r);return;}onChange(String(r.id));setQuery('');setOpen(false);};
  return <div className="entity-select" data-entry-field={name}><label htmlFor={id}>{label}{required?' *':''}</label>
    <input type="hidden" name={name} value={value||''}/>
    <div className="entity-input"><input id={id} role="combobox" aria-invalid={Boolean(error)} aria-describedby={error?id+'-error':undefined} aria-autocomplete="list" aria-expanded={open} aria-controls={id+'-list'} aria-activedescendant={open&&matches[index]?id+'-'+index:undefined} autoComplete="off" required={required&&!value} pattern={!value&&required?'(?!)':undefined} title={!value&&required?'Choose a result from the list':undefined} value={open?query:selected?entityLabel(selected):''} placeholder={selected?entityLabel(selected):'Type to search'} onFocus={()=>{setOpen(true);setQuery('');setIndex(0);}} onBlur={()=>setOpen(false)} onChange={e=>{setQuery(e.target.value);setOpen(true);setIndex(0);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setIndex(i=>Math.max(0,Math.min(matches.length-1,i+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'&&open){e.preventDefault();if(matches[index])choose(matches[index]);}}}/>
    {value&&<button type="button" aria-label={'Clear '+label} onClick={()=>{onChange('');setQuery('');setOpen(false);}}>×</button>}</div>
    {open&&<ul id={id+'-list'} role="listbox" aria-label={label}>{loading?<li role="status">Loading…</li>:!matches.length?<li role="status">No results</li>:matches.map((r,i)=><li id={id+'-'+i} key={r.id} data-entity-id={r.id} role="option" aria-disabled={disabledIds.map(String).includes(String(r.id))} aria-selected={String(r.id)===String(value)} className={i===index?'highlighted':''} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(r)}>{entityLabel(r)}{disabledIds.map(String).includes(String(r.id))?' · Already included':''}</li>)}</ul>}
    {error&&<span className="field-error" id={id+'-error'} role="alert">{error}</span>}
  </div>;
}
