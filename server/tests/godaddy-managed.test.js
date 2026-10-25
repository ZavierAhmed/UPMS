import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {assertDatabaseProfile,assessIsolation,verifiedTlsOptions,assertTlsSession,verifyManagedIdentity,verifyManagedRuntimeGrants,previewHostname} from '../src/godaddy/policy.js';
import {createBlockedPreview} from '../src/godaddy/preview.js';
import {databaseConfig} from '../src/identity/config.js';
import {productionProfile} from '../src/production/profile.js';
import {productionRuntimePrivileges} from '../src/identity/grants.js';

const env={NODE_ENV:'production',UPMS_HOSTING_PROFILE:'godaddy-preview-blocked',UPMS_DATABASE_PROFILE:'godaddy-managed',PUBLIC_ORIGIN:'https://'+previewHostname,MANAGEMENT_ORIGIN:'https://'+previewHostname,ALLOWED_HOSTS:previewHostname,MANAGEMENT_ENABLED:'true',TRUSTED_PROXY_IPS:'127.0.0.1'};
const blocked=fn=>assert.throws(fn,e=>e.code==='GODADDY_COMPATIBILITY_BLOCKED');
test('unverified managed profile never opens the legacy or production database path',()=>{
  for(const patch of [{},{DB_HOST:'127.0.0.1'},{DB_HOST:'unapproved.example.com'},{UPMS_SIMPLE_V1:'production-v1'},{UPMS_GODADDY_APPROVED:'true'}]){
    blocked(()=>databaseConfig({...env,...patch}));blocked(()=>productionProfile({...env,...patch}));
  }
  assert.doesNotThrow(()=>assertDatabaseProfile({}));assert.throws(()=>assertDatabaseProfile({UPMS_DATABASE_PROFILE:'typo'}));
});
const preview={controlPlaneReference:'fixture-preview',databaseId:'db-stage',schema:'stage_fixture',serverUuid:'stage-server',user:'stage_runtime',crossDatabaseAccessDenied:true,secretScope:'preview-only'};
const publish={controlPlaneReference:'fixture-publish',databaseId:'db-live',schema:'live_fixture',serverUuid:'live-server',user:'live_runtime',crossDatabaseAccessDenied:true,secretScope:'publish-only'};
test('assessment rejects shared database, shared credential and unproven isolation',()=>{
  assert.deepEqual(assessIsolation(preview,publish),{isolated:true,productionPostingAllowed:false});
  for(const patch of [{databaseId:preview.databaseId},{user:preview.user},{controlPlaneReference:''},{crossDatabaseAccessDenied:false},{secretScope:'preview-only'},{serverUuid:preview.serverUuid,schema:preview.schema}])blocked(()=>assessIsolation(preview,{...publish,...patch}));
  blocked(()=>assessIsolation(preview,null));
});
test('TLS options require one exact DNS endpoint and CA; verification cannot be disabled',()=>{
  const ca='-----BEGIN CERTIFICATE-----\nfixture only\n-----END CERTIFICATE-----';
  assert.deepEqual(verifiedTlsOptions('mysql.fixture.test','mysql.fixture.test',ca),{ca,rejectUnauthorized:true,verifyIdentity:true,minVersion:'TLSv1.2'});
  for(const host of ['other.fixture.test','127.0.0.1','localhost','mysql.fixture.test:3306','mysql.fixture.test/path','*.fixture.test','mysql.fixture.test.'])blocked(()=>verifiedTlsOptions(host,'mysql.fixture.test',ca));
  blocked(()=>verifiedTlsOptions('mysql.fixture.test','mysql.fixture.test',''));
});
test('plain, unauthenticated or obsolete TLS sessions are rejected before SQL',()=>{
  for(const stream of [null,{}, {encrypted:true,authorized:false},{encrypted:true,authorized:true,getProtocol:()=> 'TLSv1.1',getPeerCertificate:()=>({})}])blocked(()=>assertTlsSession(stream,'mysql.fixture.test'));
});
const identity={serverUuid:'fixture-server-uuid',schema:'stage_fixture',account:'stage_runtime@provider-network',version:'8.4.13',serverId:'331225',port:3312,forceRecovery:0,readOnly:0,sslCipher:'TLS_AES_256_GCM_SHA384'};
test('assessment pins actual MySQL instance, schema, account, version and TLS cipher',()=>{
  assert.equal(verifyManagedIdentity(identity,identity).verified,true);
  for(const patch of [{serverUuid:'other'},{schema:'live_fixture'},{account:'root@localhost'},{version:'8.0.16'},{serverId:9},{port:3306},{forceRecovery:1},{readOnly:1},{sslCipher:''}])blocked(()=>verifyManagedIdentity({...identity,...patch},identity));
  assert.throws(()=>verifyManagedIdentity({...identity,version:'10.4.32-MariaDB'},{...identity,version:'10.4.32-MariaDB'}));
});
test('managed account assessment permits only the original exact table rights',()=>{
  const rows=Object.entries(productionRuntimePrivileges).map(([table,rights])=>({g:`GRANT ${rights.join(', ')} ON stage_fixture.${table} TO account`}));
  const verify=r=>verifyManagedRuntimeGrants(r,'stage_fixture',identity.account,identity.account);
  assert.equal(verify(rows).verified,true);
  for(const extra of ['GRANT ALL PRIVILEGES ON stage_fixture.* TO account','GRANT SELECT ON live_fixture.users TO account','GRANT SELECT ON *.* TO account','GRANT UPDATE ON stage_fixture.v1_audit TO account','GRANT SELECT ON stage_fixture.users TO account WITH GRANT OPTION'])blocked(()=>verify([...rows,{g:extra}]));
  blocked(()=>verify(rows.slice(1)));blocked(()=>verifyManagedRuntimeGrants(rows,'stage_fixture','other@provider-network',identity.account));
});
test('blocked preview requires exact host, HTTPS origin and no posting or private credentials',()=>{
  for(const patch of [{ALLOWED_HOSTS:'*.airoapp.ai'},{PUBLIC_ORIGIN:'https://app.unique-plastic.com'},{MANAGEMENT_ORIGIN:'http://'+previewHostname},{UPMS_PRODUCTION_POSTING:'synthetic-reviewed'},{DB_PASSWORD:'fixture-only'},{SESSION_SECRET:'fixture-only'},{UPMS_HOSTING_PROFILE:'godaddy-preview'}])blocked(()=>createBlockedPreview({...env,...patch}));
  assert.throws(()=>createBlockedPreview({...env,TRUSTED_PROXY_IPS:'*'}));
});
const hit=(app,path)=>request(app).get(path).set('Host',previewHostname).set('X-Forwarded-Proto','https');
test('preview root routes only to a disabled management login with no session cookie',async()=>{
  const app=createBlockedPreview(env),root=await hit(app,'/');assert.equal(root.status,303);assert.equal(root.headers.location,'/management');
  const login=await hit(app,'/management');assert.equal(login.status,200);assert.match(login.text,/Staff sign in/);assert.match(login.text,/<fieldset disabled>/);assert.doesNotMatch(login.text,/<script\b/);assert.equal(login.headers['set-cookie'],undefined);assert.match(login.headers['cache-control'],/no-store/);assert.match(login.headers['content-security-policy'],/frame-ancestors 'none'/);assert.ok(login.headers['strict-transport-security']);
});
test('all management API methods remain unavailable and private/public routes stay hidden',async()=>{
  const app=createBlockedPreview(env);
  for(const method of ['get','post','put','patch','delete']){
    const r=await request(app)[method]('/api/v1/management/session/login').set('Host',previewHostname).set('X-Forwarded-Proto','https').set('Origin','https://other.example.com').send({password:'test-only'});
    assert.equal(r.status,503);assert.deepEqual(r.body,{error:{code:'GODADDY_COMPATIBILITY_BLOCKED'}});assert.equal(r.headers['set-cookie'],undefined);
  }
  for(const path of ['/about','/products','/.env','/server/src/index.js','/PRODUCTION-HOSTING-READINESS.md','/management/../server'])assert.equal((await hit(app,path)).status,404);
  assert.deepEqual((await hit(app,'/healthz')).body,{status:'blocked',code:'GODADDY_COMPATIBILITY_BLOCKED'});
});
test('preview rejects unknown hosts and ignores forwarded HTTPS from untrusted peers',async()=>{
  const app=createBlockedPreview({...env,TRUSTED_PROXY_IPS:''});
  assert.equal((await request(app).get('/management').set('Host','other.airoapp.ai').set('X-Forwarded-Proto','https')).status,400);
  assert.equal((await hit(app,'/management')).status,307);
  const trusted=createBlockedPreview(env);assert.equal((await request(trusted).get('/management').set('Host',previewHostname).set('X-Forwarded-Proto','https, http')).status,307);
});
