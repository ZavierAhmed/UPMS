import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {readonlyPreflight,remoteTarget,safeError,failure} from '../src/development/remote.js';
import {identityConfig} from '../src/identity/config.js';

try {
  const [major,minor,patch]=process.versions.node.split('.').map(Number);
  if(!(major===22&&(minor>23||minor===23&&patch>=4)||major===24&&minor>=22))throw failure('SUPPORTED_NODE_REQUIRED');
  let privateEnv={};
  try{privateEnv=parseEnv(await readFile('.env.remote-development.local','utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const env={...privateEnv,...process.env};
  remoteTarget(env);
  const action=process.argv[2]||'start';
  if(!['start','preflight'].includes(action))throw failure('REMOTE_WRITES_AWAIT_OWNER_REVIEW');
  if(action==='start'){
    if(env.MANAGEMENT_ENABLED!=='true')throw failure('REMOTE_TARGET_REJECTED');
    identityConfig(env);
  }
  console.log(JSON.stringify(await readonlyPreflight(env),null,2));
  // Intentionally no listener/session store/pool before separate approval of initialization.
  if(action==='start')throw failure('REMOTE_WRITES_AWAIT_OWNER_REVIEW');
}catch(error){console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
