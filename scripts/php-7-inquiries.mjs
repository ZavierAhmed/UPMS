import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import tls from 'node:tls';
import net from 'node:net';
import express from 'express';
import request from 'supertest';
import {inquiryApi} from '../server/src/inquiries/api.js';
import {createSubmissions} from '../server/src/inquiries/submissions.js';
import {createDelivery,buildMessage} from '../server/src/inquiries/delivery.js';
import nodemailer from 'nodemailer';

const php=process.env.PHP7_BINARY;assert.ok(php);const args=JSON.parse(process.env.PHP7_ARGS||'[]');
const directory=resolve('tmp/php-runtime/php7-inquiries-'+Date.now());await mkdir(directory,{recursive:true});
const env=directory+'/test.env';await writeFile(env,`APP_ENV=testing\nAPP_DEBUG=false\nAPP_KEY=base64:${randomBytes(32).toString('base64')}\nUPMS_ENABLED=false\nCACHE_STORE=array\nSESSION_DRIVER=array\n`);
const origin='https://public.unique-plastic.test',valid={customerName:'Synthetic customer',companyName:'Synthetic company',email:'customer@example.test',phone:'+92 300 1234567',productCategory:'cans',quantity:'1000',capacity:'1 litre',message:'Synthetic packaging requirements only.',website:''};
const base={origin,storage:directory+'/journal',rate_limit:1000,timeout_ms:5000,mode:'DevelopmentFile',development:true,smtp:{host:'',port:465,tls:'SslOnConnect',username:'fixture',password:'synthetic-only',from:'sender@example.test',recipient:'inquiries@example.test',cafile:null}};
let comparisons=0;const checks=[];
function phpHttp(config,input={}){return new Promise((done,fail)=>{const child=spawn(php,[...args,'upms.php/tests/Support/inquiry-bridge.php'],{env:{...process.env,UPMS_PHP7_ENV:env},windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{child.kill();fail(Error('PHP timeout'));},15000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',fail);child.on('close',code=>{clearTimeout(timer);try{assert.equal(code,0,err);done(JSON.parse(out));}catch(e){fail(Error(e.message+' '+out.slice(0,500)));}});child.stdin.end(JSON.stringify({config,raw:JSON.stringify(valid),headers:{origin,'idempotency-key':randomUUID()},...input}));});}
function reference(config,delivery){const c={inquiryOrigin:origin,rateLimit:config.rate_limit,timeoutMs:config.timeout_ms,mode:config.mode,development:config.development,outbox:directory+'/node-outbox',smtp:{...config.smtp,tlsMode:config.smtp.tls,user:config.smtp.username,pass:config.smtp.password}};const app=express();app.use((req,res,next)=>{req.peer={ip:'127.0.0.1',secure:true};next();});app.use(inquiryApi(c,createSubmissions(c,delivery||createDelivery(c))));return app;}
function clean(body){const b={...body};assert.match(b.correlationId,/^[0-9a-f]{32}$/);delete b.correlationId;if(b.reference){assert.match(b.reference,/^[0-9a-f]{32}$/);b.reference='<reference>';}if(b.code==='delivery_unknown')b.message=b.message.replace(/[0-9a-f]{32}/,'<reference>');return b;}
async function same(name,input={},config=base,app=reference(config)){const headers={'content-type':'application/json',origin,'idempotency-key':randomUUID(),...input.headers};const p=await phpHttp(config,{...input,headers});let req=request(app)[(input.method||'POST').toLowerCase()](input.path||'/api/v1/public/inquiries').set(headers);if(input.method!=='GET')req=req.send(input.raw??JSON.stringify(valid));const n=await req;assert.equal(p.status,n.status,name+JSON.stringify(p));assert.deepEqual(clean(p.body),clean(n.body),name);assert.equal(p.cookies,0);assert.match(p.headers['cache-control'][0],/no-store/);if(n.status===429)assert.ok(Math.abs(Number(p.headers['retry-after'][0])-Number(n.headers['retry-after']))<=1);comparisons++;checks.push(name);return p;}
const development=await same('development saved');assert.equal(await readFile(base.storage+'/outbox/'+development.body.reference+'.txt','utf8'),buildMessage(valid,development.body.reference,{}).text);checks.push('Exact authoritative plain-text body and reference');
await same('UTF8 BOM',{raw:'\uFEFF'+JSON.stringify(valid)});
await same('Public ignores private session cookie',{cookies:{'__Host-upms-php':'opaque-unusable-test-token'}});
await same('ECMAScript phone whitespace',{raw:JSON.stringify({...valid,phone:'123\uFEFF456789'})});
await same('ECMAScript email whitespace',{raw:JSON.stringify({...valid,email:'user\uFEFFname@example.test'})});
for(const name of ['\ud800','\udfff','\ud800\udc00','\uE000','\uE000d800;','Quoted " \\ literal'])await same('UTF16 code units '+JSON.stringify(name),{raw:JSON.stringify({...valid,customerName:name})});
const surrogateConfig={...base,storage:directory+'/surrogate-replay'},surrogateKey=randomUUID(),surrogateHeaders={origin,'idempotency-key':surrogateKey};
assert.equal((await phpHttp(surrogateConfig,{headers:surrogateHeaders,raw:JSON.stringify({...valid,customerName:'\ud800'})})).status,200);
assert.equal((await phpHttp(surrogateConfig,{headers:surrogateHeaders,raw:JSON.stringify({...valid,customerName:'\ud800'})})).status,200);
assert.equal((await phpHttp(surrogateConfig,{headers:surrogateHeaders,raw:JSON.stringify({...valid,customerName:'\uFFFD'})})).status,409);checks.push('Lone UTF16 surrogate identity remains distinct from replacement character on replay');
for(const [field,max]of [['customerName',100],['companyName',150],['email',254],['phone',40],['productCategory',30],['quantity',80],['capacity',80],['message',4000]])await same(field+' exact maximum error',{raw:JSON.stringify({...valid,[field]:'x'.repeat(max+1)})});
for(const [name,raw]of [['empty','{}'],['null','null'],['array','[]'],['scalar','true'],['syntax','{'],['wrong field type',JSON.stringify({...valid,quantity:2})],['honeypot',JSON.stringify({...valid,website:'bot'})],['case and trim',JSON.stringify({...valid,CUSTOMERNAME:' \uFEFF Last customer \u00a0'})],['unknown nested depth',JSON.stringify({...valid,extra:[[[[[[[[{}]]]]]]]]})],['utf16 limit',JSON.stringify({...valid,customerName:'😀'.repeat(51)})],['short message',JSON.stringify({...valid,message:'short'})],['control characters',JSON.stringify({...valid,customerName:'A\u0085B',message:'Message\u0001error'})],['email quirks',JSON.stringify({...valid,email:'local.@single'})],['invalid category',JSON.stringify({...valid,productCategory:'unknown',phone:'abc'})],['max lengths',JSON.stringify(Object.fromEntries(Object.keys(valid).map(k=>[k,k==='website'?'':'x'.repeat(4010)])))]] ) await same(name,{raw});
for(const category of ['buckets','containers','custom'])await same('category '+category,{raw:JSON.stringify({...valid,productCategory:category})});
for(const [name,headers]of [['cross site',{'sec-fetch-site':'cross-site'}],['foreign origin',{origin:'https://evil.test'}],['invalid origin',{origin:'nonsense'}],['origin default port',{origin:'https://PUBLIC.unique-plastic.test:443/path'}],['wrong type',{'content-type':'Application/JSON'}],['compressed',{'content-encoding':'gzip'}],['bad key',{'idempotency-key':'bad'}],['nil key',{'idempotency-key':'00000000-0000-0000-0000-000000000000'}],['all Fs key',{'idempotency-key':'ffffffff-ffff-ffff-ffff-ffffffffffff'}]])await same(name,{headers});
for(const [method,path]of [['GET','/api/v1/public/inquiries'],['POST','/api/unknown'],['POST','/API/V1/PUBLIC/INQUIRIES/']])await same(method+' '+path,{method,path});
await same('body byte limit',{raw:JSON.stringify({...valid,message:'x'.repeat(17000)})});
const rate={...base,storage:directory+'/rate',rate_limit:2},rateApp=reference(rate);for(let i=0;i<4;i++)await same('rate persisted worker '+i,{headers:{'idempotency-key':'invalid'}},rate,rateApp);
const key=randomUUID(),raceConfig={...base,storage:directory+'/race'};const raced=await Promise.all(Array.from({length:8},()=>phpHttp(raceConfig,{headers:{origin,'idempotency-key':key}})));assert.ok(raced.every(r=>r.status===200));assert.equal(new Set(raced.map(r=>r.body.reference)).size,1);assert.equal((await readdir(raceConfig.storage+'/outbox')).length,1);const conflict=await phpHttp(raceConfig,{headers:{origin,'idempotency-key':key},raw:JSON.stringify({...valid,message:'Changed packaging details.'})});assert.equal(conflict.status,409);const replay=await phpHttp(raceConfig,{headers:{origin,'idempotency-key':key.toUpperCase()}});assert.equal(replay.body.reference,raced[0].body.reference);checks.push('8 independent workers: one handoff, same reference, case insensitive replay, conflict');
await writeFile(directory+'/unavailable','file');const closed=await phpHttp({...base,storage:directory+'/unavailable'});assert.equal(closed.status,503);assert.equal(closed.body.code,'busy');checks.push('storage failure closed');
const cert=directory+'/smtp.crt',keyFile=directory+'/smtp.key';execFileSync('C:/xampp/apache/bin/openssl.exe',['req','-x509','-newkey','rsa:2048','-sha256','-nodes','-keyout',keyFile,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-config','C:/xampp/apache/conf/openssl.cnf'],{stdio:'ignore',windowsHide:true});
const context=tls.createSecureContext({key:await readFile(keyFile),cert:await readFile(cert),minVersion:'TLSv1.2'});let outcome='accepted';const messages=[];const sockets=new Set();
function protocol(socket,secure=false){sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});let buffer='',data=false,message='',auth=false;socket.write('220 isolated synthetic SMTP\r\n');
 function attach(s){const write=s.write.bind(s);s.write=(...args)=>{if(outcome==='slow'){setTimeout(()=>{if(!s.destroyed)write(...args);},350).unref();return true;}return write(...args);};s.on('data',onData);}
 function onData(bytes){buffer+=bytes;while(buffer.includes('\r\n')){const at=buffer.indexOf('\r\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+2);if(data){if(line==='.') {data=false;messages.push(message);message='';if(outcome==='disconnect'){socket.destroy();return;}if(outcome==='unknown'){socket.write('399 Delivery uncertain\r\n');return;}if(outcome==='timeout')return;socket.write('250 2.0.0 accepted synthetic message\r\n');}else message+=line+'\r\n';continue;}
 if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n'+(secure?'250 AUTH PLAIN LOGIN\r\n':'250 STARTTLS\r\n'));
 else if(line==='STARTTLS'){socket.write('220 Upgrade TLS\r\n');socket.removeListener('data',onData);socket=new tls.TLSSocket(socket,{isServer:true,secureContext:context});secure=true;socket.on('error',()=>{});attach(socket);return;}
 else if(/^AUTH PLAIN/.test(line)){assert.ok(secure,'No plaintext AUTH');socket.write(outcome==='auth'?'535 Authentication rejected\r\n':'235 Authenticated\r\n');}
 else if(/^AUTH LOGIN/.test(line)){assert.ok(secure);auth=1;socket.write('334 VXNlcm5hbWU6\r\n');}
 else if(auth){if(auth===1){auth=2;socket.write('334 UGFzc3dvcmQ6\r\n');}else{auth=false;socket.write(outcome==='auth'?'535 Authentication rejected\r\n':'235 Authenticated\r\n');}}
 else if(/^MAIL|^RCPT/.test(line))socket.write(outcome==='rejected'?'550 Rejected synthetic address\r\n':'250 OK\r\n');
 else if(line==='DATA'){data=true;socket.write('354 End with dot\r\n');}else if(line==='QUIT'){socket.end('221 Bye\r\n');}else socket.write('250 OK\r\n');}}
 attach(socket);
}
const implicit=tls.createServer({key:await readFile(keyFile),cert:await readFile(cert),minVersion:'TLSv1.2'},s=>protocol(s,true));implicit.on('tlsClientError',()=>{});const starttls=net.createServer(s=>protocol(s));
await new Promise(r=>implicit.listen(0,'127.0.0.1',r));await new Promise(r=>starttls.listen(0,'127.0.0.1',r));
try{
 for(const mode of ['SslOnConnect','StartTls'])for(const state of ['accepted','rejected','unknown','timeout','auth','slow']){
  outcome=state;const c={...base,mode:'Smtp',storage:directory+'/smtp-'+mode+'-'+state,smtp:{...base.smtp,host:'127.0.0.1',port:(mode==='StartTls'?starttls:implicit).address().port,tls:mode,cafile:cert}};
  if(state==='slow')c.timeout_ms=1800;
  const nodeConfig={mode:'Smtp',smtp:{...c.smtp,tlsMode:mode,user:c.smtp.username,pass:c.smtp.password},timeoutMs:c.timeout_ms};

  // CA bytes, rather than a Promise, are required by Node TLS.
  const ca=await readFile(cert),nodeDelivery=createDelivery(nodeConfig,options=>nodemailer.createTransport({...options,tls:{...options.tls,ca}}));
  const app=reference(c,nodeDelivery),k=randomUUID(),before=messages.length;
  const started=Date.now(),p=await same(mode+' '+state,{headers:{'idempotency-key':k}},c,app);if(['timeout','slow'].includes(state))assert.ok(Date.now()-started<2*c.timeout_ms+2000,'Bounded sequential PHP/Node total timeouts');
  const expected={accepted:200,rejected:502,unknown:503,timeout:503,auth:502,slow:503}[state];assert.equal(p.status,expected,state+JSON.stringify(p.body));
  const after=messages.length,again=await phpHttp(c,{headers:{origin,'idempotency-key':k}});assert.deepEqual(clean(again.body),clean(p.body));assert.equal(messages.length,after,'No SMTP redelivery on replay');if(state==='slow')assert.ok(messages.length-before<=2);else assert.equal(messages.length-before,['accepted','unknown','timeout'].includes(state)?2:0); // one PHP and one Express message
 }
 outcome='disconnect';const disconnected={...base,mode:'Smtp',storage:directory+'/smtp-disconnect',smtp:{...base.smtp,host:'127.0.0.1',port:implicit.address().port,cafile:cert}};assert.equal((await phpHttp(disconnected)).body.code,'delivery_unknown');checks.push('Connection loss after DATA is conservatively unknown; documented Nodemailer ECONNECTION classification difference');
 const untrusted={...base,mode:'Smtp',storage:directory+'/untrusted',smtp:{...base.smtp,host:'127.0.0.1',port:implicit.address().port,cafile:null}};const untrustedResponse=await phpHttp(untrusted);assert.equal(untrustedResponse.body.code,'delivery_unavailable');checks.push('untrusted SMTP certificate rejected');
 outcome='accepted';const concurrent={...base,mode:'Smtp',storage:directory+'/smtp-race',smtp:{...base.smtp,host:'127.0.0.1',port:implicit.address().port,cafile:cert}},duplicateKey=randomUUID(),messageCount=messages.length;
 const duplicates=await Promise.all(Array.from({length:8},()=>phpHttp(concurrent,{headers:{origin,'idempotency-key':duplicateKey}})));assert.ok(duplicates.every(r=>r.status===200),JSON.stringify(duplicates.map(r=>r.body)));assert.equal(new Set(duplicates.map(r=>r.body.reference)).size,1);assert.equal(messages.length-messageCount,1);checks.push('8 concurrent independent PHP workers produce exactly one SMTP message');
 const smtpMessage=messages.find(m=>m.includes('Reply-To:'));assert.ok(smtpMessage);assert.match(smtpMessage,/customer@example.test/);assert.match(smtpMessage,/Content-Type: text\/plain/);assert.doesNotMatch(smtpMessage,/Content-Type: text\/html/);checks.push('SMTP Reply-To and plain text headers');
}finally{for(const s of sockets)s.destroy();implicit.close();starttls.close();}
const statePath=raceConfig.storage+'/state.json',state=JSON.parse(await readFile(statePath,'utf8')),pendingKey=randomUUID(),template=Object.values(state.keys)[0];state.keys[pendingKey]={...template,outcome:null,deadline:Date.now()/1000-1};await writeFile(statePath,JSON.stringify(state));const pending=await phpHttp(raceConfig,{headers:{origin,'idempotency-key':pendingKey}});assert.equal(pending.body.code,'delivery_unknown');assert.equal((await readdir(raceConfig.storage+'/outbox')).length,1);checks.push('Abandoned reservation returns unknown without redelivery');
state.keys={};for(let i=0;i<1000;i++)state.keys['capacity-'+i]={...template};await writeFile(statePath,JSON.stringify(state));const busy=await phpHttp(raceConfig);assert.equal(busy.body.code,'busy');checks.push('1000-entry idempotency capacity fails closed');
for(const v of Object.values(state.keys))v.expires=Date.now()/1000-1;for(const v of Object.values(state.rates)){v.expires=Date.now()/1000-1;v.count=1000;}await writeFile(statePath,JSON.stringify(state));assert.equal((await phpHttp(raceConfig)).status,200);checks.push('Expired rate windows and completed reservations cleaned up');
await writeFile(statePath,'corrupt');assert.equal((await phpHttp(raceConfig)).body.code,'busy');checks.push('Corrupted private journal fails closed');
await writeFile(directory+'/evidence.json',JSON.stringify({passed:true,php,comparisons,checks,ownerDatabaseContacted:false},null,2));console.log(JSON.stringify({passed:true,comparisons,checks:checks.length,evidence:directory+'/evidence.json'}));
