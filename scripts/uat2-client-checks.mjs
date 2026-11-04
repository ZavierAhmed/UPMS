import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const directory='docs/uat-2/evidence',checks=[];await mkdir(directory,{recursive:true});
for(const [name,args] of [
 ['client-lint',['node_modules/eslint/bin/eslint.js','management/src','src/test/CustomerCheques.test.jsx']],
 ['react',['node_modules/vitest/vitest.mjs','run','--maxWorkers=2']],
 ['management-build',['node_modules/vite/bin/vite.js','build','--config','vite.management.config.js']]
]) {
 const r=await new Promise((done,fail)=>{const p=spawn(process.execPath,args,{cwd:resolve('upms.client'),windowsHide:true,env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='FORCE_COLOR')),NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',fail);p.on('close',exitCode=>done({exitCode,output}));});
 await writeFile(directory+'/'+name+'.log',r.output?r.output.trimEnd()+'\n':'');if(r.exitCode)throw Error('UAT2_'+name.toUpperCase().replaceAll('-','_')+'_FAILED');
 checks.push({name,passed:true,...(name==='react'?{tests:Number(r.output.match(/Tests\s+(\d+) passed/)?.[1]),files:Number(r.output.match(/Test Files\s+(\d+) passed/)?.[1])}:{})});console.log(name+' passed');
}
await writeFile(directory+'/client-checks.json',JSON.stringify({passed:true,checks,verifiedUtc:new Date().toISOString()},null,2));
