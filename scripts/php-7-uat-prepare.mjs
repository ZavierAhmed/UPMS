// Owner-run preparation for the separate PHP-7.5 UAT. Does not start services.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));assert.equal(engine.port,3330);
const password=randomBytes(24).toString('base64url')+'!7aA';
const env={...process.env,PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:engine.password,PHP_BROWSER_ADMIN_PASSWORD:password,PHP_BROWSER_PRIVATE:'1'};
for(const script of ['scripts/php-6-browser-setup.mjs','scripts/php-7-browser-prepare.mjs'])await new Promise((done,fail)=>{const c=spawn(process.execPath,[script],{env,windowsHide:true,stdio:['ignore','ignore','ignore']});c.on('error',()=>fail(Error('Synthetic UAT preparation could not start')));c.on('exit',code=>code===0?done():fail(Error('Synthetic UAT preparation failed in '+script+' (exit '+code+'); no credentials logged')));});
const setup=JSON.parse(await readFile('tmp/php-runtime/php7-browser-latest.json','utf8'));
await writeFile(setup.directory+'/credentials.json',JSON.stringify({username:'php-admin',password},null,2),{mode:0o600,flag:'wx'});
await writeFile('tmp/php-runtime/php7-uat-latest.json',JSON.stringify(setup,null,2),{mode:0o600});
console.log(JSON.stringify({prepared:true,database:setup.database,directory:setup.directory,credentialsFile:setup.directory+'/credentials.json',servicesStarted:false,ownerDatabaseContacted:false}));
