import { createApp } from '../src/app.js';
import { createDatabase } from '../src/identity/database.js';
import { identityConfig } from '../src/identity/config.js';
import { loadConfig } from '../src/config/index.js';
import { readFile, unlink } from 'node:fs/promises';
let db;
try {
  if (process.env.DB_NAME !== 'upms' || process.env.DB_USER !== 'upms_runtime' || !process.env.SESSION_SECRET)
    throw new Error('Dedicated owner runtime and private signing secret required.');
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local port.');
  db = createDatabase({ ...process.env, IDENTITY_DB_PURPOSE:'runtime' });
  await db.raw('SELECT 1'); // Enforce actual engine/account/grants before opening a listener.
  const origin=`http://127.0.0.1:${port}`;
  const management=identityConfig({ ...process.env,NODE_ENV:'development',MANAGEMENT_ENABLED:'true',MANAGEMENT_LOCAL_HTTP:'true',MANAGEMENT_ORIGIN:origin });
  const app=createApp({config:loadConfig({NODE_ENV:'development',INQUIRY_MODE:'Disabled'}),management,identityDatabase:db});
  const server=app.listen(port,'127.0.0.1',()=>console.info(`Local UPMS management: ${origin}/management (loopback only; SMTP disabled)`));
  // Delete only the temporary encrypted handoff after the audited owner rotation.
  const cleanup=setInterval(async()=>{
    try {
      const path='server/.local/p21a/initial-administrator.metadata.json';
      const pending=JSON.parse(await readFile(path,'utf8'));
      const changed=await db('identity_audit_events').where({target_id:pending.userId,action:'user.password.changed'}).where('id','>',pending.bootstrapEventId).first('id');
      if(changed){
        await unlink('server/.local/p21a/initial-administrator.credential.clixml').catch(error=>{if(error.code!=='ENOENT')throw error;});
        await unlink(path);
      }
    } catch { /* No secret diagnostics. Retry on the next local interval. */ }
  },10000);cleanup.unref();
  server.on('error',async()=>{console.error('Local listener unavailable; choose an unused local PORT.');await db.destroy();process.exitCode=1;});
  for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{
    clearInterval(cleanup);
    server.close(async()=>{await db.destroy();process.exitCode=0;});server.closeIdleConnections();setTimeout(()=>server.closeAllConnections(),5000).unref();
  });
} catch {
  console.error('Local management start refused. Verify runtime profile, database/schema/grants and private session secret.');
  await db?.destroy();process.exitCode=1;
}
