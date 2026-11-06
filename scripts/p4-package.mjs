// Separate public Node and PHP management review artifacts. Never uploads or migrates.
import {readFile,writeFile,readdir,mkdir,lstat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deterministicZip} from './lib/deterministic-zip.mjs';
import {productDocuments} from '../server/src/website/product-documents.js';
if(!/^22\./.test(process.versions.node))throw Error('Use the verified Node 22 runtime');
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)||'draft';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid artifact label');
const output=resolve('tmp/phase-4/artifacts',label);await mkdir(output,{recursive:true});
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
const build=JSON.parse(await readFile('tmp/phase-4/build-complete.json','utf8'));
if(!build.passed||build.sourceCommit!==sha)throw Error('A completed build from this checkout is required');
for(const [name,expected] of Object.entries(build.dependencyHashes))if(hash(await readFile(name))!==expected)throw Error('Dependency changed since build');
const vendorProof=JSON.parse(await readFile('tmp/phase-4/vendor-proof.json','utf8'));
if(!vendorProof.passed||vendorProof.sourceLockSha256!==hash(await readFile('upms.php/composer.lock')))throw Error('Completed production-only dependency preparation is required');
const manifests=[];
async function add(files,destination,source){
 const stat=await lstat(source);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Only regular reviewed files are packaged: '+source);
 const bytes=await readFile(source);
 if(destination.startsWith('private/backend/vendor/')&&vendorProof.files[destination.slice('private/backend/vendor/'.length)]!==hash(bytes))throw Error('Vendor changed after completed install');
 files.set(destination,bytes);
}
async function tree(files,source,destination,accept){
 for(const name of (await readdir(source)).sort()){
  const file=source+'/'+name,relativeName=destination+'/'+name,stat=await lstat(file);
  if(stat.isSymbolicLink())throw Error('Release symlink rejected');
  if(stat.isDirectory())await tree(files,file,relativeName,accept);
  else if(accept(relativeName))await add(files,relativeName,file);
 }
}
async function finish(kind,files,metadata){
 const manifest={kind,sourceCommit:sha,operationalReady:false,liveDeploymentAuthorized:false,automaticDatabaseMigration:false,...metadata,files:Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>[name,hash(bytes)]))};
 files.set(kind==='website'?'deployment-manifest.json':'RELEASE.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 const bytes=deterministicZip(files),name=kind==='website'?'upms-p4-public-node.zip':'upms-p4-management-php.zip';
 await writeFile(resolve(output,name),bytes);await writeFile(resolve(output,name+'.sha256'),hash(bytes)+'  '+name+'\n');
 manifests.push({kind,sourceCommit:sha,archive:name,bytes:bytes.length,sha256:hash(bytes),fileCount:files.size,operationalReady:false});
}
if (!process.argv.includes('--management-only')) {
const website=new Map();
for(const directory of ['config','middleware','inquiries','website'])await tree(website,'server/src/'+directory,'server/src/'+directory,name=>name.endsWith('.js'));
for(const name of ['public-app.js','production/runtime.js'])await add(website,'server/src/'+name,'server/src/'+name);
await add(website,'server/src/index.js','server/src/public-index.js');
const downloads=productDocuments(resolve('upms.client/dist'));if(downloads.size!==7)throw Error('Current seven approved PDF URLs are required');
await tree(website,'upms.client/dist','upms.client/dist',name=>{
 if(name.startsWith('upms.client/dist/management/'))return false;
 if(!/^upms\.client\/dist\/(?:assets\/[^/]+\.(?:js|css|svg|jpg|jpeg|png|webp|avif|woff2)|licenses\/[A-Za-z0-9-]+\.txt|_pages\/[A-Za-z0-9-]+\.html|downloads\/products\/(?:v1\/unique-plastic-(?:buckets|cans|containers|stickers|cartons)-product-information\.pdf|v2\/(?:Bucket|Company_Profile_New_HD_Bottles)\.pdf)|index\.html|public-routes\.json|product-documents\.json|icons\.svg|favicon\.svg)$/.test(name))throw Error('Unexpected public release file: '+name);
 return true;
});
const pkg=JSON.parse(await readFile('package.json','utf8'));pkg.main='server/src/index.js';pkg.engines={node:'^22.23.4'};pkg.scripts={start:'node server/src/index.js',build:'node scripts/check-deployment.mjs'};
website.set('package.json',Buffer.from(JSON.stringify(pkg,null,2)+'\n'));await add(website,'package-lock.json','package-lock.json');await add(website,'scripts/check-deployment.mjs','scripts/check-deployment.mjs');
await add(website,'website.env.disabled.example','deployment/phase-4/website.env.disabled.example');
await finish('website',website,{surface:'public-website-only',entrySource:'server/src/public-index.js',managementBackendIncluded:false,inquiryDelivery:'Disabled',targetHosting:'BLOCKED - GoDaddy selector disabled and no Node versions available'});
}
const management=new Map();
for(const directory of ['app','bootstrap','config','routes','resources'])await tree(management,'upms.php/'+directory,'private/backend/'+directory,name=>!name.startsWith('private/backend/bootstrap/cache/')&&!/\.(?:log|sql|sqlite|env|key|pem|pfx|xlsx|pdf)$/i.test(name));
for(const name of ['artisan','composer.json','composer.lock'])await add(management,'private/backend/'+name,'upms.php/'+name);
const cumulativeBootstrap = (await readdir('upms.php')).includes('operations');
if (cumulativeBootstrap) {
 await add(management,'private/backend/operations/initialize-cumulative.php','upms.php/operations/initialize-cumulative.php');
}
const vendor='tmp/phase-4/vendor-stage/vendor';
await tree(management,vendor,'private/backend/vendor',name=>!name.endsWith('.bat')&&!/(^|\/)\.git(?:\/|$)/.test(name));
await tree(management,'upms.client/dist/management','management',name=>/\.(?:html|js|css|svg)$/.test(name));
await add(management,'management/gateway.php','deployment/phase-4/gateway.php');await add(management,'management/.htaccess','deployment/phase-4/management.htaccess');
await add(management,'private/management.env.disabled.example','deployment/phase-4/management.env.disabled.example');
await add(management,'review/structural-transition-plan.json','docs/phase-4/evidence/structural-transition-plan.json');
await finish('management',management,{surface:'php-simple-v1-management',phpRequired:'^8.3',schemaTarget:{tables:47,guards:133},productionProfileStatus:'BLOCKED - cumulative features intentionally reject production profiles',featureFlags:'All disabled in example',includesProvisioningTools:cumulativeBootstrap,includesSyntheticData:false,includesSecrets:false});
await writeFile(resolve(output,'artifacts.json'),JSON.stringify(manifests,null,2)+'\n');
console.log(JSON.stringify({output:relative(process.cwd(),output),artifacts:manifests},null,2));
