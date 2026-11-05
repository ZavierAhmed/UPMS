// Review-only package. The generic deployment archive is never overwritten.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
if(!/^22\./.test(process.versions.node))throw Error('Use the repository verified Node 22.23.4+ runtime');
const temporary='scripts/.uat3a-package-'+randomUUID()+'.mjs';
const set=process.env.UAT3A_EVIDENCE_SET||'';
if(set&&!/^[a-z0-9-]+$/.test(set))throw Error('Invalid review artifact namespace');
try{
 const source=(await readFile('scripts/package-deployment.mjs','utf8')).replace('resolve("artifacts/upms-node-deployment.zip")',`resolve("tmp/uat3a/${set?set+'/':''}artifacts/upms-node-deployment.zip")`);
 await writeFile(temporary,source);
 execFileSync(process.execPath,[temporary,'--node-major=22'],{stdio:'inherit',windowsHide:true});
}finally{await unlink(temporary);}
