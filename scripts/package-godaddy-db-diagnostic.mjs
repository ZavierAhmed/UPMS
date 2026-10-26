// Diagnostic source only. No app server, public assets, reports or private config.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deterministicZip} from './lib/deterministic-zip.mjs';
import {assertSupportedRuntime} from '../server/src/production/runtime.js';
if(assertSupportedRuntime()!==22)throw Error('Build the diagnostic package with the reviewed Node 22 line');
const files=new Map(),hash=b=>createHash('sha256').update(b).digest('hex');
for(const name of ['package.json','package-lock.json','cli.mjs','diagnostic.mjs','no-server.mjs','README.md'])files.set(name,Buffer.from((await readFile('diagnostics/godaddy-db/'+name,'utf8')).replaceAll('\r\n','\n')));
files.set('.nvmrc',Buffer.from('22.23.4\n'));
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const manifest={sourceCommit,kind:'CLI_ONLY_READ_ONLY_DIAGNOSTIC',operationalManagementEnabled:false,httpListener:false,hostedResultsIncluded:false,files:Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([n,b])=>[n,hash(b)]))};
files.set('diagnostic-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
const bytes=deterministicZip(files),sha256=hash(bytes),name='upms-godaddy-db-diagnostic-node22.zip',path='artifacts/'+name;
await mkdir('artifacts',{recursive:true});await writeFile(path,bytes);await writeFile(path+'.sha256',sha256+'  '+name+'\n');
await writeFile('artifacts/upms-godaddy-db-diagnostic-receipt.json',JSON.stringify({sourceCommit,path,sha256,bytes:bytes.length,files:files.size,mode:manifest.kind,deployed:false,hostedExecutionPerformed:false,operationalManagementEnabled:false},null,2)+'\n');
console.info(JSON.stringify({path,sha256,files:files.size,sourceCommit}));
