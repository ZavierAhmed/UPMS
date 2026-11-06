import {readFile,readdir,lstat,writeFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
export function retentionSelection(archives,now,effectiveNotBefore,holds=new Set()){
 const kept=new Set(),buckets=new Set();
 const localDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
 for(const entry of [...archives].sort((a,b)=>b.created-a.created)){
  const age=(now-entry.created)/86400000,date=localDate(entry.created);
  const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();const week=Math.ceil((((d-new Date(Date.UTC(year,0,1)))/86400000)+1)/7);
  const category=age<=2?'hour:'+Math.floor(entry.created/3600000):age<=35?'day:'+date:age<=84?'week:'+year+'-'+week:age<=366?'month:'+date.slice(0,7):null;
  if(entry.created<effectiveNotBefore||holds.has(entry.name)||(category&&!buckets.has(category)))kept.add(entry.name);
  if(category)buckets.add(category);
 }
 return archives.map(a=>({...a,retain:kept.has(a.name),reason:a.created<effectiveNotBefore?'pre-existing: no retroactive deletion':holds.has(a.name)?'explicit recovery/release/incident hold':kept.has(a.name)?'retention tier':'outside preferred retention tiers',deletionAuthorized:false}));
}
if(process.argv[1]?.endsWith('p4-retention-plan.mjs')){
 const root=resolve('tmp/protected-offhost-backups');
 const policy=JSON.parse(await readFile('deployment/phase-4/retention-policy.json','utf8'));
 if(!policy.ownerApproved||policy.deletionEnabled||policy.retroactiveDeletionAuthorized)throw Error('Only the approved non-destructive retention plan is supported');
 const now=Date.now(),archives=[];
 for(const name of await readdir(root)){
  const match=/^upms-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-[a-f0-9]+\.upmsbk$/.exec(name);if(!match)continue;
  const file=await lstat(resolve(root,name));if(file.isSymbolicLink())throw Error('Backup symlink rejected');
  archives.push({name,bytes:file.size,created:Date.UTC(...match.slice(1).map((n,i)=>Number(n)-(i===1?1:0)))});
 }
 const last=JSON.parse(await readFile(resolve(root,'last-success.json'),'utf8'));
 const selected=retentionSelection(archives,now,now,new Set([basename(last.archive)]));
 const report={passed:true,mode:'DRY_RUN_NO_DELETION_IMPLEMENTED',ownerApprovedPolicy:policy,archiveCount:archives.length,existingArchivesProtected:true,independentRecoveryGate:'BLOCKED',filesDeleted:0,archives:selected};
 await writeFile('docs/phase-4/evidence/retention-plan.json',JSON.stringify(report,null,2)+'\n');console.log('Approved retention planned; '+archives.length+' existing archives preserved; zero deletions.');
}
