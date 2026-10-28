import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from '../upms.client/node_modules/@babel/parser/lib/index.js';

// Static AST expansion, including loop-generated Express routes; never executes application code.
const modules=['identity','simple-v1','business','inventory','purchases','sales','receipts','cheques','returns','credits','expenses'];
const base='/api/v1/management';
const definitions=new Map(),routes=[];
function value(n,env){
 if(!n)return undefined;
 if(n.type==='StringLiteral'||n.type==='NumericLiteral')return n.value;
 if(n.type==='Identifier')return env[n.name];
 if(n.type==='ArrayExpression')return n.elements.map(n=>value(n,env));
 if(n.type==='BinaryExpression'&&n.operator==='===')return value(n.left,env)===value(n.right,env);
 if(n.type==='ConditionalExpression')return value(n.test,env)?value(n.consequent,env):value(n.alternate,env);
 if(n.type==='BinaryExpression'&&n.operator==='+'){const a=value(n.left,env),b=value(n.right,env);return a===undefined||b===undefined?undefined:a+b;}
 if(n.type==='TemplateLiteral'){let s='';for(let i=0;i<n.quasis.length;i++){s+=n.quasis[i].value.cooked;if(i<n.expressions.length){const v=value(n.expressions[i],env);if(v===undefined)return undefined;s+=v;}}return s;}
}
function nodes(node,fn){if(!node||typeof node!=='object')return;fn(node);for(const [key,v]of Object.entries(node)){if(['loc','start','end'].includes(key))continue;if(Array.isArray(v))v.forEach(n=>nodes(n,fn));else if(v&&typeof v==='object')nodes(v,fn);}}
const texts={};
for(const module of modules){
 const directory='server/src/'+module;
 for(const file of await readdir(directory)){
  if(!file.endsWith('.js'))continue;
  const path=directory+'/'+file,source=await readFile(path,'utf8');texts[path]=source;
  const ast=parse(source,{sourceType:'module'});
  nodes(ast,n=>{let name;if(n.type==='ObjectMethod')name=n.key.name;if(n.type==='ObjectProperty'&&['ArrowFunctionExpression','FunctionExpression'].includes(n.value.type))name=n.key.name;if(n.type==='FunctionDeclaration')name=n.id?.name;if(name){const key=module+':'+name;if(!definitions.has(key))definitions.set(key,[]);definitions.get(key).push({file:path,line:n.loc.start.line,source:source.slice(n.start,n.end)});}});
 }
 const file=directory+'/router.js',source=texts[file],ast=parse(source,{sourceType:'module'});
 function walk(n,env={base}){
  if(!n||typeof n!=='object')return;
  if(n.type==='ForOfStatement'){
   const list=value(n.right,env),binding=n.left.declarations?.[0]?.id;
   if(!Array.isArray(list))throw Error('Unexpanded route loop '+file+':'+n.loc.start.line);
   for(const item of list){const e={...env};if(binding.type==='Identifier')e[binding.name]=item;else binding.elements.forEach((b,i)=>e[b.name]=item[i]);walk(n.body,e);}return;
  }
  if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&['router','r','app'].includes(n.callee.object.name)&&['get','post','patch','put','delete'].includes(n.callee.property.name)){
   const path=value(n.arguments[0],env);
   if(typeof path!=='string')return; // management HTML regex is inventoried separately below.
   const prefix=module==='identity'?'':base+'/'+module;
   const url=prefix+path;
   if(!url.startsWith('/api/'))return;
   const handler=n.arguments.at(-1),calls=[];
   nodes(handler,c=>{if(c.type==='CallExpression'&&c.callee.type==='MemberExpression'&&['s','service','masters'].includes(c.callee.object.name)){const name=c.callee.computed?value(c.callee.property,env):c.callee.property.name;if(name)calls.push(name);}});
   const contracts=[...new Set(calls)].flatMap(name=>definitions.get(module+':'+name)||[]);
   const inline={file,line:handler.loc.start.line,source:source.slice(handler.start,handler.end)};
   if(!contracts.length)contracts.push(inline);
   const permissions=[...new Set([...contracts,inline].flatMap(c=>[...c.source.matchAll(/(?:\.read\(|\brun\()\s*(?:req\.)?session\s*,\s*([^,]+)|\bpermission\s*:\s*([^,}]+)/g)].flatMap(m=>[...(m[1]||m[2]).matchAll(/['"]([a-z][a-z_]*(?:\.[a-z_]+)+)['"]/g)].map(v=>v[1]))))];
   const method=n.callee.property.name.toUpperCase();
   routes.push({method,url,module,source:file,line:n.loc.start.line,handler:source.slice(handler.start,handler.end),serviceMethods:calls,contracts,permissions,enabledInSimpleV1:module==='simple-v1'||module==='identity'&&/\/(session\/(csrf|login|logout|current)|profile\/password)$/.test(url),converted:module==='simple-v1'?(method==='GET'||/\/(?:items|parties)(?:\/:id)?$/.test(url)||method!=='GET'&&/\/documents(?:\/:id(?:\/(?:post|cancel))?)?$/.test(url)):module==='identity'&&/\/(session\/(csrf|login|logout|current)|profile\/password)$/.test(url),idempotency:module==='simple-v1'&&method!=='GET'?'UUID Idempotency-Key; actor and canonical operation/input SHA256; saved result replay or 409 IDEMPOTENCY_CONFLICT':method==='GET'?'Read; no business command key':/Idempotency|command\(req\)|key\(req\)/.test(source.slice(handler.start,handler.end))?'Idempotency-Key; coordinate/command helper defines replay and fingerprint conflict':'Not a business command key; see exact handler',request:source.slice(handler.start,handler.end).match(/req\.(body|query|params\.[a-zA-Z]+)/g)||[],successStatus:/status\(201\)/.test(source.slice(handler.start,handler.end))?201:/status\(204\)/.test(source.slice(handler.start,handler.end))?204:200});
  }
  for(const [key,v]of Object.entries(n)){if(['loc','start','end'].includes(key))continue;if(Array.isArray(v))v.forEach(x=>walk(x,env));else if(v&&typeof v==='object')walk(v,env);}
 }
 walk(ast);
}
routes.push({method:'POST',url:'/api/v1/public/inquiries',module:'inquiries',source:'server/src/inquiries/api.js',line:1,converted:false,enabledInSimpleV1:true,request:['JSON inquiry fields; validation.js'],successStatus:200,idempotency:'Submission key/fingerprint and delivery uncertainty; see submissions.js',permissions:[],handler:'inquiryApi(config, createSubmissions(config, delivery, options), now)',contracts:[],serviceMethods:[]});
routes.push({method:'GET',url:'/weatherforecast',module:'template',source:'server/src/app.js',line:53,converted:false,enabledInSimpleV1:false,request:[],successStatus:200,idempotency:'None; nondeterministic template compatibility endpoint',permissions:[],handler:'Five random forecast records {date,temperatureC,temperatureF,summary}',contracts:[],serviceMethods:[]});
for(const method of ['GET','HEAD'])routes.push({method,url:'/healthz',module:'health',source:'server/src/app.js',line:32,converted:true,enabledInSimpleV1:true,request:[],successStatus:200,idempotency:'Read-only liveness; no database connection',permissions:[],handler:"Production profile: {status:'ok'}; HEAD has no body. Blocked GoDaddy preview returns {status:'blocked',code:'GODADDY_COMPATIBILITY_BLOCKED',...}; remote dev tool adds mode/businessWrites. These diagnostic profiles are not PHP deployment profiles.",contracts:[],serviceMethods:[]});
const unique=new Map(routes.map(r=>[r.method+' '+r.url,r]));
const result=[...unique.values()];
for(const route of result){
 if(route.converted&&route.module==='simple-v1'&&route.method!=='GET'){
  route.phpMilestone=route.url.includes('/documents')?'PHP-6':'PHP-2';
  route.conversionScope=route.url.includes('/documents')?'all-thirteen-document-kinds':'master-data';
  if(route.conversionScope==='all-thirteen-document-kinds')route.convertedKinds=['STOCK_OPENING','CLIENT_OPENING','VENDOR_OPENING','PRODUCTION','PURCHASE','CHALLAN','CHALLAN_RETURN','CLIENT_PAYMENT','VENDOR_PAYMENT','PAYMENT_REVERSAL','STOCK_CORRECTION','OPENING_CORRECTION','EXPENSE'];
 }
}
const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ').replaceAll('\r','');
await mkdir('docs/php-migration',{recursive:true});
const link=(f,line)=>`[${f}:${line}](../../${f}#L${line})`;
let md=`# API parity matrix\n\nStarting reference: bf749544a322715348966b75ceec49ffc5923468. Generated by \`node scripts/php-api-inventory.mjs\` from the untouched Express source. ${result.length} method/URL contracts, with loop-generated routes expanded.\n\nThis matrix inventories legacy routes as well as the active Simple V1 profile. Legacy management modules are deliberately blocked by Express with 403 LEGACY_DISABLED_IN_V1 in that profile; their presence is not permission to activate them. PHP-6 completes paid-only EXPENSE posting. All thirteen active Simple V1 document kinds support draft creation, editing, posting and cancellation. Integrated register, ledger, inventory and observational reconciliation parity is independently verified.\n\nExact request/response handlers, service method bodies, validation, permission predicates and source hashes are in [API-CONTRACT-INVENTORY.json](API-CONTRACT-INVENTORY.json). Service bodies include conditional permission checks and side effects; shared transaction/authorization helpers remain authoritative. JSON fields must retain their source spelling and types; DECIMAL and BIGINT are strings, INT flags/versions are numbers unless explicitly converted.\n\n## Shared transport and errors\n\nManagement requires verified HTTPS, same-origin unsafe requests, application/json, 12 KiB bodies, HttpOnly/Secure/SameSite=Strict host cookies, and synchronizer CSRF tokens. Session/csrf is anonymous; session/login requires an anonymous CSRF session. Other endpoints require portal.access before CSRF, then endpoint permissions. Disabled or stale identities/expiry fail with 401; permission checks fail with 403. Idle expiry is 30 minutes, absolute expiry 8 hours. Forced rotation restricts business access.\n\nIdentity errors use {error:{code,reference}}. Simple V1 validation/400/409 adds message and optional fieldErrors/details from errors.js. Other shared codes: HTTPS_REQUIRED, ORIGIN_REJECTED, JSON_REQUIRED, INVALID_INPUT, REQUEST_TOO_LARGE, CSRF_REJECTED, AUTH_REQUIRED, SESSION_EXPIRED, ACCESS_DENIED, PASSWORD_CHANGE_REQUIRED, IDENTITY_UNAVAILABLE, IDENTITY_CONFLICT, INVALID_REFERENCE_OR_CONSTRAINT. Read contracts and representative errors are tested against actual Express JSON responses, ignoring only correlation UUID values.\n\nSimple V1 reads lock identity_guard inside a database transaction, require administrator + matching v1_control.operator_id, and reject forced rotation. Business reads mutate no stock, documents, journals, counters or commands. Session expiry refresh and security audit writes are separate authentication effects. Writes require UUID command keys, immutable command results, canonical input fingerprints, READY gate, optimistic versions and row locks in deterministic item order. Rollback covers all posting effects and command receipts. Never substitute a simplified financial calculation.\n\n## Endpoint inventory\n\n| Method / URL | PHP milestone | Request / response authority | Permission / profile | Idempotency |\n| --- | --- | --- | --- | --- |\n`;
for(const r of result){const status=r.converted?(r.module==='simple-v1'&&r.method!=='GET'?(r.url.includes('/documents')?'PHP-6 all thirteen kinds':'PHP-2 converted'):'Converted'):r.enabledInSimpleV1?'Pending':'Legacy blocked';const perm=r.module==='simple-v1'?'portal.access + administrator + designated operator':r.module==='identity'?r.url.endsWith('/csrf')?'Anonymous':r.url.endsWith('/login')?'Anonymous + CSRF':r.permissions.join(', ')||'See identity service':r.permissions.join(', ')||'Exact service predicate (JSON inventory)';md+=`| ${r.method} \`${esc(r.url)}\` | ${status} | ${link(r.source,r.line)}; success ${r.successStatus}; ${esc([...new Set(r.request)].join(', ')||'No JSON input')} | ${esc(perm)} | ${esc(r.idempotency)} |\n`;}
md+='\n## Schema and side-effect authority\n\n';
const manifests={};
for(const module of [...modules,'inquiries']){
const files=(await readdir('server/src/'+module)).filter(f=>f.endsWith('.js')).map(f=>'server/src/'+module+'/'+f);
manifests[module]=[];
for(const path of files){const source=texts[path]??await readFile(path,'utf8');const errors=[...new Set([...source.matchAll(/['"]([A-Z][A-Z_]{3,})['"]/g)].map(m=>m[1]))];manifests[module].push({file:path,sha256:createHash('sha256').update(source).digest('hex'),errorAndEnumVocabulary:errors});}
md+=`- **${module}**: `+files.map(f=>link(f,1)).join(', ')+'.\n';
}
md+='\n## Explicit differences and pending work\n\nPHP uses a separate __Host-upms-php cookie with opaque random tokens hashed in the same sessions table. Node cookie signatures are not imported; existing sessions remain untouched, and existing credentials work at the PHP login. CSRF material is encrypted in session data. Node Argon2id PHC parameter order is normalized in memory for PHP verification; stored hashes are unchanged. PHP remains restricted to isolated local test schemas. No production database connection profile is enabled.\n\nPHP-6: POST/PATCH items and parties plus POST/PATCH documents, POST documents/:id/post and POST documents/:id/cancel are converted. Document writes support STOCK_OPENING, CLIENT_OPENING, VENDOR_OPENING, PRODUCTION, PURCHASE, CHALLAN, CHALLAN_RETURN, CLIENT_PAYMENT, VENDOR_PAYMENT, PAYMENT_REVERSAL, STOCK_CORRECTION, OPENING_CORRECTION and EXPENSE, including stored-draft and saved-receipt scope checks. Public inquiry delivery, legacy modules and compatibility weatherforecast remain pending; legacy ERP paths retain their disabled profile. No active Simple V1 document kind remains pending. Unknown Simple V1 routes return 404. Public inquiry must not be redirected to a false-success stub. React PDF/Excel exports are client-side artifacts and require browser/download regression before write cutover.\n';
await writeFile('docs/php-migration/API-PARITY-MATRIX.md',md);
await writeFile('docs/php-migration/API-CONTRACT-INVENTORY.json',JSON.stringify({reference:'bf749544a322715348966b75ceec49ffc5923468',routes:result,modules:manifests},null,2)+'\n');
console.log(JSON.stringify({endpoints:result.length,converted:result.filter(r=>r.converted).length,modules:Object.keys(manifests).length}));
