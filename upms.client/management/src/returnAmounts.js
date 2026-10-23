const parse=v=>{const m=/^(\d{1,14})(?:\.(\d{1,6}))?$/.exec(v);if(!m)throw Error('Exact quantity required');return BigInt(m[1])*1000000n+BigInt((m[2]||'').padEnd(6,'0'));};
const format=v=>`${v<0n?'-':''}${(v<0n?-v:v)/1000000n}.${String((v<0n?-v:v)%1000000n).padStart(6,'0')}`;
export function returnRemainder(quantity,reusable,damaged){try{const remaining=parse(quantity)-parse(reusable||'0')-parse(damaged||'0');return {remaining:format(remaining),valid:remaining>=0n&&parse(reusable||'0')+parse(damaged||'0')>0n};}catch{return {remaining:'Unconfirmed',valid:false};}}
export function returnable(dispatched,received){try{return format(parse(dispatched)-parse(received||'0'));}catch{return 'Unconfirmed';}}
