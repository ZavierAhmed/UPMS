import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createManagementDisabledPreview,createBlockedPreview} from '../src/godaddy/preview.js';
import {platformPort} from '../src/godaddy/management-index.js';
import {previewHostname} from '../src/godaddy/policy.js';
import {databaseConfig} from '../src/identity/config.js';
const secret='PRIVATE_INJECTED_DB_PASSWORD_CANARY';
const env={NODE_ENV:'production',UPMS_HOSTING_PROFILE:'godaddy-management-disabled',UPMS_DATABASE_PROFILE:'godaddy-managed',PUBLIC_ORIGIN:'https://'+previewHostname,MANAGEMENT_ORIGIN:'https://'+previewHostname,ALLOWED_HOSTS:previewHostname,MANAGEMENT_ENABLED:'true',TRUSTED_PROXY_IPS:'127.0.0.1',DB_HOST:'unused.provider.test',DB_PORT:'3306',DB_NAME:'private-schema',DB_USER:'private-user',DB_PASSWORD:secret};
const hit=(app,path)=>request(app).get(path).set('Host',previewHostname).set('X-Forwarded-Proto','https');
test('management compliance mode tolerates injected DB credentials without making them usable',async()=>{
 const app=createManagementDisabledPreview(env),r=await hit(app,'/management');assert.equal(r.status,200);assert.ok(r.text.includes('<fieldset disabled>'));assert.ok(!/<script\b/i.test(r.text));assert.ok(!r.text.includes(secret));assert.ok(!r.text.includes(env.DB_NAME));assert.equal(r.headers['set-cookie'],undefined);
 const health=await hit(app,'/healthz');assert.deepEqual(health.body,{status:'blocked',code:'GODADDY_COMPATIBILITY_BLOCKED',mode:'disabled-management-preview',operational:false,database:'unconnected'});assert.equal(health.headers['x-robots-tag'],'noindex, nofollow');
 assert.throws(()=>databaseConfig(env),{code:'GODADDY_COMPATIBILITY_BLOCKED'});
 assert.throws(()=>createBlockedPreview({...env,UPMS_HOSTING_PROFILE:'godaddy-preview-blocked'}),{code:'GODADDY_COMPATIBILITY_BLOCKED'});
});
test('known management deep links return only the same disabled shell',async()=>{
 const app=createManagementDisabledPreview(env);
 for(const path of ['/management/','/management/challans','/management/documents/1','/management/challan-returns/new','/management/clients/1/edit','/management/reports']){const r=await hit(app,path);assert.equal(r.status,200,path);assert.match(r.text,/Sign-in and all business operations are disabled/);assert.ok(!/<script\b/i.test(r.text));}
 for(const path of ['/about','/products','/contact','/assets/index.js','/public-routes.json','/management/.env','/management/server/src/index.js','/.env','/deployment-manifest.json','/server/src/app.js','/management/assets/missing.js'])assert.equal((await hit(app,path)).status,404,path);
});
test('every management API method stays blocked including auth, returns and operational posts',async()=>{
 const app=createManagementDisabledPreview(env);
 for(const method of ['get','post','put','patch','delete'])for(const path of ['/api/v1/management/session/login','/api/v1/management/simple-v1/documents','/api/v1/management/simple-v1/documents/1/post']){
  const r=await request(app)[method](path).set('Host',previewHostname).set('X-Forwarded-Proto','https').set('Origin','https://untrusted.test').send({password:secret});assert.equal(r.status,503);assert.deepEqual(r.body,{error:{code:'GODADDY_COMPATIBILITY_BLOCKED'}});assert.equal(r.headers['set-cookie'],undefined);assert.ok(!JSON.stringify(r.body).includes(secret));
 }
});
test('fixed approved management origins do not become an arbitrary host allowlist',async()=>{
 for(const patch of [{ALLOWED_HOSTS:'*'},{MANAGEMENT_ORIGIN:'https://other.preview.c35.airoapp.ai'},{PUBLIC_ORIGIN:'https://unique-plastic.com'},{ALLOWED_HOSTS:previewHostname+';app.unique-plastic.com'},{MANAGEMENT_ORIGIN:'http://'+previewHostname}])assert.throws(()=>createManagementDisabledPreview({...env,...patch}));
 const future=createManagementDisabledPreview({...env,PUBLIC_ORIGIN:'https://app.unique-plastic.com',MANAGEMENT_ORIGIN:'https://app.unique-plastic.com',ALLOWED_HOSTS:'app.unique-plastic.com'});assert.equal((await request(future).get('/management').set('Host','app.unique-plastic.com').set('X-Forwarded-Proto','https')).status,200);
 const app=createManagementDisabledPreview(env);assert.equal((await request(app).get('/healthz').set('Host','bad.test').set('X-Forwarded-Host',previewHostname).set('X-Forwarded-Proto','https')).status,400);
 const untrusted=createManagementDisabledPreview({...env,TRUSTED_PROXY_IPS:''});assert.equal((await hit(untrusted,'/management')).status,307);
});
test('operational, credential and one-shot selectors cannot change the persistent disabled mode',()=>{
 for(const patch of [{UPMS_PRODUCTION_POSTING:'owner-approved'},{UPMS_SIMPLE_V1:'production-v1'},{UPMS_DIAGNOSTIC_MODE:'read-only-once'},{SESSION_SECRET:secret},{UPMS_OPERATION_APPROVAL:'fixture'},{DB_OWNER_PASSWORD:secret},{UPMS_DATABASE_PROFILE:'local-mysql'},{UPMS_HOSTING_PROFILE:'godaddy-preview-blocked'}])assert.throws(()=>createManagementDisabledPreview({...env,...patch}));
});
test('platform PORT is explicit, canonical and bounded without development fallback',()=>{
 for(const port of ['1','3000','65535'])assert.equal(platformPort(port),Number(port));for(const port of [undefined,'','0','-1','65536','3000.0','0x1234',' 3000','03000','abc'])assert.throws(()=>platformPort(port));
});
