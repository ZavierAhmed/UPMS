import assert from 'node:assert/strict';
import {readFile,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import knex from 'knex';

// Read-only positive identification, before provisioning any synthetic schema.
export async function verifyUatEngine() {
 const engine=JSON.parse(await readFile('tmp/php-runtime/php2-engine.json','utf8'));
 assert.equal(engine.port,3330);
 const expected=await realpath('tmp/php-runtime/php2-engine-1793148736638');
 assert.equal(resolve(engine.data),expected);
 const db=knex({client:'mysql2',connection:{host:'127.0.0.1',port:3330,user:'php2_test_admin',password:engine.password},pool:{min:0,max:1}});
 try {
  const [[row]]=await db.raw('SELECT VERSION() version,@@port port,@@datadir datadir,@@bind_address binding');
  assert.match(row.version,/^10\.11\.19-MariaDB/);
  assert.equal(Number(row.port),3330);
  const normalized=p=>resolve(p).replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
  assert.equal(normalized(row.datadir),normalized(expected));
  assert.equal(row.binding,'127.0.0.1');
  return {version:row.version,port:3330,binding:row.binding,dataDirectoryVerified:true};
 } finally {await db.destroy();}
}
