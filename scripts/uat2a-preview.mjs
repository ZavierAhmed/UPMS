import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {startEmployeeLauncher} from './uath1-launcher.mjs';
import {employeePreview} from './uath1-preview.mjs';
import {provisionChequeOwner} from './uat2-preview.mjs';
import {exists,atomicJson} from './uath1-workspace.mjs';
import {extrasHelper} from './uat2a-workspace.mjs';

const assetRoot=resolve('tmp/php-runtime/uat2a-assets');

export async function startExtrasPreview(options={}) {
 if(Object.keys(options).some(key=>!['directory','bindingPath','port'].includes(key)))throw Error('UAT2A_PREVIEW_OPTION_REJECTED');
 const directory=resolve(options.directory??'tmp/php-runtime/uat2a-manual-setup');
 const bindingPath=resolve(options.bindingPath??'tmp/php-runtime/uat2a-manual-binding.json');
 const port=options.port??5197;
 if(!Number.isInteger(port)||port<1||port>65535||[3330,5173,5180,5196].includes(port))throw Error('UAT2A_PREVIEW_PORT_REJECTED');
 if(await exists(bindingPath)) {
  const binding=JSON.parse(await readFile(bindingPath,'utf8'));
  if(resolve(binding.directory)!==directory)throw Error('UAT2A_MANUAL_BINDING_REJECTED');
  for(const name of ['owner-uat-binding.json','uath1-owner-binding.json','uat2-owner-binding.json']) {
   if(JSON.parse(await readFile(resolve('tmp/php-runtime',name),'utf8')).schema===binding.schema)throw Error('UAT2A_EXISTING_OWNER_TARGET_REJECTED');
  }
 }
 return startEmployeeLauncher({port,directory,bindingPath,cookieName:'upms_cheque_uat2a',workspaceTitle:'UPMS Cheque UAT-2A',workspaceDescription:'A separate synthetic test workspace for cheque clearance, issuing banks and encrypted attachments. The existing owner records remain on port 5196.',
  provision:async options=>{
   const inFlight=resolve(directory,'extras-install-in-flight.json');
   if(await exists(inFlight))throw Error('UAT2A_PARTIAL_INSTALL_REVIEW_REQUIRED');
   const binding=await provisionChequeOwner(options),fixture={binding,envPath:resolve(directory,'test.env')};
   options.onStage('cheque-evidence-extension');await atomicJson(inFlight,{startedUtc:new Date().toISOString()});
   const result=await extrasHelper(fixture,'install');
   const expected=JSON.parse(await readFile('upms.php/resources/cheque-extra-schema-hashes.json','utf8'));
   if(JSON.stringify(result.schemaHashes)!==JSON.stringify(expected))throw Error('UAT2A_EXTRA_SCHEMA_HASH_REJECTED');
   const proof=await extrasHelper(fixture,'verify');await atomicJson(resolve(directory,'cheque-guards.json'),proof);
   const env=await readFile(fixture.envPath,'utf8');
   await writeFile(fixture.envPath,env+'UPMS_CHEQUE_EXTRAS_ENABLED=true\nUPMS_CHEQUE_ATTACHMENT_PDFINFO="C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdfinfo.exe"\n');
   return binding;
  },
  previewFactory:async(path,options)=>{
   const binding=JSON.parse(await readFile(path,'utf8')),env=await readFile(resolve(binding.directory,'test.env'),'utf8');
   if(!env.split(/\r?\n/).includes('UPMS_CHEQUE_EXTRAS_ENABLED=true')||/^UPMS_PRODUCTION_PROFILE=.+$/m.test(env))throw Error('UAT2A_MANUAL_PROFILE_REJECTED');
   await extrasHelper({binding,envPath:resolve(binding.directory,'test.env')},'verify');
   return employeePreview(path,{...options,assetRoot});
  },
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const app=await startExtrasPreview();console.log(JSON.stringify({url:'http://127.0.0.1:5197/management',...app.status(),existingOwnerMigrated:false,productionContacted:false}));
}
