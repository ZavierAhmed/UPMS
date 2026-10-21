import { fileURLToPath } from 'node:url';
import { capabilities } from './database.js';
import { validateEngine } from './engine.js';
export async function migrate(db, env = process.env) {
  if (env.NODE_ENV === 'production' || env.DB_CONFIRM_NAME !== env.DB_NAME)
    throw new Error('Explicit nonproduction DB_CONFIRM_NAME must match DB_NAME.');
  if (env.DB_NAME === 'upms' && env.UPMS_PREFLIGHT_VALIDATED !== 'true')
    throw new Error('The owner database requires a verified private pre-migration checkpoint.');
  const info = await capabilities(db);
  validateEngine(info.version, env);
  const result = await db.migrate.latest({ directory: fileURLToPath(new URL('../../migrations/', import.meta.url)),
    tableName: 'upms_identity_migrations', loadExtensions: ['.js'], disableTransactions: true });
  return { database: info.database_name, version: info.version, batch: result[0], migrations: result[1] };
}
