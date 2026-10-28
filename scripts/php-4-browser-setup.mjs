import assert from 'node:assert/strict';
import {mkdir,writeFile,cp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import knex from 'knex';
import {up as identitySchema} from '../server/migrations/202610210001_identity.js';
import {up as v1Schema} from '../server/simple-v1-migrations/202610240001_simple_v1.js';
import {up as entrySchema} from '../server/simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../server/src/identity/service.js';
import {grantPhp4} from './php-2-runtime-grants.mjs';

assert.ok(process.env.PHP_TEST_ADMIN_PASSWORD);
const connection={host:'127.0.0.1',port:3330,user:process.env.PHP_TEST_ADMIN_USER||'root',password:process.env.PHP_TEST_ADMIN_PASSWORD};
const admin=knex({client:'mysql2',connection,pool:{min:0,max:1}});let db;
try{
 const [[engine]]=await admin.raw('SELECT VERSION() AS v,@@port AS p');assert.match(engine.v,/^10\.11\.19-MariaDB/);assert.equal(Number(engine.p),3330);
 const run=Date.now().toString(),database='upms_test_php_4_browser_'+run,user='php4_browser_'+run,password=randomBytes(32).toString('hex');
 await admin.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[database]);db=knex({client:'mysql2',connection:{...connection,database},pool:{min:0,max:1}});
 await identitySchema(db);await v1Schema(db);await entrySchema(db);await createIdentityService(db).bootstrap({username:'php-admin',displayName:'Synthetic browser administrator',password:'Synthetic-PHP2-Only-2026!'});
 await db('v1_control').where({id:1}).update({operator_id:'1',state:'READY',cutover_evidence:'Isolated PHP-4 browser acceptance'});await grantPhp4(admin,database,user,password);
 const directory=resolve('tmp/php-runtime/php4-browser-'+run),root=directory+'/public';await mkdir(root,{recursive:true});
 await cp('upms.client/dist/management',root+'/management',{recursive:true});
 const html=await readFile(root+'/management/index.html','utf8');await writeFile(root+'/management/index.html',html.replace('<html','<html data-upms-mode="simple-v1"'));
 const env=directory+'/php.env';await writeFile(env,`APP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nCACHE_STORE=array\nSESSION_DRIVER=array\nUPMS_ENABLED=true\nUPMS_ORIGIN=https://127.0.0.1:9444\nUPMS_DB_HOST=127.0.0.1\nUPMS_DB_PORT=3330\nUPMS_DB_DATABASE=${database}\nUPMS_DB_USERNAME=${user}\nUPMS_DB_PASSWORD=${password}\n`);
 const base=resolve('upms.php').replaceAll('\\','/');
 await writeFile(root+'/backend.php',`<?php\nrequire '${base}/vendor/autoload.php';\n$app=require '${base}/bootstrap/app.php';\n$env=getenv('UPMS_PHP2_ENV');\n$app->useEnvironmentPath(dirname($env));\n$app->loadEnvironmentFrom(basename($env));\n$app->handleRequest(\\Illuminate\\Http\\Request::capture());\n`);
 const d=directory.replaceAll('\\','/'),r=root.replaceAll('\\','/');
 const modules=['authz_core','authz_host','dir','mime','log_config','rewrite','proxy','proxy_fcgi','ssl','socache_shmcb'];
 const conf=`ServerRoot "C:/xampp/apache"\nListen 127.0.0.1:9444 https\nServerName 127.0.0.1\nPidFile "${d}/httpd.pid"\nErrorLog "${d}/apache-error.log"\nLogLevel warn\n${modules.map(m=>`LoadModule ${m}_module modules/mod_${m}.so`).join('\n')}\nTypesConfig "C:/xampp/apache/conf/mime.types"\nDocumentRoot "${r}"\n<Directory "${r}">\nRequire all granted\nAllowOverride None\nOptions -Indexes -MultiViews\nDirectoryIndex disabled\nRewriteEngine On\nRewriteRule ^(?:api(?:/|$)|healthz$|readyz$) backend.php [END]\nRewriteRule ^management/?$ management/index.html [END]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^management(?:/.*)?$ management/index.html [END]\n</Directory>\n<FilesMatch "\\.php$">\nSetHandler "proxy:fcgi://127.0.0.1:9084/"\n</FilesMatch>\nProxyFCGIBackendType GENERIC\nSSLEngine on\nSSLCertificateFile "${d}/server.crt"\nSSLCertificateKeyFile "${d}/server.key"\n`;
 await writeFile(directory+'/httpd.conf',conf+`ProxyFCGISetEnvIf "true" SCRIPT_FILENAME "${r}/backend.php"\n`);await writeFile('tmp/php-runtime/php4-browser-latest.json',JSON.stringify({directory,root,env,database,config:directory+'/httpd.conf'},null,2));
 console.log(JSON.stringify({database,directory,ownerDatabaseContacted:false}));
}finally{await db?.destroy();await admin.destroy();}
