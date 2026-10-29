import {mkdir,readdir,readFile,writeFile,copyFile,lstat} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
// Offline source kit only. It cannot be advertised as a deployable Linux release.
const root=process.cwd(),output=resolve('tmp/php-runtime/php8-source-kit-'+Date.now());
const manifest=[];
async function copy(source,target){const stat=await lstat(source);assert.ok(!stat.isSymbolicLink(),'Symlinks prohibited');if(stat.isDirectory()){await mkdir(target,{recursive:true});for(const entry of (await readdir(source)).sort())await copy(join(source,entry),join(target,entry));return;}
 const name=relative(root,source).replaceAll('\\','/');if(name.startsWith('upms.php/bootstrap/cache/'))return;assert.ok(!/(^|\/)(?:\.env[^/]*|node_modules|vendor|storage|tests|tmp|\.git)(\/|$)|\.(?:map|log|sql|pem|key|pfx|xlsx|pdf)$/i.test(name),'Excluded artifact: '+name);
 const bytes=await readFile(source);await mkdir(resolve(target,'..'),{recursive:true});await copyFile(source,target);manifest.push({path:relative(output,target).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
for(const name of ['app','bootstrap','config','routes','public'])await copy(resolve('upms.php',name),join(output,'backend',name));
for(const name of ['artisan','composer.json','composer.lock','scripts/provision-admins.php'])await copy(resolve('upms.php',name),join(output,'backend',name));
await copy(resolve('upms.client/dist'),join(output,'frontend'));
await copy(resolve('deployment/production-profile.disabled.example.json'),join(output,'production-profile.disabled.example.json'));
await copy(resolve('deployment/provisioning-profile.disabled.example.json'),join(output,'provisioning-profile.disabled.example.json'));
await copy(resolve('deployment/linux-finalize.sh'),join(output,'linux-finalize.sh'));
await writeFile(join(output,'MANIFEST.json'),JSON.stringify({kind:'NONDEPLOYABLE_SOURCE_KIT',linuxVendorIncluded:false,productionSecretsIncluded:false,syntheticBusinessDataIncluded:false,hostingStatus:'BLOCKED',files:manifest},null,2));
console.log(JSON.stringify({passed:true,kind:'NONDEPLOYABLE_SOURCE_KIT',files:manifest.length,output}));
