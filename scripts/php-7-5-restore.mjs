// Run only while the isolated UAT HTTP writers are stopped. Never overwrite a schema.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,cp} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import net from 'node:net';
import knex from 'knex';
import {parseEnv} from 'node:util';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {grantPhp6} from './php-2-runtime-grants.mjs';
import {protectPrivateDirectory} from './php-7-5-private-directory.mjs';
await verifyUatEngine();
const started=performance.now();
for(const port of [9084,9443,9444])await new Promise((done,fail)=>{const socket=net.connect({host:'127.0.0.1',port});socket.on('connect',()=>{socket.destroy();fail(Error('Quiesce UAT services before backup'));});socket.on('error',done);});
const setup=JSON.parse(await readFile('tmp/php-runtime/php7-uat-latest.json','utf8'));
assert.match(setup.database,/^upms_test_php_6_browser_\d+$/);
const sourceEnv=parseEnv(await readFile(setup.env,'utf8'));assert.equal(sourceEnv.UPMS_DB_HOST,'127.0.0.1');assert.equal(sourceEnv.UPMS_DB_PORT,'3330');assert.equal(sourceEnv.UPMS_DB_DATABASE,setup.database);
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const connection={host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,timezone:'Z'};
const admin=knex({client:'mysql2',connection,pool:{min:0,max:1}});
const run=Date.now(),directory=resolve('tmp/php-runtime/php75-restore-'+run);await mkdir(directory,{recursive:true});
await protectPrivateDirectory(directory);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fileHashes(directory,prefix=''){const hashes={};for(const entry of await readdir(directory,{withFileTypes:true})){assert.equal(entry.isSymbolicLink(),false);const name=prefix+entry.name;if(entry.isDirectory())Object.assign(hashes,await fileHashes(directory+'/'+entry.name,name+'/'));else hashes[name]=hash(await readFile(directory+'/'+entry.name));}return hashes;}
async function snapshot(database){const db=knex({client:'mysql2',connection:{...connection,database},pool:{min:0,max:1}});try{const [tables]=await db.raw('SHOW TABLES'),data={},summary={};for(const record of tables){const table=Object.values(record)[0];const rows=(await db(table).select('*')).map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort();data[table]=rows;summary[table]={rows:rows.length,sha256:hash(JSON.stringify(rows))};}return{data,summary};}finally{await db.destroy();}}
async function command(binary,args,input){return new Promise((done,fail)=>{const child=spawn(binary,args,{windowsHide:true,stdio:['pipe','ignore','pipe']});child.stderr.resume();child.on('error',()=>fail(Error('Database utility failed to start')));child.on('close',code=>code===0?done():fail(Error('Database utility exit '+code+'; credentials withheld')));if(input)createReadStream(input).pipe(child.stdin);else child.stdin.end();});}
try{
 const before=await snapshot(setup.database);await writeFile(directory+'/source-private.json',JSON.stringify(before.data),{mode:0o600});
 const options=directory+'/client-private.ini';assert.match(engine.password,/^[A-Za-z0-9!_-]+$/);
 await writeFile(options,'[client]\nhost=127.0.0.1\nport=3330\nuser=php2_test_admin\npassword='+engine.password+'\nprotocol=tcp\n',{mode:0o600,flag:'wx'});
 const dump=directory+'/uat-private.sql',bin=resolve('tmp/production-readiness/remote-mariadb/mariadb-10.11.19-winx64/bin');
 const dumpStarted=performance.now();await command(bin+'/mariadb-dump.exe',['--defaults-extra-file='+options,'--single-transaction','--skip-comments','--hex-blob','--result-file='+dump,setup.database]);const dumpMilliseconds=Math.round(performance.now()-dumpStarted);
 const sql=await readFile(dump);assert.ok(sql.length>0);assert.doesNotMatch(sql.toString('utf8'),/^\s*(?:USE\s|CREATE DATABASE)/im);
 const clone='upms_test_php_6_restore_'+run;assert.match(clone,/^upms_test_php_6_restore_\d+$/);assert.notEqual(clone,setup.database);
 const existing=await admin('information_schema.SCHEMATA').where({SCHEMA_NAME:clone}).first();assert.equal(existing,undefined);
 await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[clone]);
 const restoreStarted=performance.now();await command(bin+'/mariadb.exe',['--defaults-extra-file='+options,clone],dump);const importMilliseconds=Math.round(performance.now()-restoreStarted);
 const restored=await snapshot(clone);assert.deepEqual(restored.data,before.data);assert.deepEqual((await snapshot(setup.database)).data,before.data);
 const user='php6_restore_'+run,password=randomBytes(32).toString('hex');await grantPhp6(admin,clone,user,password);
 const inquiryHashes=await fileHashes(setup.directory+'/inquiries');await cp(setup.directory+'/inquiries',directory+'/inquiries-restored',{recursive:true,errorOnExist:true,force:false});assert.deepEqual(await fileHashes(directory+'/inquiries-restored'),inquiryHashes);assert.deepEqual(await fileHashes(setup.directory+'/inquiries'),inquiryHashes);
 const envFile=directory+'/php.env';let env=await readFile(setup.env,'utf8');for(const [key,value]of Object.entries({UPMS_DB_DATABASE:clone,UPMS_DB_USERNAME:user,UPMS_DB_PASSWORD:password,INQUIRY_STORAGE:'"'+directory.replaceAll('\\','/')+'/inquiries-restored"'}))env=env.replace(new RegExp('^'+key+'=.*$','m'),key+'='+value);await writeFile(envFile,env,{mode:0o600,flag:'wx'});
 const cloneSetup={...setup,env:envFile,database:clone};await writeFile(directory+'/setup.json',JSON.stringify(cloneSetup,null,2),{mode:0o600});
 const result={passed:true,source:setup.database,clone,dumpSha256:hash(sql),dumpBytes:sql.length,timings:{dumpMilliseconds,importMilliseconds,backupRestoreAndComparisonMilliseconds:Math.round(performance.now()-started)},tables:before.summary,inquiryFiles:inquiryHashes,inquiryFilesIdentical:true,allRowsIdentical:true,originalUnchanged:true,quiescedPorts:[9084,9443,9444],applicationVerification:'PENDING',directory,cloneSetupFile:directory+'/setup.json'};
 await writeFile(directory+'/results.json',JSON.stringify(result,null,2));await writeFile('tmp/php-runtime/php75-restore-latest.json',JSON.stringify({directory,cloneSetupFile:result.cloneSetupFile}));console.log(JSON.stringify({passed:true,source:setup.database,clone,tables:Object.keys(before.summary).length,dumpSha256:result.dumpSha256}));
}finally{await admin.destroy();}
