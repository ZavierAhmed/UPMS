import { resolve } from 'node:path';
import {syntheticV1} from '../simple-v1/catalog.js';

export function identityConfig(env = process.env) {
  if (env.MANAGEMENT_ENABLED !== 'true') return null;
  const production = env.NODE_ENV === 'production';
  const origin = new URL(env.MANAGEMENT_ORIGIN || '');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (origin.origin !== env.MANAGEMENT_ORIGIN || origin.username || origin.password ||
      (!production && origin.protocol === 'http:' && !(local && env.MANAGEMENT_LOCAL_HTTP === 'true')) ||
      (production && origin.protocol !== 'https:') || !['http:', 'https:'].includes(origin.protocol))
    throw new Error('Invalid isolated management origin.');
  if (!env.SESSION_SECRET || Buffer.byteLength(env.SESSION_SECRET) < 32)
    throw new Error('SESSION_SECRET requires at least 32 private random bytes.');
  if(env.UPMS_SIMPLE_V1&&!syntheticV1(env))throw new Error('V1 requires an explicitly isolated synthetic database; live cutover is pending.');
  return { origin: origin.origin, secure: origin.protocol === 'https:', secret: env.SESSION_SECRET,
    cookieName: syntheticV1(env)?(origin.protocol==='https:'?'__Host-upms-simple-v1':'upms-simple-v1-local'):(origin.protocol === 'https:' ? '__Host-upms' : 'upms-local'),
    simpleV1:syntheticV1(env),root: resolve('upms.client/dist/management'), idleMs: 30 * 60_000, absoluteMs: 8 * 3600_000 };
}

export function databaseConfig(env = process.env) {
  if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST))
    throw new Error('P2.1 requires an explicit local DB_HOST.');
  if (!/^upms(?:_dev|_test_[a-z0-9_]+)?$/.test(env.DB_NAME || '') || !env.DB_USER || !env.DB_PASSWORD)
    throw new Error('Explicit dedicated UPMS database and credentials required.');
  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT.');
  return { host: env.DB_HOST, port, database: env.DB_NAME, user: env.DB_USER,
    password: env.DB_PASSWORD, timezone: 'Z', charset: 'utf8mb4', connectTimeout: 3000,
    supportBigNumbers: true, bigNumberStrings: true, dateStrings: true, multipleStatements: false };
}
