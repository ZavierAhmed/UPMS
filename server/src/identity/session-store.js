import session from 'express-session';
import { digest, audit, identity } from './service.js';
import { transaction, query } from './database.js';

export class MysqlSessionStore extends session.Store {
  constructor(db, config) { super(); this.db = db; this.config = config; }
  get(sid, callback) {
    query(this.db('sessions').where({ token_hash: digest(sid) }).first()).then(row => {
      const now = Date.now();
      if (!row || row.revoked || now >= Number(row.idle_expires) || now >= Number(row.absolute_expires)) return callback(null, null);
      callback(null, JSON.parse(row.data));
    }).catch(callback);
  }
  set(sid, value, callback = () => {}) {
    transaction(this.db, async trx => {
      if (value.userId) {
        const current = await identity(trx, value.userId);
        if (current.version !== value.authVersion || !current.permissions.includes('portal.access')) throw new Error('Authorization revoked.');
      }
      const now = Date.now();
      const issued = value.issuedAt || now;
      if (now >= issued + this.config.absoluteMs) throw new Error('Session expired.');
      const key = digest(sid);
      const existing = await query(trx('sessions').where({ token_hash: key }).first());
      if (existing && (existing.revoked || now >= Number(existing.idle_expires) || now >= Number(existing.absolute_expires))) throw new Error('Session expired or revoked.');
      await query(trx('sessions').where('absolute_expires', '<', now).delete());
      if (!existing) {
        const [{ count }] = await query(trx('sessions').count('* as count'));
        if (Number(count) >= 4096) throw new Error('Session capacity reached.');
      }
      await query(trx('sessions').insert({ token_hash: key, user_id: value.userId || null,
        data: JSON.stringify({ ...value, issuedAt: issued }), idle_expires: now + this.config.idleMs,
        absolute_expires: issued + this.config.absoluteMs }).onConflict('token_hash').merge());
      if (value.userId && !existing) await audit(trx, value.userId, value.userId, 'login.succeeded');
    }).then(() => callback()).catch(callback);
  }
  touch(sid, value, callback) {
    // Never upsert on touch: a concurrently revoked session cannot be recreated.
    query(this.db('sessions').where({ token_hash: digest(sid), revoked: false }).where('idle_expires', '>', Date.now())
      .where('absolute_expires', '>', Date.now()).update({ idle_expires: Date.now() + this.config.idleMs }))
      .then(() => callback()).catch(callback);
  }
  destroy(sid, callback = () => {}) {
    transaction(this.db, async trx => {
      const row = await query(trx('sessions').where({ token_hash: digest(sid) }).first());
      await query(trx('sessions').where({ token_hash: digest(sid) }).update({ revoked: true, data: '{}' }));
      if (row?.user_id) await audit(trx, row.user_id, row.user_id, 'session.logout');
    }).then(() => callback()).catch(callback);
  }
}
