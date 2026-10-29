import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import net from 'node:net';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
await verifyUatEngine();
for(const port of [9485,9483,9484])await new Promise((done,fail)=>{const s=net.connect({host:'127.0.0.1',port});s.on('connect',()=>{s.destroy();fail(Error('Revised UAT port occupied; preserve existing services'));});s.on('error',done);});
const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
const password=randomBytes(24).toString('base64url')+'!7aA';
const env={...process.env,PHP_TEST_ADMIN_USER:'php2_test_admin',PHP_TEST_ADMIN_PASSWORD:engine.password,PHP_BROWSER_ADMIN_PASSWORD:password,PHP_BROWSER_PRIVATE:'1'};
for(const script of ['scripts/php-6-browser-setup.mjs','scripts/php-7-browser-prepare.mjs'])await new Promise((done,fail)=>{const child=spawn(process.execPath,[script],{env,windowsHide:true,stdio:'ignore'});child.on('error',()=>fail(Error('Revised fixture preparation could not start')));child.on('close',code=>code===0?done():fail(Error('Revised fixture preparation failed; credentials withheld')));});
const setup=JSON.parse(await readFile('tmp/php-runtime/php7-browser-latest.json','utf8'));assert.match(setup.database,/^upms_test_php_6_browser_\d+$/);
const ports=s=>s.replaceAll('9443','9483').replaceAll('9444','9484').replaceAll('9084','9485');
await writeFile(setup.env,ports(await readFile(setup.env,'utf8')));await writeFile(setup.config,ports(await readFile(setup.config,'utf8')));
await writeFile(setup.directory+'/credentials.json',JSON.stringify({username:'php-admin',password},null,2),{mode:0o600,flag:'wx'});
// Apply the required private-origin headers to actual Apache responses as well as Laravel.
const privateHeaders=await readFile('upms.php/deployment/management.htaccess.example','utf8');
const directives=privateHeaders.split('\n').filter(line=>line.startsWith('Header ')).join('\n');
let apache=await readFile(setup.config,'utf8');
// Scope management headers to the new private listener; public caching stays independent.
apache=apache.replace('DocumentRoot ','<If "%{SERVER_PORT} == \'9484\'">\n'+directives+'\n</If>\nDocumentRoot ');
apache=apache.replace('RewriteRule ^management(?:/|$)', 'RewriteRule ^products/custom/?$ - [R=404,END]\nRewriteRule ^management(?:/|$)');
// Local-only retirement response and sitemap; production generator uses the same route manifest.
apache=apache.replace('Listen 127.0.0.1:9483 https','Listen 127.0.0.1:9483 https').replace('<VirtualHost 127.0.0.1:9483>', '<VirtualHost 127.0.0.1:9483>\nErrorDocument 404 /_pages/404.html');
const manifest=JSON.parse(await readFile('upms.client/dist/public-routes.json','utf8'));
await writeFile(setup.publicRoot+'/sitemap.xml','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+manifest.pages.map(p=>'<url><loc>https://127.0.0.1:9483'+p.path+'</loc></url>').join('')+'</urlset>');
await writeFile(setup.publicRoot+'/robots.txt','User-agent: *\nDisallow: /\n');
await writeFile(setup.config,apache);
await writeFile('tmp/php-runtime/php79-uat-latest.json',JSON.stringify({...setup,publicOrigin:'https://127.0.0.1:9483',managementOrigin:'https://127.0.0.1:9484'},null,2));
console.log(JSON.stringify({prepared:true,database:setup.database,directory:setup.directory,credentialsFile:setup.directory+'/credentials.json',ownerUatChanged:false,servicesStarted:false}));
