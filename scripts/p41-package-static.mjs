// Build reviewed static and Node releases locally. Never uploads or changes hosting.
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deterministicZip} from './lib/deterministic-zip.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=process.argv.includes('--p42a')?'tmp/phase-4.2a/static':
 process.argv.includes('--p41b')?'tmp/phase-4.1b/static':'tmp/phase-4.1/static';
const dist='upms.client/dist',origin='https://unique-plastic.com';
await mkdir(out,{recursive:true});
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
// The existing dashboard virtual host has a document root inside public_html.
// Give its own .htaccess the first chance to handle the dashboard hostname.
rules+='RewriteCond %{HTTP_HOST} ^app\\.unique-plastic\\.com$ [NC]\nRewriteRule ^ - [L]\n';
rules+='RewriteCond %{HTTP_HOST} !^unique-plastic\\.com$ [NC]\nRewriteRule ^ - [R=404,END]\n';
rules+='RewriteRule ^\\.well-known/acme-challenge/[A-Za-z0-9_-]+$ - [END]\n';
rules+='RewriteCond %{HTTPS} !=on\nRewriteRule ^ https://unique-plastic.com%{REQUEST_URI} [R=307,END]\n';
rules+='RewriteRule (?:^|/)[^/]*\\.(?:php[0-9]*|phtml|phar|cgi|pl)(?:[./;]|$) - [R=404,END,NC]\n';
rules+='RewriteRule ^(?:api|dashboard|management|admin|server|node_modules|\\.git|\\.env)(?:/|$) - [R=404,END,NC]\n';
rules+='RewriteRule (?:^|/)(?:\\.[^/]+|vendor|storage|private|config|bootstrap|composer\\.(?:json|lock))(?:/|$) - [R=404,END,NC]\n';
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
rules += `<IfModule mod_headers.c>
Header set Cache-Control "no-cache"
<FilesMatch "-[A-Za-z0-9_-]{8}\\.(js|css|svg|png|webp|avif|jpe?g|woff2)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
</IfModule>
`;
files.set('.htaccess',Buffer.from(rules));
files.set('robots.txt',Buffer.from(`User-agent: *\nDisallow: /api/\nDisallow: /management/\nDisallow: /admin/\nSitemap: ${origin}/sitemap.xml\n`));
files.set('sitemap.xml',Buffer.from(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.pages.map(p=>`<url><loc>${origin+p.path}</loc></url>`).join('')}</urlset>`));
for(const [version,names] of Object.entries({v1:['buckets','cans','containers','stickers','cartons'].map(name=>'unique-plastic-'+name+'-product-information.pdf'),v2:['Bucket.pdf','Company_Profile_New_HD_Bottles.pdf']})){
 for(const name of names){const path='downloads/products/'+version+'/'+name;files.set(path,await readFile(dist+'/'+path));}
}
const manifest={sourceCommit:sha,kind:'public-static-only',origin,onlineInquiry:false,routes:routes.pages.map(p=>p.path),files:Object.fromEntries([...files].map(([n,b])=>[n,hash(b)]))};
files.set('release-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
const archive = deterministicZip(files);
await writeFile(out+'/upms-public-static.zip', archive);
await writeFile(out+'/upms-public-static.zip.sha256', hash(archive)+'  upms-public-static.zip\n');
console.log(JSON.stringify({sourceCommit:sha,sha256:hash(archive),files:files.size,onlineInquiry:false}));
