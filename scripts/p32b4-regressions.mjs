// Run accepted regression harnesses against fresh loopback fixtures; keep milestone evidence separate.
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const evidence='docs/phase-3.2b4/evidence';await mkdir(evidence,{recursive:true});
async function run(args,env={}){return new Promise((done,fail)=>{const p=spawn(process.execPath,args,{windowsHide:true,env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('UPMS_'))),UPMS_PRODUCTION_PROFILE:'',...env},stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',fail);p.on('close',code=>code===0?done(out):fail(Error('Local regression failed; detailed synthetic evidence retained; '+err.slice(-1200))));});}
for(const [file,oldPhase,key] of [['p32a-money-integration.mjs','phase-3.2a','foundation'],['p32b1-money-integration.mjs','phase-3.2b1','documents'],['p32b2-expenses-integration.mjs','phase-3.2b2','expenses'],['p32b3-financial-integration.mjs','phase-3.2b3','refunds']]){
 const target=resolve('scripts/.p32b4-local-'+randomUUID()+'.mjs');
 try{let source=await readFile('scripts/'+file,'utf8');source=source.replaceAll('docs/'+oldPhase+'/evidence',evidence+'/'+key+'-regression').replaceAll('p32a-latest.json','p32b3-foundation-regression-latest.json').replaceAll('p32b1-latest.json','p32b3-document-regression-latest.json').replaceAll('p32b2-latest.json','p32b4-expense-regression-latest.json').replaceAll('p32b3-latest.json','p32b4-refund-regression-latest.json');await writeFile(target,source);await run([target]);console.log(key+' money regression passed');}finally{await unlink(target).catch(()=>{});}
}
const e=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const output=await run(['scripts/php-7-6-pricing-differential.mjs'],{PHP76_BINARY:resolve('tmp/php-runtime/bin/php.exe'),PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:e.password});
const receipt=JSON.parse(output.trim().split(/\r?\n/).at(-1)),source=JSON.parse(await readFile(receipt.evidence,'utf8'));
await writeFile(evidence+'/pricing-regression.json',JSON.stringify({passed:true,httpComparisons:source.httpComparisons,snapshotComparisons:source.snapshotComparisons,checks:source.checks,productionContacted:false},null,2)+'\n');console.log('Existing financial differential: '+source.httpComparisons+' HTTP comparisons, '+source.snapshotComparisons+' snapshots passed');
