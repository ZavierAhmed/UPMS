// Separate diagnostic deployment start command. Never listen on PORT or HTTP.
import mysql from 'mysql2/promise';
import {fileURLToPath} from 'node:url';
import {runDeployment} from './deployment-runner.mjs';
const emit=record=>new Promise(resolve=>process.stdout.write(JSON.stringify(record)+'\n',resolve));
const timer=setTimeout(async()=>{await emit({status:'BLOCKED',code:'TOTAL_TIMEOUT',execution:{mode:'CONTROLLED_READ_ONLY_ONE_SHOT',node:process.versions.node,httpListener:false},operationalManagementEnabled:false});process.exit(2);},16000);
let exit=2;
try{
 const result=await runDeployment(process.env,{root:fileURLToPath(new URL('.',import.meta.url)),connect:options=>mysql.createConnection(options)});
 await emit(result);exit=['COLLECTED','SKIPPED'].includes(result.status)?0:2;
}catch{await emit({status:'BLOCKED',code:'DEPLOYMENT_DIAGNOSTIC_BLOCKED',execution:{mode:'CONTROLLED_READ_ONLY_ONE_SHOT',node:process.versions.node,httpListener:false},operationalManagementEnabled:false});}
finally{clearTimeout(timer);}
process.exit(exit);
