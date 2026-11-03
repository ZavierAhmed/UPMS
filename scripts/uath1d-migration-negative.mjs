import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {provisionWorkspace} from './uath1-workspace.mjs';
const binding=await provisionWorkspace({directory:resolve('tmp/php-runtime/uath1d-partial-'+Date.now()),password:randomBytes(24).toString('hex')});
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const result=await new Promise((done,fail)=>{const p=spawn(resolve('tmp/php-runtime/bin/php.exe'),['upms.php/tests/Support/uath1d-migration-negative.php'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('close',code=>{if(code)return fail(Error('H1D_PARTIAL_TEST_FAILED '+JSON.stringify((out+err).match(/\b(?:H1D|H1C)_[A-Z_]+\b/g)||[])));try{done(JSON.parse(out));}catch{fail(Error('H1D_PARTIAL_TEST_RESPONSE_FAILED'));}});p.stdin.end(JSON.stringify({port:3330,...binding,user:'php2_test_admin',password:engine.password}));});
await writeFile('docs/uat-h1d/evidence/interrupted-migration.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
