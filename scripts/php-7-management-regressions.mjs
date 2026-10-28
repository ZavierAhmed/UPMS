import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
assert.equal(engine.port,3330);
const directory=resolve('tmp/php-runtime/php7-regressions-'+Date.now());await mkdir(directory,{recursive:true});
const results=[];
const labels=['8.3','8.4'].flatMap(v=>[2,3,4,5,6].map(m=>v+'-php'+m));
const start=process.env.PHP_REGRESSION_START||labels[0];assert.ok(labels.includes(start));
for(const [version,binary,args]of [['8.3',resolve('tmp/php-runtime/bin/php.exe'),[]],['8.4','C:/php84/php.exe',['-d','extension=sodium']]])for(const milestone of [2,3,4,5,6]){
 const label=version+'-php'+milestone;
 if(labels.indexOf(label)<labels.indexOf(start))continue;
 const env={...process.env,PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:engine.password,['PHP'+milestone+'_BINARY']:binary,['PHP'+milestone+'_ARGS']:JSON.stringify(args)};
 const result=await new Promise((done,fail)=>{const c=spawn(process.execPath,['scripts/php-'+milestone+'-differential.mjs'],{env,windowsHide:true});let out='',err='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);c.on('error',fail);c.on('close',code=>done({code,out,err}));});
 await writeFile(directory+'/'+label+'.log',result.out+result.err);
 assert.equal(result.code,0,label+' failed; inspect private log');
 const summary=JSON.parse(result.out.trim().split('\n').at(-1));results.push({version,milestone,...summary});
 await writeFile(directory+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({version,milestone,...summary}));
}
console.log(JSON.stringify({passed:true,runs:results.length,directory}));
