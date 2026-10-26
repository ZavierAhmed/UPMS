import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync,crc32} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const path='artifacts/upms-godaddy-db-diagnostic-node22.zip',bytes=await readFile(path),hash=b=>createHash('sha256').update(b).digest('hex'),files=new Map();
assert.equal(hash(bytes),(await readFile(path+'.sha256','utf8')).split(' ')[0]);
let offset=0;while(bytes.readUInt32LE(offset)===0x04034b50){const header=bytes.subarray(offset,offset+30),size=header.readUInt32LE(18),nameLength=header.readUInt16LE(26),extra=header.readUInt16LE(28),name=bytes.subarray(offset+30,offset+30+nameLength).toString(),start=offset+30+nameLength+extra;assert.equal(header.readUInt16LE(8),8);assert.ok(!files.has(name));const data=inflateRawSync(bytes.subarray(start,start+size));assert.equal(data.length,header.readUInt32LE(22));assert.equal(crc32(data),header.readUInt32LE(14));files.set(name,data);offset=start+size;}
assert.deepEqual([...files.keys()].sort(),['.nvmrc','README.md','cli.mjs','diagnostic-manifest.json','diagnostic.mjs','no-server.mjs','package-lock.json','package.json'].sort());
const manifest=JSON.parse(files.get('diagnostic-manifest.json')),pkg=JSON.parse(files.get('package.json')),lock=JSON.parse(files.get('package-lock.json'));
assert.equal(manifest.kind,'CLI_ONLY_READ_ONLY_DIAGNOSTIC');assert.equal(manifest.httpListener,false);assert.equal(manifest.operationalManagementEnabled,false);assert.equal(manifest.hostedResultsIncluded,false);
for(const [name,digest]of Object.entries(manifest.files))assert.equal(hash(files.get(name)),digest);assert.equal(Object.keys(manifest.files).length,7);
assert.deepEqual(pkg.dependencies,{mysql2:'3.24.6'});assert.equal(pkg.engines.node,'^22.23.4');assert.equal(pkg.scripts.start,'node no-server.mjs');assert.equal(pkg.scripts.diagnose,'node cli.mjs');assert.equal(lock.packages['node_modules/mysql2'].version,'3.24.6');
assert.ok(!/\.listen\(|createServer\(|express|\.\/server\//.test(files.get('cli.mjs').toString()+files.get('diagnostic.mjs').toString()+files.get('no-server.mjs').toString()));
const receiptPath='artifacts/upms-godaddy-db-diagnostic-receipt.json',receipt=JSON.parse(await readFile(receiptPath));assert.equal(receipt.sourceCommit,manifest.sourceCommit);assert.equal(receipt.sha256,hash(bytes));
receipt.packageVerification={passed:true,crc:true,manifestHashes:true,strictFileAllowlist:true,noAppOrHttpServer:true,noPrivateConfigOrResults:true};
if(process.argv[2]){
 const cwd=resolve(process.argv[2]);for(const [name,data]of files)assert.equal(hash(await readFile(resolve(cwd,name))),hash(data));
 const privateEnv={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,DB_PASSWORD:'PRIVATE_PACKAGE_CANARY_NOT_FOR_LOGS'};
 const build=spawnSync(process.execPath,['--check','diagnostic.mjs'],{cwd,encoding:'utf8',windowsHide:true});assert.equal(build.status,0,build.stderr);
 const start=spawnSync(process.execPath,['no-server.mjs'],{cwd,env:privateEnv,encoding:'utf8',windowsHide:true,timeout:3000});assert.equal(start.status,2);assert.match(start.stderr,/No web server was started/);
 const diagnostic=spawnSync(process.execPath,['cli.mjs','--run-read-only'],{cwd,env:privateEnv,encoding:'utf8',windowsHide:true,timeout:3000});assert.equal(diagnostic.status,2);assert.equal(JSON.parse(diagnostic.stdout).code,'MISSING_CREDENTIALS');assert.ok(!diagnostic.stdout.includes(privateEnv.DB_PASSWORD));assert.ok(!diagnostic.stderr.includes(privateEnv.DB_PASSWORD));
 const dependencies=JSON.parse(await readFile(resolve(cwd,'node_modules/mysql2/package.json')));assert.equal(dependencies.version,'3.24.6');receipt.node22InstallSmoke={passed:true,node:process.versions.node,mysql2:dependencies.version,cliMissingCredentialsSafe:true,startDoesNotConnect:true,secretCanaryAbsent:true};
}
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.info(JSON.stringify(receipt,null,2));
