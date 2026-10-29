import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,lstat,copyFile} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=resolve('tmp/php-runtime/php82-release-source-'+Date.now());
const forbidden=/(^|\/)(?:\.env[^/]*|node_modules|vendor|storage|tests|fixtures|\.git)(\/|$)|\.(?:map|log|sql|pem|key|pfx|xlsx|pdf)$/i;
async function copy(src,dst){const stat=await lstat(src);assert.ok(!stat.isSymbolicLink(),'Source symlink refused');if(stat.isDirectory()){await mkdir(dst,{recursive:true});for(const name of await readdir(src))await copy(join(src,name),join(dst,name));return;}
 const name=relative(root,src).replaceAll('\\','/');if(name.startsWith('upms.php/bootstrap/cache/'))return;assert.ok(!forbidden.test(name),'Excluded source: '+name);await mkdir(resolve(dst,'..'),{recursive:true});await copyFile(src,dst);}
const backend=join(out,'private/backend');for(const name of ['app','bootstrap','config','routes','resources'])await copy(resolve('upms.php',name),join(backend,name));for(const name of ['artisan','composer.json','composer.lock','public/index.php','scripts/provision-admins.php','scripts/initialize-clean.php','scripts/inquiry-mail.php'])await copy(resolve('upms.php',name),join(backend,name));
for(const name of await readdir('upms.client/dist'))if(name!=='management')await copy(resolve('upms.client/dist',name),join(out,'public',name));
await copy(resolve('upms.client/dist/management/assets'),join(out,'management/management/assets'));
const html=(await readFile('upms.client/dist/management/index.html','utf8')).replace('<html','<html data-upms-mode="simple-v1"');assert.match(html,/data-upms-mode="simple-v1"/);await writeFile(join(out,'management/index.html'),html);
for(const area of ['public','management'])for(const name of await readdir('deployment/layout/'+area))await copy(resolve('deployment/layout',area,name),join(out,area,name));
for(const name of ['linux-release-finalize.sh','verify-release.php','check-release.php'])await copy(resolve('deployment',name),join(out,name));
await writeFile(join(out,'SOURCE.json'),JSON.stringify({kind:'SOURCE_LAYOUT_ONLY',productionReady:false,linuxDependenciesVerified:false,layout:{private:'private/backend',public:'public',management:'management'},businessDataIncluded:false},null,2));
const hash=createHash('sha256').update(await readFile(join(backend,'resources/production-schema.json'))).digest('hex');console.log(JSON.stringify({passed:true,output:out,canonicalSchemaSha256:hash,managementMode:'simple-v1',productionReady:false}));await writeFile('tmp/php-runtime/php82-release-source-latest.json',JSON.stringify({output:out}));
