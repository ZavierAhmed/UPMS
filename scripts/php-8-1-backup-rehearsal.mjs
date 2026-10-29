import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import knex from 'knex';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';
import {up as identity} from '../server/migrations/202610210001_identity.js';
import {up as v1} from '../server/simple-v1-migrations/202610240001_simple_v1.js';
import {up as pricing} from '../server/simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../server/src/identity/service.js';
await verifyUatEngine();const c=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8')),schema='upms_test_php_6_backup_'+Date.now();const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:c.password},pool:{min:0,max:1}});
try{await db.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);await db.raw('USE ??',[schema]);await identity(db);await v1(db);await pricing(db);await createIdentityService(db).bootstrap({username:'historical-dummy',displayName:'Synthetic historical account',password:randomBytes(32).toString('hex')});await db.schema.createTable('upms_remote_initialization',t=>{t.engine('InnoDB');t.charset('utf8mb4');t.integer('id').primary();t.text('history');});await db('upms_remote_initialization').insert({id:1,history:'Synthetic legacy initialization history retained in backup only'});}finally{await db.destroy();}
process.env.PHP8_BACKUP_SCHEMA=schema;await import('./php-8-local-restore.mjs');
