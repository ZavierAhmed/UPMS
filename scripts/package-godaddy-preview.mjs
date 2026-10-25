import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync(process.execPath,['scripts/package-deployment.mjs','--management-release','--node-major=22','--godaddy-preview'],{stdio:'inherit'});
const bytes=await readFile('artifacts/upms-node-deployment.zip'),sha256=createHash('sha256').update(bytes).digest('hex');
const path='artifacts/upms-godaddy-node22-preview.zip';
await writeFile(path,bytes);await writeFile(path+'.sha256',sha256+'  upms-godaddy-node22-preview.zip\n');
const rollback=`artifacts/rollback/godaddy-managed/${sourceCommit}/${sha256.slice(0,16)}`;
await mkdir(rollback,{recursive:true});try{await copyFile(path,rollback+'/upms-godaddy-node22-preview.zip',constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
if(createHash('sha256').update(await readFile(rollback+'/upms-godaddy-node22-preview.zip')).digest('hex')!==sha256)throw Error('Rollback copy mismatch');
const receipt={sourceCommit,path,sha256,bytes:bytes.length,rollback,providerAccepted:false,databaseOperationsEnabled:false,status:'PARTIAL_COMPATIBILITY_BLOCKED'};
await writeFile('artifacts/godaddy-preview-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
