import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const required=['package.json','package-lock.json','startup.mjs','deployment-runner.mjs','run-state.mjs','verify-release.mjs','diagnostic.mjs','README.md','ENVIRONMENT.template.txt','.nvmrc'];
const stop=code=>{const e=new Error(code);e.diagnosticCode=code;throw e;};
export async function verifyRelease(root,expectedSha){
 try{
  const manifest=JSON.parse(await readFile(join(root,'diagnostic-deployment-manifest.json'),'utf8'));
  if(manifest.kind!=='CONTROLLED_READ_ONLY_ONE_SHOT'||manifest.operationalManagementEnabled!==false||manifest.httpListener!==false||manifest.databaseWrites!==false||!/^([0-9a-f]{40})$/.test(manifest.sourceCommit)||expectedSha&&manifest.sourceCommit!==expectedSha)stop('RELEASE_IDENTITY_MISMATCH');
  if(JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify([...required].sort()))stop('RELEASE_INTEGRITY_FAILED');
  for(const name of required){const file=join(root,name),stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||createHash('sha256').update(await readFile(file)).digest('hex')!==manifest.files[name])stop('RELEASE_INTEGRITY_FAILED');}
  const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  if(pkg.scripts.start!=='node startup.mjs'||pkg.scripts.build!=='node verify-release.mjs --verify-only'||JSON.stringify(pkg.dependencies)!==JSON.stringify({mysql2:'3.24.6'}))stop('RELEASE_INTEGRITY_FAILED');
  return manifest;
 }catch(error){if(error.diagnosticCode)throw error;stop('RELEASE_INTEGRITY_FAILED');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==3||process.argv[2]!=='--verify-only')throw Error();await verifyRelease(fileURLToPath(new URL('.',import.meta.url)));process.stdout.write('{"packageIntegrityVerified":true,"databaseAccessAttempted":false}\n');}
 catch{process.stderr.write('{"status":"BLOCKED","code":"RELEASE_INTEGRITY_FAILED","databaseAccessAttempted":false}\n');process.exitCode=2;}
}
