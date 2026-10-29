import dns from 'node:dns/promises';
import https from 'node:https';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {advertisedTls} from '../server/src/development/remote.js';

const hosts=['unique-plastic.com','app.unique-plastic.com'];
const target=Object.freeze({host:'184.168.100.110',port:3306});
function errorCode(error){return ['ENOTFOUND','EAI_AGAIN','TIMEOUT','ECONNREFUSED','ECONNRESET','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','CONNECTION_UNAVAILABLE','CONNECTION_TIMEOUT'].includes(error?.code)?error.code:'PREFLIGHT_UNAVAILABLE';}
function httpsObservation(host){return new Promise((done,fail)=>{const request=https.get('https://'+host+'/',{timeout:7000,rejectUnauthorized:true},response=>{const cert=response.socket.getPeerCertificate();response.resume();done({status:response.statusCode,certificateAuthorized:response.socket.authorized,tlsProtocol:response.socket.getProtocol(),certificateSubject:cert.subject?.CN||null,certificateExpires:cert.valid_to||null,headers:Object.fromEntries(['content-security-policy','x-frame-options','x-content-type-options','cache-control','x-robots-tag'].filter(k=>response.headers[k]).map(k=>[k,response.headers[k]]))});});request.on('error',fail);request.on('timeout',()=>request.destroy(Object.assign(new Error('timeout'),{code:'TIMEOUT'})));});}

// Phase A observation only: no credentials are loaded, no SQL client is opened,
// no diagnostics are uploaded, and TLS certificate verification is never bypassed.
export async function observeHosting({lookup=dns.lookup,fetchHttps=httpsObservation,greeting=advertisedTls}={}){
 const result={checkedAt:new Date().toISOString(),phase:'A',productionReady:false,accountCapabilitiesVerified:false,database:{target,credentialsSent:false,sqlExecuted:false},hosts:[],pending:['Authenticated cPanel/SSH capability inspection','Verified private database transport and restricted read-only inventory','Separate document roots and management certificate','Backup/restore proof','Two-admin identity plan and implementation','Host-matching Linux staging','Explicit final cutover approval']};
 try{result.database.greeting=await greeting(target);}catch(error){result.database.error=errorCode(error);}
 for(const host of hosts){const row={host,proposed:true};try{row.addresses=await lookup(host,{all:true});}catch(error){row.dnsError=errorCode(error);}try{row.https=await fetchHttps(host);}catch(error){row.httpsError=errorCode(error);}result.hosts.push(row);}
 result.database.authenticatedInspection='NOT PERFORMED';result.database.greetingIsUnauthenticatedVersionHint=true;return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==3||process.argv[2]!=='--observe'){console.error('Usage: node scripts/php-8-hosting-preflight.mjs --observe (unauthenticated observation only)');process.exitCode=2;}else{console.log(JSON.stringify(await observeHosting(),null,2));process.exitCode=3;}}
