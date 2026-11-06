// Reuse current accepted scenarios with NEW private pointers and P4-only evidence.
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const root='docs/phase-4.1b/evidence/financial';await mkdir(root,{recursive:true});
const pointers=['uath1-latest.json','uath1c-latest.json','uat2-current.json','uat2a-repro.json','uat2a-extras.json','uat2a-extras-session.json','uat2a-extra-auth.json'];
const suites=['uath1-integration.mjs','uath1c-integration.mjs','uath1c-negative.mjs','uat2-integration.mjs','uat2-negative.mjs','uat2-recovery.mjs','uat2a-clearance-repro.mjs','uat2a-core-http.mjs','uat2a-extras-http.mjs','uat2a-reference-http.mjs','uat2a-current-http.mjs','uat2a-stale-and-identity.mjs'];
const results=process.argv.includes('--resume')?JSON.parse(await readFile(root+'/results.json','utf8')):[];
for(const name of suites){
 if(results.filter(r=>r.name===name).at(-1)?.exitCode===0)continue;
 const temp='scripts/.p41b-financial-'+randomUUID()+'.mjs';
 try{
  let code=await readFile('scripts/'+name,'utf8');
  for(const phase of ['uat-h1c','uat-h1','uat-2a','uat-2']){const dir=root+'/'+phase;await mkdir(dir,{recursive:true});code=code.replaceAll('docs/'+phase+'/evidence',dir);}
  for(const pointer of pointers)code=code.replaceAll(pointer,'p41b-'+pointer);
  if(name==='uath1c-integration.mjs')code=code.replace('const fixture=await provisionClassifiedWorkspace(),{binding,envPath}=fixture;',`const fixture=await provisionClassifiedWorkspace({publishLatest:false}),{binding,envPath}=fixture;await writeFile('tmp/php-runtime/p41b-uath1c-latest.json',JSON.stringify({...binding,bindingPath:fixture.bindingPath}));`);
  await writeFile(temp,code);
  const result=await new Promise((done,fail)=>{const p=spawn(process.execPath,[temp],{windowsHide:true,env:{...process.env,UPMS_PRODUCTION_PROFILE:''}});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',fail);p.on('close',exitCode=>done({name,exitCode,output}));});
  if(results.some(r=>r.name===name&&r.exitCode!==0)){const previous=await readFile(root+'/'+name+'.log','utf8');await writeFile(root+'/'+name+'.failed-attempt-'+Date.now()+'.log',previous);}
  await writeFile(root+'/'+name+'.log',result.output);results.push({name,exitCode:result.exitCode});await writeFile(root+'/results.json',JSON.stringify(results,null,2)+'\n');
  if(result.exitCode)throw Error('P4_FINANCIAL_SUITE_FAILED '+name);console.log(name+' passed');
 }finally{await unlink(temp);}
}
