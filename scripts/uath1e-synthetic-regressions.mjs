// Reuse H1C acceptance in fresh synthetic databases, with H1E evidence paths only.
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const evidence='docs/uat-h1e/evidence/synthetic-h1c';await mkdir(evidence,{recursive:true});
for(const source of ['uath1c-integration.mjs','uath1c-negative.mjs','uath1c-browser.mjs','uath1c-artifacts.mjs','uath1c-recovery.mjs']) {
 const file='scripts/.h1d-'+randomUUID()+'.mjs';
 try {
  const code=(await readFile('scripts/'+source,'utf8')).replaceAll('docs/uat-h1c/evidence',evidence).replaceAll('output/pdf/uath1c-','output/pdf/uath1e-synthetic-');await writeFile(file,code);
  const result=await new Promise((done,fail)=>{const p=spawn(process.execPath,[file],{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',fail);p.on('close',code=>done({code,output}));});
  await writeFile(evidence+'/'+source+'.log',result.output);if(result.code)throw Error('H1E_SYNTHETIC_REGRESSION_FAILED_'+source.replace(/[^a-z]/gi,'_').toUpperCase());console.log(source+' passed');
 }finally{await unlink(file);}
}
