import {createApp} from '../src/app.js';import {createDatabase} from '../src/identity/database.js';import {syntheticV1} from '../src/simple-v1/catalog.js';import {writeFile} from 'node:fs/promises';
if(!syntheticV1()||process.env.V1_TARGET!=='demo'||process.env.DB_NAME!=='upms_test_simplev1_demo_20261024_01')throw Error('Only the dedicated synthetic V1 demo may serve');
const db=createDatabase();await db.raw('SELECT 1');const app=createApp({identityDatabase:db}),server=app.listen(3110,'127.0.0.1',()=>console.info('Synthetic V1 demo listening on http://127.0.0.1:3110/management'));
await writeFile('server/.local/simple-v1/demo-server.json',JSON.stringify({pid:process.pid,schema:process.env.DB_NAME,port:3110,synthetic:true}),{flag:'wx'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await db.destroy();process.exit(0);}));
