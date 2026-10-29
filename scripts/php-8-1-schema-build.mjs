import knex from 'knex';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {up as identity} from '../server/migrations/202610210001_identity.js';
import {up as business} from '../server/simple-v1-migrations/202610240001_simple_v1.js';
import {up as pricing} from '../server/simple-v1-migrations/202610240002_entry_fixes.js';
import {roles,permissions} from '../server/src/identity/catalog.js';
await verifyUatEngine();const e=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),name='upms_test_php_81_oracle_'+Date.now();
const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:e.password},pool:{min:0,max:1}});
try{await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[name]);await db.raw('USE ??',[name]);await identity(db);await business(db);await pricing(db);const [tables]=await db.raw('SHOW TABLES');const plan=[];for(const r of tables){const table=Object.values(r)[0];const [[ddl]]=await db.raw('SHOW CREATE TABLE ??',[table]);plan.push({table,sql:ddl['Create Table'].replace(/ AUTO_INCREMENT=\d+/g,'')});}
// Preserve dependency order from historical migrations; independent from SHOW TABLES ordering.
const order=['identity_guard','users','roles','permissions','user_roles','role_permissions','sessions','identity_audit_events','login_attempts','v1_control','v1_items','v1_parties','v1_stock','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands'];
await mkdir('upms.php/resources',{recursive:true});await writeFile('upms.php/resources/production-schema.json',JSON.stringify({version:'php81-clean-v1',sourceMigrations:['202610210001_identity','202610240001_simple_v1','202610240002_entry_fixes'],tables:order.map(t=>plan.find(p=>p.table===t)),roles,permissions},null,2)+'\n');console.log(JSON.stringify({passed:true,tables:plan.length,businessRecords:0,productionContacted:false}));}finally{await db.destroy();}
