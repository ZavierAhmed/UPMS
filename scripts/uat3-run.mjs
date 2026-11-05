import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const names=process.argv.slice(2).filter(x=>!x.startsWith('--'));
for(const name of names){const path='scripts/.uat3-'+name;try{
 let text=(await readFile('scripts/'+name,'utf8')).replaceAll('docs/uat-2a','docs/uat-3').replaceAll('docs/uat-2/evidence','docs/uat-3/evidence/prior-uat2').replaceAll('uat2a-assets','uat3-assets').replaceAll('output/pdf/uat2a-','output/pdf/uat3-').replaceAll('uat2-current.json','uat3-prior-current.json').replaceAll('uat2-regression-latest.json','uat3-prior-regression-latest.json');
 if(name==='uat2a-regressions.mjs'){text=(await readFile('scripts/'+name,'utf8')).replace("const root='docs/uat-2a/evidence/prior-uat2'","const root='docs/uat-3/evidence/prior-uat2'").replaceAll('uat2a-prior-current.json','uat3-prior-current.json').replaceAll('uat2a-prior-regression-latest.json','uat3-prior-regression-latest.json').replaceAll('output/pdf/uat2a-regression-','output/pdf/uat3-regression-').replaceAll('uat2a-assets','uat3-assets');}
 await writeFile(path,text);await new Promise((done,fail)=>{let out='';const p=spawn(process.execPath,[path,...(process.argv.includes('--full')?['--full']:[])],{windowsHide:true});p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>out+=b);p.on('error',fail);p.on('close',async code=>{await writeFile('docs/uat-3/evidence/regressions/'+name+'.log',out);if(code)fail(Error(name+' failed, see protected-safe evidence'));else {console.log(name+' passed');done();}});});
 }finally{await (await import('node:fs/promises')).unlink(path);}}
