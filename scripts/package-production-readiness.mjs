// Prepared artifacts only. Never deploys, changes DNS or connects to a database.
import {execFileSync} from 'node:child_process';import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';import {constants} from 'node:fs';import {createHash} from 'node:crypto';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),artifacts=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const major of ['22','24']){
 execFileSync(process.execPath,['scripts/package-deployment.mjs','--management-release','--node-major='+major],{stdio:'pipe'});
 const bytes=await readFile('artifacts/upms-node-deployment.zip'),name=`upms-management-node${major}.zip`,file='artifacts/'+name,digest=hash(bytes);await writeFile(file,bytes);await writeFile(file+'.sha256',`${digest}  ${name}\n`);
 const dir=`artifacts/rollback/production-readiness/${sha}`;await mkdir(dir,{recursive:true});try{await copyFile(file,dir+'/'+name,constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}if(hash(await readFile(dir+'/'+name))!==digest)throw Error('Preserve differing rollback copy and review');
 artifacts.push({nodeMajor:major,path:file,sha256:digest,bytes:bytes.length,rollback:dir+'/'+name,productionPostingEnabled:false});
}
await writeFile('artifacts/production-readiness-receipt.json',JSON.stringify({sourceCommit:sha,artifacts,goDaddyDatabaseBlocked:true},null,2)+'\n');console.log(JSON.stringify({sourceCommit:sha,artifacts},null,2));
