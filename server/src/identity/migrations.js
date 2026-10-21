import { fileURLToPath } from 'node:url';
import { capabilities } from './database.js';
export async function migrate(db, env = process.env) {
  if (env.NODE_ENV === 'production' || env.DB_CONFIRM_NAME !== env.DB_NAME)
    throw new Error('Explicit nonproduction DB_CONFIRM_NAME must match DB_NAME.');
  const info = await capabilities(db);
  if (/MariaDB/i.test(info.version) && env.DB_ALLOW_MARIADB_COMPATIBILITY !== 'true')
    throw new Error('MariaDB requires explicit compatibility-only opt in; it is not MySQL acceptance.');
  const version = info.version.match(/^(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
  if (!version || (!/MariaDB/i.test(info.version) && (version[0] < 8 || (version[0] === 8 && version[1] === 0 && version[2] < 16))))
    throw new Error('MySQL 8.0.16 or newer required.');
  const result = await db.migrate.latest({ directory: fileURLToPath(new URL('../../migrations/', import.meta.url)),
    tableName: 'upms_identity_migrations', loadExtensions: ['.js'], disableTransactions: true });
  return { database: info.database_name, version: info.version, batch: result[0], migrations: result[1] };
}
