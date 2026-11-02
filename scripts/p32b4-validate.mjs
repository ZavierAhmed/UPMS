// Final local acceptance runner; records actual command argv/exit codes, never child environment or credentials.
import {spawn} from 'node:child_process';import {writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
const root=process.cwd(),evidence='docs/phase-3.2b4/evidence';await mkdir(evidence,{recursive:true});const results=[];
const php=resolve('tmp/php-runtime/bin/php.exe'),python='C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const clean=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('UPMS_')));
const jobs=[
 ['gate logic',process.execPath,['--test','scripts/p32b4-gates.test.mjs'],'.'],
 ['PHP unit',php,['vendor/bin/phpunit','--testsuite','Unit','--no-progress'],'upms.php'],
 ['PHP style',php,['vendor/bin/pint','--test','app/Upms/FinancialArchive.php','tests/Unit/FinancialArchiveTest.php','tests/Support/money-local.php'],'upms.php'],
 ['React',process.execPath,['node_modules/vitest/vitest.mjs','run','--maxWorkers=4'],'upms.client'],
 ['ESLint',process.execPath,['node_modules/eslint/bin/eslint.js','.'],'upms.client'],
 ['public build',process.execPath,['node_modules/vite/bin/vite.js','build'],'upms.client'],
 ['SSR build',process.execPath,['node_modules/vite/bin/vite.js','build','--ssr','src/entry-server.jsx','--outDir','.prerender'],'upms.client'],
 ['prerender',process.execPath,['scripts/prerender.mjs'],'upms.client'],
 ['management build',process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.management.config.js'],'upms.client'],
 ['prior financial regressions',process.execPath,['scripts/p32b4-regressions.mjs'],'.'],
 ['consolidated oracle',process.execPath,['scripts/p32b4-consolidated.mjs'],'.'],
 ['offline Windows recovery',process.execPath,['scripts/p32b4-recovery.mjs'],'.'],
 ['built UI / real PHP',process.execPath,['scripts/p32b4-browser.mjs'],'.'],
 ['PDF and XLSX verification',python,['scripts/p32b4-artifacts.py'],'.']
];
for(const [name,exe,args,cwd] of jobs){console.log('Starting '+name);const start=Date.now();const r=await new Promise((done,fail)=>{const p=spawn(exe,args,{cwd:resolve(cwd),env:clean,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',fail);p.on('close',code=>done({code,out,err}));});results.push({name,command:[exe,...args],cwd,exitCode:r.code,seconds:Math.round((Date.now()-start)/1000),summary:(r.out.match(/OK \([^\r\n]+|Test Files[^\r\n]+|Tests\s+\d+ passed[^\r\n]+|\{"passed":true[^\r\n]*|Existing financial differential[^\r\n]+|\w+ money regression passed/g)||[])});await writeFile(evidence+'/validation.json',JSON.stringify({passed:r.code===0&&results.length===jobs.length,results,productionContacted:false,verifiedUtc:new Date().toISOString()},null,2)+'\n');if(r.code!==0){console.log(r.out.slice(-2400));console.log(r.err.slice(-1600));throw Error('ACCEPTANCE_FAILED: '+name);}console.log('Passed '+name);}
console.log('All '+results.length+' final acceptance commands passed.');
