// Existing suites, unchanged, on a separate fresh MySQL instance. No owner DB.
import knex from 'knex';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {up as identity} from '../migrations/202610210001_identity.js';
import {up as simple} from '../simple-v1-migrations/202610240001_simple_v1.js';
import {up as entry} from '../simple-v1-migrations/202610240002_entry_fixes.js';
import {createIdentityService} from '../src/identity/service.js';
import {simpleV1RuntimePrivileges} from '../src/identity/grants.js';
const secret=()=>randomBytes(40).toString('base64url');let owner,setup;
try{
 assert.equal(process.env.DB_HOST,'127.0.0.1');assert.equal(process.env.DB_PORT,'3309');assert.ok(process.env.UPMS_DCR_BOOTSTRAP_PASSWORD?.length>=32);
 const connection={host:'127.0.0.1',port:3309,user:'root',password:''};owner=knex({client:'mysql2',connection,pool:{min:0,max:1}});
 const [[state]]=await owner.raw('SELECT @@server_id s,@@innodb_force_recovery r');assert.equal(Number(state.s),331627);assert.equal(Number(state.r),0);
 await owner.raw("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[process.env.UPMS_DCR_BOOTSTRAP_PASSWORD]);connection.password=process.env.UPMS_DCR_BOOTSTRAP_PASSWORD;owner.client.connectionSettings.password=connection.password;
 for(const [target,suite]of [['05','simple-v12b.integration.js'],['06','simple-v12.integration.js']]){
  const schema='upms_test_simplev12b_20261024_'+target,user='upms_runtime_v12b_'+target,runtime=secret(),password=secret();
  assert.equal((await owner.raw('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[schema]))[0].length,0);
  await owner.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',[schema]);setup=knex({client:'mysql2',connection:{...connection,database:schema},pool:{min:0,max:1}});
  await identity(setup);await simple(setup);await entry(setup);const operator=await createIdentityService(setup).bootstrap({username:'v1_operator',displayName:'Synthetic Regression Operator',password});await setup('v1_control').where({id:1}).update({operator_id:operator,state:'READY',cutover_evidence:'Disposable fresh SQL regression; no company data.'});
  await owner.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',runtime]);for(const [table,rights]of Object.entries(simpleV1RuntimePrivileges))await owner.raw('GRANT '+rights.join(',')+' ON ??.?? TO ?@?',[schema,table,user,'localhost']);
  await setup.destroy();setup=null;
  const result=spawnSync(process.execPath,['--test','server/tests/mysql/'+suite],{env:{...process.env,NODE_ENV:'development',DB_NAME:schema,DB_CONFIRM_NAME:schema,DB_USER:user,DB_PASSWORD:runtime,IDENTITY_DB_PURPOSE:'runtime',DB_ALLOW_MARIADB_COMPATIBILITY:'true',UPMS_SIMPLE_V1:'synthetic-v1',SESSION_SECRET:secret(),V1_OPERATOR_PASSWORD:password,MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:'http://127.0.0.1:3114'},stdio:'inherit',windowsHide:true,timeout:180000});assert.equal(result.status,0,suite);
 }
}catch(error){console.error(JSON.stringify({failed:true,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Preserve synthetic state and inspect locally.'}));process.exitCode=1;}
finally{await setup?.destroy();await owner?.destroy();}
