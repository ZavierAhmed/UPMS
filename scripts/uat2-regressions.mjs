// Keep every prior milestone evidence file and owner binding untouched.
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const root='docs/uat-2/evidence/regressions';await mkdir(root,{recursive:true});
const suites=process.argv.includes('--full')?['uath1f-full-regression.mjs','uath1f-browser-regressions.mjs','uath1f-synthetic-regressions.mjs']:['uath1f-regressions.mjs'];
for(const source of suites) {
 const file='scripts/.uat2-regression-'+randomUUID()+'.mjs';
 try {
  const code=(await readFile('scripts/'+source,'utf8')).replaceAll('docs/uat-h1f/evidence',root).replaceAll('uath1f-regression-latest.json','uat2-regression-latest.json').replaceAll('output/pdf/uath1f-synthetic-','output/pdf/uat2-regression-');await writeFile(file,code);
  const result=await new Promise((done,fail)=>{const p=spawn(process.execPath,[file],{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',fail);p.on('close',exitCode=>done({exitCode,output}));});
  await writeFile(root+'/'+source+'.log',result.output);if(result.exitCode)throw Error('UAT2_EXISTING_REGRESSION_FAILED_'+source);console.log(source+' passed');
 }finally{await unlink(file);}
}
