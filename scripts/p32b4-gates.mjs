export const requiredHostedGates=['exact hosted target and approved release SHA','hosted CURRENT_USER and exact restricted grants','restricted SELECT/TRIGGER guard definer privileges','hosted immutable journal/guard proof','genuine protected off-host archive independently restored','hosted 29/72 backup collector/DPAPI consumer compatibility','target-bound money and expense readiness proofs','target-bound owner refund approval / p32b3-full-same-account-v1','hosted maintenance migration order and business cutoff approval','trusted HTTPS, host isolation and non-business smoke acceptance','authorized file/config restore and stop-on-failure procedure','cross-Windows identity isolation acceptance','live scheduling, retention, quota and failure-alert delivery'];
export function productionGo(gates){
 if(!Array.isArray(gates)||!gates.length||new Set(gates.map(g=>g.id)).size!==gates.length)return false;
 if(!requiredHostedGates.every(id=>gates.some(g=>g.id===id&&g.mandatory===true&&g.status==='PASS')))return false;
 return gates.every(g=>['PASS','FAIL','BLOCKED','NOT APPLICABLE'].includes(g.status)&&(!g.mandatory||g.status==='PASS'||g.status==='NOT APPLICABLE'));
}
