import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';import knex from 'knex';import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),stamp=Date.now(),schema='upms_test_php_83_grants_'+stamp;const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});let checks=0;
try{
 await db.raw('CREATE DATABASE ??',[schema]);
 for(const [suffix,privilege,target,accepted] of [['exact','SELECT',schema.replaceAll('_','\\_'),true],['wildcard','SELECT',schema,false],['writer','SELECT,INSERT',schema.replaceAll('_','\\_'),false]]){
  const user='php83_'+suffix+'_'+stamp;await db.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'127.0.0.1',randomBytes(32).toString('hex')]);await db.raw('GRANT '+privilege+' ON ??.* TO ?@?',[target,user,'127.0.0.1']);const [rows]=await db.raw('SHOW GRANTS FOR ?@?',[user,'127.0.0.1']);
  const result=spawnSync('C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/bin/php.exe',['scripts/php-8-3-test-grants.php'],{input:JSON.stringify({schema,grants:rows}),encoding:'utf8',windowsHide:true});const r=JSON.parse(result.stdout);assert.equal(r.accepted,accepted,JSON.stringify({suffix,result:r,scopeBackslashes:Object.values(rows.at(-1))[0].split(' TO ')[0].split('\\').length-1}));checks++;
 }
 const result={passed:true,checks,version:'10.11.19-MariaDB',syntheticSchema:schema,productionContacted:false};await writeFile('tmp/php-runtime/php83-grants.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await db.destroy();}
