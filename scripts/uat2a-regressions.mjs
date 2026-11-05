import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const root='docs/uat-2a/evidence/prior-uat2';await mkdir(root,{recursive:true});
const names=process.argv.includes('--full')?['uat2-integration.mjs','uat2-negative.mjs','uat2-recovery.mjs','uat2-legacy.mjs','uat2-bank-opening.mjs','uat2-auth-boundary.mjs','uat2-client-checks.mjs','uat2-regressions.mjs']:['uat2-client-checks.mjs'];
for(const name of names){const file='scripts/.uat2a-'+randomUUID()+'.mjs';try{
let source=(await readFile('scripts/'+name,'utf8')).replaceAll('docs/uat-2/evidence',root).replaceAll('uat2-current.json','uat2a-prior-current.json').replaceAll('uat2-regression-latest.json','uat2a-prior-regression-latest.json').replaceAll('output/pdf/uat2-regression-','output/pdf/uat2a-regression-');if(name==='uat2-client-checks.mjs')source=source.replace("['node_modules/vite/bin/vite.js','build','--config','vite.management.config.js']","['node_modules/vite/bin/vite.js','build','--config','vite.management.config.js','--outDir',resolve('tmp/php-runtime/uat2a-assets')]");await writeFile(file,source);
const exit=await new Promise((done,fail)=>{const child=spawn(process.execPath,[file,...(name==='uat2-regressions.mjs'?['--full']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.on('error',fail);child.on('close',async code=>{await writeFile(root+'/'+name+'.log',output);done(code);});});if(exit)throw Error('UAT2A_PRIOR_REGRESSION_FAILED_'+name);console.log(name+' passed');
}finally{await unlink(file);}}
