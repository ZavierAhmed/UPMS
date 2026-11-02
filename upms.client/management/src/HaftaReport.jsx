import {weekRange, haftaWorkbook} from './haftaReportUtils.js';
import {useEffect, useRef, useState} from 'react';
import logo from '../../src/assets/unique_plastic_logos_hd/unique_plastic.svg';
import {exportWorkbook} from './simpleV1Export.js';
import './hafta-report.css';

const money = v => v === null ? 'UNVERIFIED' : v;
export function HaftaBlocks({report, paper='A4'}) {
  return <div className={'hafta-output paper-'+paper}><style media="print">{'@page { size: '+(paper==='A3'?'A3':'A4')+' landscape; margin: 10mm; }'}</style>
    <div className="hafta-legend"><strong>HAFTA · {report.from} to {report.to} · PKR</strong><p>TOTAL = gross weekly sales − recorded bill discounts − return credits. Return AMOUNT is net credit after the original discount; RATE stays historical. ADVANCE is not separately classified. Receipts and reversals are separate. BALANCE = verified opening + all signed journal movements; a negative balance means company owes client.</p>{report.sourceLimitations.map(s=><p key={s}>{s}</p>)}</div>
    {!report.blocks.length && <p className="empty-state">No clients match this selection.</p>}
    <div className="hafta-grid">{report.blocks.map(b=><article className="hafta-block" key={b.partyId} aria-label={'Hafta · '+b.partyName}>
      <header><img src={logo} alt="Unique Plastic Industry"/><div><strong>HAFTA</strong><p>{report.from} — {report.to}</p></div></header>
      <h2>{b.partyName}</h2><p className="hafta-classification">{b.partyKind} · {b.classification}</p>
      {b.warnings.map(w=><p className="hafta-warning" key={w}>{w}</p>)}
      <table><caption className="sr-only">{b.partyName} weekly posted records</caption><colgroup><col className="hafta-day"/><col className="hafta-description"/><col className="hafta-qty"/><col className="hafta-rate"/><col className="hafta-amount"/></colgroup><thead><tr className="hafta-print-context"><th colSpan="5">{b.partyName} · {report.from} — {report.to}</th></tr><tr>{['DAY','DESCRIPTION','QTY','RATE','AMOUNT'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
        {b.rows.map((r,i)=><tr key={i}><td>{new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'Asia/Karachi'}).format(new Date(r.date+'T00:00:00+05:00'))}<small>{r.date.slice(5)}</small></td><td>{r.description}{r.attributes&&<small>{r.attributes}</small>}<small>{r.kind.replaceAll('_',' ')} · {r.reference}</small></td><td>{r.quantity}</td><td>{r.rate}</td><td>{r.amount}</td></tr>)}
        {!b.rows.length&&<tr><td colSpan="5">No posted activity in this range.</td></tr>}
      </tbody></table>
      <div className="hafta-summary"><p className="hafta-print-only">{b.partyName} · {report.from} — {report.to} · Final summary</p><dl>{[['Gross sales',b.grossSales],['Discounts',b.discounts],['Returns credit',b.returns],['TOTAL',b.total],['Receipts · not advances',b.receipts],['Receipt reversals',b.receiptReversals],['Opening entries / corrections',b.openingEntries],['Opening',money(b.opening)],['ADVANCE','Not classified'],['Recorded movement',b.movement],['BALANCE',money(b.balance)]].map(([label,v])=><div key={label}><dt>{label}</dt><dd>{v}</dd></div>)}</dl></div>
    </article>)}</div>
  </div>;
}
export function HaftaReport({api, clients}) {
  const initial = new URLSearchParams(location.search), defaults=weekRange();
  const [filters,setFilters] = useState({from:initial.get('from')||defaults.from,to:initial.get('to')||defaults.to,parties:initial.get('parties')||''});
  const [paper,setPaper]=useState(initial.get('paper')==='A3'?'A3':'A4'), [search,setSearch]=useState(''), [selectedOnly,setSelectedOnly]=useState(Boolean(initial.get('parties')));
  const [report,setReport]=useState(null), [error,setError]=useState(''), [loading,setLoading]=useState(false);
  const apiRef=useRef(api); useEffect(()=>{apiRef.current=api;},[api]);
  useEffect(()=>{
    let live=true;
    const timer=setTimeout(()=>{
      setReport(null);setError('');setLoading(true);
      if(selectedOnly&&!filters.parties){setLoading(false);setError('Select at least one client, or choose All clients.');return;}
      apiRef.current('/simple-v1/hafta?'+new URLSearchParams(filters)).then(r=>{if(live)setReport(r);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
    },150);
    return()=>{live=false;clearTimeout(timer);};
  },[filters,selectedOnly]);
  function update(next) {setReport(null);setFilters(next);history.replaceState(history.state,'',location.pathname+'?'+new URLSearchParams({report:'hafta',...next,paper}));}
  const selected=filters.parties?filters.parties.split(','):[];
  const exportExcel=()=>{const w=haftaWorkbook(report);exportWorkbook('Hafta',w.columns,w.rows,w.metadata);};
  return <section className="hafta-report"><h1 className="no-print">Hafta Report · client weekly statement</h1><p className="no-print">This is a client sales/payment statement. <a href="/management/expense-reports?week=1">Review weekly business expenses separately</a>.</p>
    <div className="hafta-controls no-print">
      <label>Week containing<input type="date" value={filters.from} onChange={e=>{if(e.target.value)update({...filters,...weekRange(e.target.value)});}}/></label>
      <label>From<input type="date" value={filters.from} onChange={e=>update({...filters,from:e.target.value})}/></label>
      <label>To<input type="date" value={filters.to} onChange={e=>update({...filters,to:e.target.value})}/></label>
      <label>Clients<select value={selectedOnly?'selected':'all'} onChange={e=>{const only=e.target.value==='selected';setReport(null);setSelectedOnly(only);if(!only)update({...filters,parties:''});}}><option value="all">All clients</option><option value="selected">Selected clients</option></select></label>
      {selectedOnly&&<fieldset><legend>Select clients</legend><label>Search clients<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="hafta-party-options">{clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=><label key={c.id}><input type="checkbox" checked={selected.includes(String(c.id))} onChange={e=>update({...filters,parties:(e.target.checked?[...selected,String(c.id)]:selected.filter(id=>id!==String(c.id))).join(',')})}/>{c.name}</label>)}</div></fieldset>}
      <label>Print paper<select value={paper} onChange={e=>{setPaper(e.target.value);history.replaceState(history.state,'',location.pathname+'?'+new URLSearchParams({report:'hafta',...filters,paper:e.target.value}));}}><option>A4</option><option>A3</option></select></label>
      <button disabled={!report||loading} onClick={()=>window.print()}>Print / Save as PDF</button><button disabled={!report||loading} onClick={exportExcel}>Export Excel</button>
    </div>
    {loading&&<p role="status">Loading posted weekly records…</p>}{error&&<p role="alert">{error}</p>}
    {report&&<HaftaBlocks report={report} paper={paper}/>}
  </section>;
}
