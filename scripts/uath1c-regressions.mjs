// Reuse accepted regressions without overwriting the owner's uncommitted UAT-H1 evidence.
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
await mkdir('docs/uat-h1c/evidence',{recursive:true});
for(const [source,name] of [['uath1-php-suite.mjs','php'],['uath1-regressions.mjs','financial']]){
 const file='scripts/.startup-'+randomUUID()+'.mjs';
 try{
  const code=(await readFile('scripts/'+source,'utf8')).replaceAll('docs/uat-h1/evidence','docs/uat-h1c/evidence');await writeFile(file,code);
  const result=await new Promise((done,fail)=>{const p=spawn(process.execPath,[file],{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>out+=b);p.on('error',fail);p.on('close',exitCode=>done({exitCode,output:out}));});
  await writeFile('docs/uat-h1c/evidence/'+name+'-regression.log',result.output);if(result.exitCode)throw Error(name.toUpperCase()+'_REGRESSION_FAILED');console.log(name+' regressions passed');
 }finally{await unlink(file);}
}
