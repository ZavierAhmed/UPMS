// Build reviewed static and Node releases locally. Never uploads or changes hosting.
import {readFile,writeFile,mkdir,readdir,copyFile,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deterministicZip} from './lib/deterministic-zip.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out='artifacts',dist='upms.client/dist',origin='https://unique-plastic.com';
await mkdir(out,{recursive:true});
// Preserve the prior prepared artifact before invoking the existing packager.
const prior=`${out}/upms-node-deployment.zip`;
try {
 const bytes=await readFile(prior),expected=(await readFile(prior+'.sha256','utf8')).split(' ')[0];
 if(hash(bytes)!==expected)throw Error('Prior artifact checksum mismatch');
 const dir=`${out}/rollback/w072/preexisting-${expected.slice(0,16)}`;
 await mkdir(dir,{recursive:true});
 try{await copyFile(prior,dir+'/upms-node-deployment.zip',constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
 if(hash(await readFile(dir+'/upms-node-deployment.zip'))!==expected)throw Error('Prior rollback copy mismatch');
}catch(e){if(e.code!=='ENOENT'||e.path!==prior)throw e;}
execFileSync(process.execPath,['scripts/package-deployment.mjs'],{stdio:'inherit'});
const routes=JSON.parse(await readFile(dist+'/public-routes.json','utf8'));
const files=new Map();
for(const dir of ['assets','licenses'])for(const name of (await readdir(`${dist}/${dir}`)).sort()){
 const path=`${dir}/${name}`,stat=await lstat(`${dist}/${path}`);
 if(!stat.isFile()||stat.isSymbolicLink()||!(/^(?:assets\/[^/]+\.(?:js|css|svg|jpg|jpeg|png|webp|avif|woff2)|licenses\/[A-Za-z0-9-]+\.txt)$/.test(path)))throw Error('Unexpected public artifact');
 files.set(path,await readFile(`${dist}/${path}`));
}
for(const name of ['icons.svg','favicon.svg'])files.set(name,await readFile(`${dist}/${name}`));
function html(source,path){
 const meta=`<meta name="public-static-release" content="true" /><meta name="site-origin" content="${origin}" />`+(path?`<link rel="canonical" href="${origin+path}" /><meta property="og:url" content="${origin+path}" />`:'');
 return source.replace('<!--site-url-->',meta).replace('Online inquiry submission requires JavaScript.','Online inquiry delivery is disabled in this static website.');
}
let rules='Options -Indexes -MultiViews\nDirectoryIndex index.html\nErrorDocument 404 /404.html\nRewriteEngine On\n';
rules+='RewriteRule ^(?:api|management|admin|server|node_modules|\\.git|\\.env)(?:/|$) - [R=404,END,NC]\n';
rules+='RewriteRule ^release-manifest\\.json$ - [F,END]\n';
rules+='RewriteCond %{THE_REQUEST} "\\s/+_site/" [NC]\nRewriteRule ^_site/ - [R=404,END]\n';
rules+='RewriteCond %{REQUEST_METHOD} !^(GET|HEAD)$\nRewriteRule ^ - [R=405,END]\n';
for(const page of routes.pages){
 const target=page.path==='/'?'index.html':`_site/${page.path.slice(1).replaceAll('/','-')}.html`;
 files.set(target,Buffer.from(html(await readFile(`${dist}/${page.file}`,'utf8'),page.path)));
 if(page.path!=='/')rules+=`RewriteRule ^${page.path.slice(1)}/?$ ${target} [END]\n`;
}
files.set('404.html',Buffer.from(html(await readFile(`${dist}/${routes.notFoundFile}`,'utf8'),null)));
rules+='\n<IfModule mod_headers.c>\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set X-Frame-Options "DENY"\nHeader always set Referrer-Policy "strict-origin-when-cross-origin"\nHeader always set Content-Security-Policy "default-src \'self\'; script-src \'self\'; style-src \'self\'; font-src \'self\'; img-src \'self\' data:; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'; form-action \'self\'"\n</IfModule>\n';
files.set('.htaccess',Buffer.from(rules));
files.set('robots.txt',Buffer.from(`User-agent: *\nDisallow: /api/\nDisallow: /management/\nDisallow: /admin/\nSitemap: ${origin}/sitemap.xml\n`));
files.set('sitemap.xml',Buffer.from(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.pages.map(p=>`<url><loc>${origin+p.path}</loc></url>`).join('')}</urlset>`));
const manifest={sourceCommit:sha,kind:'public-static-only',origin,onlineInquiry:false,routes:routes.pages.map(p=>p.path),files:Object.fromEntries([...files].map(([n,b])=>[n,hash(b)]))};
files.set('release-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
const artifacts=[['upms-public-website.zip',deterministicZip(files)],['upms-fullstack-node.zip',await readFile(prior)]];
const receipt={sourceCommit:sha,artifacts:[]};
for(const [name,bytes] of artifacts){
 const digest=hash(bytes),path=`${out}/${name}`;await writeFile(path,bytes);await writeFile(path+'.sha256',`${digest}  ${name}\n`);
 const dir=`${out}/rollback/w072/${sha}`;await mkdir(dir,{recursive:true});
 try{await copyFile(path,`${dir}/${name}`,constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
 if(hash(await readFile(`${dir}/${name}`))!==digest)throw Error('Rollback copy differs; preserve existing copy and investigate');
 const checksum=`${digest}  ${name}\n`;
 try{await writeFile(`${dir}/${name}.sha256`,checksum,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
 if(await readFile(`${dir}/${name}.sha256`,'utf8')!==checksum)throw Error('Existing rollback checksum differs');
 receipt.artifacts.push({path,sha256:digest,bytes:bytes.length,rollback:`${dir}/${name}`});
}
await writeFile(`${out}/W07-2-release-receipt.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
