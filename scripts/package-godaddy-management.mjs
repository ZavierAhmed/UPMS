// Management-only prebuilt ZIP. Does not run diagnostics, connect, migrate or deploy.
import {readFile,writeFile,readdir,mkdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deterministicZip} from './lib/deterministic-zip.mjs';
import {assertSupportedRuntime} from '../server/src/production/runtime.js';
if(assertSupportedRuntime()!==22)throw Error('Package on reviewed Node 22');
const files=new Map(),hash=b=>createHash('sha256').update(b).digest('hex');
async function collect(dir,allowed){if((await lstat(dir)).isSymbolicLink())throw Error('No release symlinks');for(const entry of (await readdir(dir)).sort()){const name=dir+'/'+entry,info=await lstat(name);if(info.isSymbolicLink())throw Error('No release symlinks');if(info.isDirectory())await collect(name,allowed);else{if(!allowed(name))throw Error('Unexpected release file');files.set(name,await readFile(name));}}}
await collect('server/src',n=>n.endsWith('.js'));
await collect('upms.client/dist/management',n=>/^upms\.client\/dist\/management\/(?:index\.html|assets\/[^/]+\.(?:js|css))$/.test(n));
const pkg=JSON.parse(await readFile('package.json','utf8'));pkg.main='server/src/godaddy/management-index.js';pkg.engines={node:'^22.23.4'};pkg.scripts={build:'node scripts/check-deployment.mjs',start:'node server/src/godaddy/management-index.js'};delete pkg.devDependencies;
files.set('package.json',Buffer.from(JSON.stringify(pkg,null,2)+'\n'));
const lock=JSON.parse(await readFile('package-lock.json','utf8'));delete lock.packages[''].devDependencies;lock.packages[''].engines=pkg.engines;for(const [name,value]of Object.entries(lock.packages))if(value.dev===true)delete lock.packages[name];
// After dev removal npm reclassifies mysql2's optional type peer and its child.
// Keep their reviewed versions/integrities and canonical metadata so npm install
// does not rewrite the hashed lockfile before the integrity build.
for(const name of ['node_modules/@types/node','node_modules/undici-types'])if(lock.packages[name]){const {dependencies,...record}=lock.packages[name];lock.packages[name]={...record,peer:true,...(dependencies?{dependencies}:{})};}
files.set('package-lock.json',Buffer.from(JSON.stringify(lock,null,2)+'\n'));
files.set('.nvmrc',Buffer.from('22.23.4\n'));files.set('.npmrc',Buffer.from('registry=https://registry.npmjs.org/\n'));
files.set('scripts/check-deployment.mjs',await readFile('scripts/check-deployment.mjs'));
for(const name of ['GODADDY-OFFICIAL-REQUIREMENTS-AUDIT.md','GODADDY-MANAGEMENT-ZIP-HANDOFF.md','GODADDY-REMAINING-BLOCKERS.md','GODADDY-DEPLOYMENT-COMPLIANCE-TESTS.md'])files.set(name,await readFile('docs/deployment/'+name));
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const manifest={sourceCommit,kind:'godaddy-management-disabled-preview',managementOnly:true,persistentServer:true,diagnostic:false,operationalReady:false,databaseOperationsEnabled:false,providerDatabaseAccepted:false,files:Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([name,data])=>[name,hash(data)]))};
files.set('deployment-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
const bytes=deterministicZip(files);if(bytes.length>=100000000)throw Error('ZIP must be below 100 MB');
const name='upms-godaddy-management-compliant-node22.zip',path='artifacts/'+name,sha256=hash(bytes);await mkdir('artifacts',{recursive:true});await writeFile(path,bytes);await writeFile(path+'.sha256',sha256+'  '+name+'\n');
const receipt={sourceCommit,path,sha256,bytes:bytes.length,decimalMB:bytes.length/1000000,files:files.size,artifactMode:'DISABLED_MANAGEMENT_PREVIEW_NOT_PRODUCTION_READY',deployed:false,providerDatabaseAccepted:false,packageJson:pkg};
await writeFile('artifacts/upms-godaddy-management-package.json',JSON.stringify(pkg,null,2)+'\n');
await writeFile('artifacts/upms-godaddy-management-compliance-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.info(JSON.stringify(receipt,null,2));
