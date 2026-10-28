import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const directory=resolve('tmp/php-runtime/php75-automated-'+Date.now());await mkdir(directory,{recursive:true});
await writeFile('tmp/php-runtime/php75-automated-latest.json',JSON.stringify({directory}));
const env={...process.env,PHP_TEST_ADMIN_PORT:'3330',PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:engine.password};
env.PATH=resolve('tmp/production-readiness/node22/node_modules/node/bin')+';'+env.PATH;
const results=[];
async function run(label,binary,args,cwd=process.cwd(),extra={}){
 const result=await new Promise(done=>{let output='';const child=spawn(binary,args,{cwd,env:{...env,...extra},windowsHide:true});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',()=>done({code:-1,output:'Process could not start'}));child.on('close',code=>done({code,output}));});
 await writeFile(directory+'/'+label+'.log',result.output,{mode:0o600});results.push({label,exitCode:result.code});await writeFile(directory+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.at(-1)));
}
await run('fixtures',process.execPath,['scripts/php-migration-fixtures.mjs']);
if(results.at(-1).exitCode!==0)process.exit(1);
await run('reconciliation-contracts',process.execPath,['scripts/php-reconciliation-contracts.mjs']);
for(const [version,binary,args]of [['83',resolve('tmp/php-runtime/bin/php.exe'),[]],['84','C:/php84/php.exe',['-d','extension=sodium']]]){
 await run('phpunit-'+version,binary,[...args,'vendor/phpunit/phpunit/phpunit'],resolve('upms.php'));
 await run('inquiries-'+version,process.execPath,['scripts/php-7-inquiries.mjs'],process.cwd(),{PHP7_BINARY:binary,PHP7_ARGS:JSON.stringify(args)});
 await run('platform-'+version,binary,[...args,resolve('tmp/php-runtime/composer.phar'),'check-platform-reqs'],resolve('upms.php'));
}
await run('composer-validate','C:/php84/php.exe',['-d','extension=sodium',resolve('tmp/php-runtime/composer.phar'),'validate'],resolve('upms.php'));
await run('composer-strict','C:/php84/php.exe',['-d','extension=sodium',resolve('tmp/php-runtime/composer.phar'),'validate','--strict'],resolve('upms.php'));
await run('composer-audit','C:/php84/php.exe',['-d','extension=sodium',resolve('tmp/php-runtime/composer.phar'),'audit','--locked'],resolve('upms.php'));
await run('pint','C:/php84/php.exe',['-d','extension=sodium','vendor/bin/pint','--test'],resolve('upms.php'));
for(const task of ['test','build','lint'])await run('react-'+task,process.execPath,['C:/nvm4w/nodejs/node_modules/npm/bin/npm-cli.js','run',task,...(task==='test'?['--','--maxWorkers=2']:[])],resolve('upms.client'));
console.log(JSON.stringify({directory,results}));
process.exitCode=results.every(r=>r.exitCode===0)?0:1;
