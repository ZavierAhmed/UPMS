import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {readFileSync} from 'node:fs';
import {createPublicApp} from '../src/public-app.js';
import {loadConfig} from '../src/config/index.js';
import {valid} from './helpers.js';
const config=()=>loadConfig({NODE_ENV:'testing',ALLOWED_HOSTS:'localhost',INQUIRY_MODE:'Disabled'});
test('public entry has no database imports and no management mounts',async()=>{
 const app=createPublicApp({config:config(),delivery:async()=> 'Unavailable'});
 assert.equal(app.locals.identityDatabase,undefined);
 assert.doesNotMatch(readFileSync('server/src/public-app.js','utf8'),/from ['"][^'"]*(?:identity|simple-v1|business|godaddy)/);
 for(const path of ['/management','/management/assets/index.js','/admin','/api/v1/management/session/csrf'])assert.equal((await request(app).get(path).set('Host','localhost')).status,404);
 assert.deepEqual((await request(app).get('/healthz').set('Host','localhost')).body,{status:'ok',surface:'public-website',managementEnabled:false});
});
test('public entry preserves prerendered routes, source catalogs and strict host checks',async()=>{
 const api=request(createPublicApp({config:config(),delivery:async()=> 'Unavailable'}));
 for(const path of ['/','/about','/products','/products/buckets','/products/cans','/products/containers','/products/stickers','/products/cartons','/manufacturing','/industries','/contact'])assert.equal((await api.get(path).set('Host','localhost')).status,200);
 const head=await api.head('/downloads/products/v2/Bucket.pdf').set('Host','localhost');assert.equal(head.status,200);assert.equal(head.headers['content-type'],'application/pdf');
 assert.equal((await api.get('/').set('Host','app.unique-plastic.com')).status,400);
});
test('public entry keeps SMTP disabled and rejects private-path fallbacks',async()=>{
 let called=false;const api=request(createPublicApp({config:config(),delivery:async()=>{called=true;return 'Unavailable';}}));
 for(const path of ['/.env','/vendor/autoload.php','/storage/logs/laravel.log','/composer.json'])assert.equal((await api.get(path).set('Host','localhost')).status,404);
 const response=await api.post('/api/v1/public/inquiries').set('Host','localhost').set('Idempotency-Key','00000000-0000-4000-8000-000000000000').send(valid);
 assert.notEqual(response.status,200);assert.equal(called,false);
});
