import logo from '../../src/assets/unique_plastic_logos_hd/unique_plastic.svg';
export function PrintHeader({title,from,to,context,reference,contact=false}){
 // Approved identity/contact snapshot from src/data/company.js (owner-confirmed W03.3 address).
 return <header hidden className="upms-print-header"><img src={logo} alt="Unique Plastic Industry"/><div><strong>Unique Plastic Industry</strong><h1>{title}</h1>{contact&&<p>F-260/A, Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan · 0314-2113472 · uniqueplastic56@gmail.com</p>}{(from!==undefined||to!==undefined)&&<p>Period: {from||'Start'} — {to||'Present'}</p>}{context&&<p>{context}</p>}{reference&&<p>{reference}</p>}<p>PKR · quantities in bottles where shown</p></div></header>;
}
