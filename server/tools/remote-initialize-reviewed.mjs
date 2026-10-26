// Explicit one-shot migrations and initial administrator only. No listener or runtime activation.
import knex from 'knex';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes} from 'node:crypto';
import {remoteTarget,safeError,failure} from '../src/development/remote.js';
import {initializeReviewedRemote} from '../src/development/initialize.js';
import {createIdentityService} from '../src/identity/service.js';
import {verifyPassword} from '../src/identity/passwords.js';
let db;
try{
  const env={...parseEnv(await readFile('.env.remote-development.local','utf8')),...process.env};
  const target=remoteTarget(env),args=process.argv.slice(2);
  const value=name=>args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
  const confirmation={target:value('--confirm-target'),serverId:value('--confirm-server-id'),account:value('--confirm-account'),plaintext:args.includes('--allow-plaintext')};
  if(!env.DB_PASSWORD)throw failure('MISSING_CREDENTIALS');
  if(confirmation.target!=='184.168.100.110:3306/upms'||confirmation.serverId!=='1'||confirmation.account!=='upms_user@103.244.178.33'||!confirmation.plaintext)throw failure('REMOTE_TARGET_REJECTED');
  db=knex({client:'mysql2',connection:{...target,password:env.DB_PASSWORD,ssl:false,charset:'utf8mb4',timezone:'Z',connectTimeout:3000,multipleStatements:false},
    acquireConnectionTimeout:5000,pool:{min:0,max:3},log:{warn(){},error(){},debug(){},deprecate(){}}});
  const result=await initializeReviewedRemote(db,env,confirmation);
  if(await db('user_roles').where({role_code:'administrator'}).first()){
    console.log(JSON.stringify({initialized:true,administratorAlreadyExists:true,passwordReset:false,operationalActivation:false}));
  }else{
    const password=randomBytes(24).toString('base64url')+'aA1!',username='admin';
    const credentials='server/.local/remote-cpanel-dev/administrator-login.txt';
    await writeFile(credentials,`Username: ${username}\nTemporary password: ${password}\nChange password on first login. Application activation is a separate step.\n`,{mode:0o600,flag:'wx'});
    const id=await createIdentityService(db).bootstrap({username,displayName:'UPMS Administrator',password,requirePasswordChange:true});
    const user=await db('users').where({id}).first();
    if(!await verifyPassword(user.password_hash,password))throw Error('Administrator verification failed');
    console.log(JSON.stringify({initialized:true,migrations:result.migrations,administratorCreated:true,username,administratorId:id,passwordVerified:true,passwordChangeRequired:true,credentialsFile:credentials,operationalActivation:false}));
  }
}catch(error){console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
finally{await db?.destroy();}
