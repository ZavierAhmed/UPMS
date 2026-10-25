import test from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertTlsSession,verifiedTlsOptions} from '../src/godaddy/policy.js';

test('native TLS integration accepts a trusted matching certificate and rejects wrong host and CA',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'upms-godaddy-tls-'));
  const openssl=process.env.UPMS_TEST_OPENSSL||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
  let server;
  try{
    execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=mysql.fixture.test','-addext','subjectAltName=DNS:mysql.fixture.test'],{stdio:'pipe',windowsHide:true});
    const ca=await readFile(join(dir,'cert.pem'),'utf8'),key=await readFile(join(dir,'key.pem'));
    server=tls.createServer({key,cert:ca,minVersion:'TLSv1.2'},socket=>socket.end());
    server.on('tlsClientError',()=>{});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const connect=(servername,certificate=ca)=>new Promise((resolve,reject)=>{
      const options=verifiedTlsOptions('mysql.fixture.test','mysql.fixture.test',certificate);
      const socket=tls.connect({host:'127.0.0.1',port:server.address().port,servername,ca:options.ca,rejectUnauthorized:options.rejectUnauthorized,minVersion:options.minVersion});
      socket.once('error',reject);socket.once('secureConnect',()=>{try{assertTlsSession(socket,servername);socket.end();resolve();}catch(e){socket.destroy();reject(e);}});
    });
    await connect('mysql.fixture.test');await assert.rejects(connect('wrong.fixture.test'));
    await assert.rejects(new Promise((resolve,reject)=>{const s=tls.connect({host:'127.0.0.1',port:server.address().port,servername:'mysql.fixture.test',rejectUnauthorized:true});s.once('error',reject);s.once('secureConnect',()=>{s.end();resolve();});}));
  }finally{if(server)await new Promise(resolve=>server.close(resolve));if(!resolve(dir).startsWith(resolve(tmpdir())+sep+'upms-godaddy-tls-'))throw Error('Unexpected test cleanup path');await rm(dir,{recursive:true,force:true});}
});
