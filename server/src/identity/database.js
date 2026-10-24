import knex from 'knex';
import { databaseConfig } from './config.js';
import { validateEngine } from './engine.js';
import { verifyRuntimeGrants,simpleV1RuntimePrivileges } from './grants.js';
import {syntheticV1} from '../simple-v1/catalog.js';

export function createDatabase(env = process.env) {
  const db = knex({ client: 'mysql2', connection: databaseConfig(env), acquireConnectionTimeout: 3000,
    pool: { min: 0, max: 5, acquireTimeoutMillis: 3000, createTimeoutMillis: 3500,
      afterCreate(connection, done) {
        const run = connection.query.bind(connection);
        connection.query = (options, ...args) => {
          const callback = args.at(-1);
          if (typeof callback === 'function') args[args.length - 1] = (error, ...result) => {
            // A timed-out statement must never keep running on a reusable transaction connection.
            if (error?.code === 'PROTOCOL_SEQUENCE_TIMEOUT') connection.destroy();
            callback(error, ...result);
          };
          return run(typeof options === 'string' ? { sql: options, timeout: 5000 } : { ...options, timeout: 5000 }, ...args);
        };
        const fail = error => { connection.destroy(); done(error, connection); };
        connection.query('SELECT VERSION() AS version, CURRENT_USER() AS account', (error, rows) => {
          if (error) return fail(error);
          try { validateEngine(rows[0].version, env); } catch (invalid) { return fail(invalid); }
          const initialize = () => connection.query("SET SESSION time_zone = '+00:00', innodb_lock_wait_timeout = 3, sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'", err => err ? fail(err) : done(null, connection));
          if (env.IDENTITY_DB_PURPOSE !== 'runtime') return initialize();
          connection.query('SHOW GRANTS FOR CURRENT_USER', (grantError, grants) => {
            if (grantError) return fail(grantError);
            try { verifyRuntimeGrants(grants, env.DB_NAME, rows[0].account,syntheticV1(env)?simpleV1RuntimePrivileges:undefined); } catch (invalid) { return fail(invalid); }
            initialize();
          });
        });
      } },
    log: { warn() {}, error() {}, deprecate() {}, debug() {} },
  });
  const acquire = db.client.acquireConnection.bind(db.client);
  db.client.acquireConnection = async () => {
    if (db.client.pool?.numPendingAcquires() >= 20) throw new Error('Identity database queue full.');
    return acquire();
  };
  return db;
}

export const query = (builder) => builder.timeout(5500);
export async function guard(trx) {
  const row = await query(trx('identity_guard').where({ id: 1 }).forUpdate().first());
  if (!row) throw new Error('Identity migration required.');
}
export async function transaction(db, action) {
  return db.transaction(async trx => { await guard(trx); return action(trx); });
}
export async function capabilities(db) {
  const [rows] = await db.raw('SELECT VERSION() AS version, DATABASE() AS database_name, @@session.time_zone AS time_zone, @@character_set_database AS charset, @@collation_database AS collation').timeout(5000);
  const [engines] = await db.raw("SELECT ENGINE,SUPPORT,TRANSACTIONS FROM information_schema.ENGINES WHERE ENGINE='InnoDB'").timeout(5000);
  if (!engines.some(e => e.TRANSACTIONS === 'YES')) throw new Error('InnoDB unavailable.');
  return { ...rows[0], engine: 'InnoDB' };
}
