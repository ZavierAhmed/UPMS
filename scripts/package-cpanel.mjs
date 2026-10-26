// Prebuilt, blocked private Preview only. Never deploys or opens a database.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync(process.execPath,['scripts/package-deployment.mjs','--management-release','--node-major=22','--godaddy-cpanel'],{stdio:'inherit'});
const bytes=await readFile('artifacts/upms-node-deployment.zip'),sha256=createHash('sha256').update(bytes).digest('hex'),path='artifacts/upms-godaddy-cpanel-node22.zip';
await writeFile(path,bytes);await writeFile(path+'.sha256',sha256+'  upms-godaddy-cpanel-node22.zip\n');
await writeFile('artifacts/upms-godaddy-cpanel-release-receipt.json',JSON.stringify({sourceCommit,path,sha256,bytes:bytes.length,status:'CPANEL_COMPATIBILITY_UNVERIFIED_BLOCKED',providerAccepted:false,databaseOperationsEnabled:false,deployed:false},null,2)+'\n');
execFileSync(process.execPath,['scripts/verify-cpanel-package.mjs'],{stdio:'inherit'});
