import https from 'node:https';
import http from 'node:http';
import {resolve4} from 'node:dns/promises';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function request(url,method='GET'){
 return new Promise((done,fail)=>{const library=url.startsWith('https:')?https:http;const req=library.request(url,{method,agent:false,rejectUnauthorized:true},res=>{const chunks=[];let size=0;res.on('data',b=>{size+=b.length;if(size>3000000){req.destroy(Error('Inventory response too large'));return;}chunks.push(b);});res.on('end',()=>done({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks),certificate:url.startsWith('https:')?{authorized:res.socket.authorized,protocol:res.socket.getProtocol(),subject:res.socket.getPeerCertificate().subject,issuer:res.socket.getPeerCertificate().issuer,validFrom:res.socket.getPeerCertificate().valid_from,validTo:res.socket.getPeerCertificate().valid_to,fingerprint256:res.socket.getPeerCertificate().fingerprint256}:null}));});req.setTimeout(20000,()=>req.destroy(Error('HTTPS inventory timeout')));req.on('error',fail);req.end();});
}
const release=JSON.parse(await readFile('docs/phase-4/evidence/host-release.json','utf8'));
const report={verifiedUtc:new Date().toISOString(),tlsValidationBypassed:false,credentialsSent:false,databaseMutationsRequested:false,surfaces:{}};
for(const [surface,host] of [['public','unique-plastic.com'],['management','app.unique-plastic.com']]){
 const root=await request('https://'+host+'/');const redirected=await request('http://'+host+'/');
 const headers=Object.fromEntries(['content-security-policy','x-frame-options','x-content-type-options','strict-transport-security','cache-control','location','server'].map(k=>[k,root.headers[k]??null]));
 const assets=[];for(const [,path] of root.body.toString().matchAll(/(?:src|href)="(\/[^"<>]+\.(?:js|css))"/g)){const r=await request('https://'+host+path);const sha256=hash(r.body);assets.push({path,status:r.status,sha256,matchesHostedRelease:release.webAssets?.[surface]?.[path]===sha256});}
 const rootAssets=[...root.body.toString().matchAll(/(?:src|href)="(\/[^"<>]+\.(?:js|css))"/g)].map(m=>m[1]).sort();
 const classify=r=>({bytes:r.body.length,contentType:r.headers['content-type']??null,bodySha256:hash(r.body),exactRootBody:r.status===200&&hash(r.body)===hash(root.body),reactRootMarkup:/id=["']root["']/.test(r.body.toString()),sameFrontendAssetSet:JSON.stringify([...r.body.toString().matchAll(/(?:src|href)="(\/[^"<>]+\.(?:js|css))"/g)].map(m=>m[1]).sort())===JSON.stringify(rootAssets),sourceOrSecretSignature:/<\?php|APP_KEY=|DB_PASSWORD=|\[stacktrace\]/.test(r.body.toString())});
 const privatePaths=[];for(const path of ['/.env','/composer.json','/vendor/autoload.php','/storage/logs/laravel.log']){const r=await request('https://'+host+path);privatePaths.push({path,status:r.status,denied:[403,404].includes(r.status),...classify(r)});}
 const isolationPath=surface==='public'?'/api/v1/management/session/csrf':'/api/v1/public/inquiries';const isolated=await request('https://'+host+isolationPath);
 report.surfaces[surface]={host,ipv4:await resolve4(host),status:root.status,htmlSha256:hash(root.body),certificate:root.certificate,headers,httpStatus:redirected.status,httpLocation:redirected.headers.location??null,assets,privatePaths,isolation:{path:isolationPath,status:isolated.status,denied:[403,404].includes(isolated.status),...classify(isolated)}};
}
report.checks={trustedHttps:Object.values(report.surfaces).every(s=>s.status===200&&s.certificate.authorized),servedAssetHashes:Object.values(report.surfaces).every(s=>s.assets.length>0&&s.assets.every(a=>a.status===200&&a.matchesHostedRelease)),privatePathsDenied:Object.values(report.surfaces).every(s=>s.privatePaths.every(p=>p.denied)),apiHostIsolation:Object.values(report.surfaces).every(s=>s.isolation.denied),httpsRedirects:Object.values(report.surfaces).every(s=>[301,302,307,308].includes(s.httpStatus)&&s.httpLocation?.startsWith('https://'+s.host))};
report.passed=Object.values(report.checks).every(Boolean);
await writeFile('docs/phase-4/evidence/host-https.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:report.checks}));
