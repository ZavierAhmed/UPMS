#!/usr/bin/env node
import mysql from 'mysql2/promise';
import {readFile,stat} from 'node:fs/promises';
import {diagnose,limits} from './diagnostic.mjs';

// CLI writes only a bounded JSON record to stdout. It never writes a local file.
const emit=record=>new Promise(resolve=>process.stdout.write(JSON.stringify(record)+'\n',resolve));
if(process.argv.slice(2).length!==1||process.argv[2]!=='--run-read-only'){
 await emit({status:'BLOCKED',code:'EXPLICIT_READ_ONLY_ARGUMENT_REQUIRED',operationalManagementEnabled:false});process.exitCode=2;
}else if(!/^22\./.test(process.versions.node)||Number(process.versions.node.split('.')[1])<23||Number(process.versions.node.split('.')[1])===23&&Number(process.versions.node.split('.')[2])<4){
 await emit({status:'BLOCKED',code:'NODE_22_23_4_REQUIRED',operationalManagementEnabled:false});process.exitCode=2;
}else{
 // Hard watchdog bounds DNS/TLS handshakes, late mysql2 promises and cleanup too.
 const watchdog=setTimeout(async()=>{await emit({status:'BLOCKED',code:'TOTAL_TIMEOUT',operationalManagementEnabled:false});process.exit(2);},limits.totalMs+1000);
 try{
  let ca;if(process.env.UPMS_DIAGNOSTIC_CA_FILE){const file=process.env.UPMS_DIAGNOSTIC_CA_FILE;if((await stat(file)).size>262144)throw Error('CA unavailable');ca=await readFile(file,'utf8');}
  const report=await diagnose(process.env,{connect:options=>mysql.createConnection(options),ca});await emit(report);process.exitCode=report.status==='COLLECTED'?0:2;
 }catch{await emit({status:'BLOCKED',code:'PRIVATE_CA_UNAVAILABLE',operationalManagementEnabled:false});process.exitCode=2;}
 finally{clearTimeout(watchdog);}
}

// Terminate any unresolved DNS/handshake resources after flushing the one result.
process.exit(process.exitCode||0);
