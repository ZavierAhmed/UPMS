// Full final UAT-1 validation, fresh automated fixtures only; never resets or migrates owner UAT.
import {spawn} from 'node:child_process';import {writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
const evidence='docs/uat-1/evidence';await mkdir(evidence,{recursive:true});const php=resolve('tmp/php-runtime/bin/php.exe'),python='C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',results=[];
const jobs=[
 ['PHP units',php,['vendor/bin/phpunit','--testsuite','Unit','--no-progress'],'upms.php'],
 ['PHP style',php,['vendor/bin/pint','--test','app/Upms/ChallanNumbers.php','app/Upms/Documents.php','app/Upms/ExpenseMasters.php','app/Upms/FinancialCorrections.php','app/Upms/FinancialRecovery.php','app/Upms/Reconciliation.php','app/Upms/SimpleV1.php','app/Upms/V1Input.php','tests/Unit/Uat1ContractsTest.php','tests/Unit/ExpenseMastersTest.php'],'upms.php'],
 ['React',process.execPath,['node_modules/vitest/vitest.mjs','run','--maxWorkers=4'],'upms.client'],
 ['ESLint',process.execPath,['node_modules/eslint/bin/eslint.js','.'],'upms.client'],
 ['public build',process.execPath,['node_modules/vite/bin/vite.js','build'],'upms.client'],
 ['SSR build',process.execPath,['node_modules/vite/bin/vite.js','build','--ssr','src/entry-server.jsx','--outDir','.prerender'],'upms.client'],
 ['prerender',process.execPath,['scripts/prerender.mjs'],'upms.client'],
 ['management build',process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.management.config.js'],'upms.client'],
 ['financial/security regressions',process.execPath,['scripts/uat1-regressions.mjs'],'.'],
 ['B4 consolidated + UAT1 contracts / recovery',process.execPath,['scripts/uat1-integration.mjs'],'.'],
 ['baseline UI evidence',process.execPath,['scripts/uat1-browser.mjs','--before'],'.'],
 ['UAT1 actual PHP browser / print / exports',process.execPath,['scripts/uat1-browser.mjs'],'.'],
 ['PDF/XLSX verification',python,['scripts/uat1-print-verify.py'],'.'],
 ['owner UAT preservation',process.execPath,['scripts/uat1-owner-preservation.mjs'],'.']
];
for(const [name,exe,args,cwd] of jobs){console.log('Starting '+name);const start=Date.now();const r=await new Promise((done,fail)=>{const p=spawn(exe,args,{cwd:resolve(cwd),windowsHide:true,env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('UPMS_')))},stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>out+=b);p.on('error',fail);p.on('close',code=>done({code,out}));});results.push({name,command:[exe,...args],cwd,exitCode:r.code,seconds:Math.round((Date.now()-start)/1000),summary:r.out.match(/OK \([^\r\n]+|Test Files[^\r\n]+|Tests\s+\d+ passed[^\r\n]+|\{"passed":true[^\r\n]*|Existing financial differential[^\r\n]+|\w+ money regression passed|Owner UAT records[^\r\n]+/g)||[]});await writeFile(evidence+'/validation.json',JSON.stringify({passed:r.code===0&&results.length===jobs.length,results,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2)+'\n');if(r.code){console.log(r.out.slice(-2600));throw Error('UAT1_VALIDATION_FAILED: '+name);}console.log('Passed '+name);}
console.log('All '+jobs.length+' UAT-1 validation commands passed.');
