import { randomUUID, createHash } from 'node:crypto';
import { transaction, query } from './database.js';
import { IdentityError, hashPassword, verifyPassword } from './passwords.js';
import { roles as catalog } from './catalog.js';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const utc = () => new Date();
export async function audit(trx, actor, target, action, details = {}, correlation = randomUUID()) {
  // Callers supply allowlisted metadata only; never request bodies or session/password material.
  await query(trx('identity_audit_events').insert({ actor_id: actor || null, target_id: target || null,
    action, correlation, details: JSON.stringify(details), created_at: utc() }));
}
export async function identity(trx, id) {
  const user = await query(trx('users').where({ id }).first());
  if (!user?.enabled) throw new IdentityError(401, 'SESSION_EXPIRED');
  const assigned = await query(trx('user_roles').where({ user_id: id }).select('role_code'));
  const grants = await query(trx('role_permissions').whereIn('role_code', assigned.map(r => r.role_code)).select('permission_code'));
  const bootstrap = await query(trx('identity_audit_events').where({ target_id: id }).whereIn('action', ['administrator.bootstrap', 'administrator.rotation.required']).orderBy('id', 'desc').first());
  const rotationRequired = bootstrap && JSON.parse(bootstrap.details).requirePasswordChange === true &&
    !await query(trx('identity_audit_events').where({ target_id: id, action: 'user.password.changed' }).where('id', '>', bootstrap.id).first());
  return { id: String(user.id), username: user.login_key, displayName: user.display_name,
    ...(rotationRequired ? { passwordChangeRequired: true } : {}),
    version: user.authorization_version, roles: assigned.map(r => r.role_code),
    permissions: [...new Set(grants.map(p => p.permission_code))].sort() };
}
export async function authorize(trx, session, permission) {
  if (!session?.userId) throw new IdentityError(401, 'AUTH_REQUIRED');
  const persisted = session.recordHash && await query(trx('sessions').where({ token_hash: session.recordHash }).first());
  if (!persisted || String(persisted.user_id) !== String(session.userId) || persisted.revoked || Date.now() >= Number(persisted.idle_expires) || Date.now() >= Number(persisted.absolute_expires))
    throw new IdentityError(401, 'SESSION_EXPIRED');
  const current = await identity(trx, session.userId);
  if (current.version !== session.authVersion) throw new IdentityError(401, 'SESSION_EXPIRED');
  if (current.passwordChangeRequired && !['portal.access','profile.read','profile.password','sessions.self'].includes(permission))
    throw new IdentityError(403, 'PASSWORD_CHANGE_REQUIRED');
  if (!current.permissions.includes(permission)) throw new IdentityError(403, 'ACCESS_DENIED');
  return current;
}
export function createIdentityService(db) {
  // Dummy work uses the same parameters as real users and does not reveal login existence.
  let dummy;
  const dummyHash = () => dummy ||= hashPassword(randomUUID()).catch(error => { dummy = undefined; throw error; });
  return {
    ready: dummyHash,
    async bootstrap(input) {
      const hash = await hashPassword(input.password);
      return transaction(db, async trx => {
        if (await query(trx('user_roles').where({ role_code: 'administrator' }).first())) throw new IdentityError(409, 'BOOTSTRAP_ALREADY_USED');
        const [id] = await query(trx('users').insert({ login_key: input.username, display_name: input.displayName,
          password_hash: hash, enabled: true, created_at: utc(), updated_at: utc() }));
        await query(trx('user_roles').insert({ user_id: id, role_code: 'administrator' }));
        await audit(trx, null, id, 'administrator.bootstrap', { roles: ['administrator'], source: 'explicit-local-command',
          ...(input.requirePasswordChange ? { requirePasswordChange: true } : {}) });
        return String(id);
      });
    },
    async login(username, password) {
      const key = username.toLowerCase();
      const allowed = await transaction(db, async trx => {
        const now = Date.now();
        await query(trx('login_attempts').where('window_start', '<', now - 120000).delete());
        const keys = ['global', digest(key)];
        let permitted = true;
        for (const [index, bucket] of keys.entries()) {
          let row = await query(trx('login_attempts').where({ bucket }).first());
          if (!row || now - Number(row.window_start) >= 60000) {
            // Bound the identifier table even with arbitrary attacker-controlled usernames.
            const [{ count }] = await query(trx('login_attempts').count('* as count'));
            if (!row && Number(count) >= 4096) { permitted = false; continue; }
            await query(trx('login_attempts').insert({ bucket, window_start: now, attempts: 1 }).onConflict('bucket').merge());
          } else {
            if (row.attempts >= (index ? 10 : 60)) permitted = false;
            await query(trx('login_attempts').where({ bucket }).update({ attempts: Math.min(row.attempts + 1, 1000) }));
          }
        }
        return permitted;
      });
      if (!allowed) throw new IdentityError(429, 'LOGIN_THROTTLED');
      const user = await query(db('users').where({ login_key: key }).first());
      const valid = await verifyPassword(user?.password_hash || await dummyHash(), password);
      return transaction(db, async trx => {
        const current = user && await query(trx('users').where({ id: user.id }).first());
        if (!valid || !current?.enabled || current.password_hash !== user.password_hash || current.authorization_version !== user.authorization_version) {
          await audit(trx, null, null, 'login.failed');
          return null;
        }
        return identity(trx, user.id);
      });
    },
    async read(session, permission, action) {
      try { return await transaction(db, async trx => action(trx, await authorize(trx, session, permission))); }
      catch (error) {
        if (error.code === 'ACCESS_DENIED') await transaction(db, trx => audit(trx, session.userId, session.userId,
          'authorization.denied', { permission }));
        throw error;
      }
    },
    async create(session, input) {
      // Authorization before expensive hashing; recheck inside the write transaction.
      await this.read(session, 'users.create', async () => {});
      const hash = await hashPassword(input.password);
      return this.read(session, 'users.create', async (trx, actor) => {
        await authorize(trx, session, 'roles.assign');
        const [id] = await query(trx('users').insert({ login_key: input.username, display_name: input.displayName,
          password_hash: hash, enabled: true, created_at: utc(), updated_at: utc() }));
        await query(trx('user_roles').insert(input.roles.map(role_code => ({ user_id: id, role_code }))));
        await audit(trx, actor.id, id, 'user.created', { roles: input.roles, reason: input.reason });
        return identity(trx, id);
      });
    },
    async update(session, id, input) {
      return this.read(session, 'users.update', async (trx, actor) => {
        await authorize(trx, session, 'roles.assign');
        const before = await identityIncludingDisabled(trx, id);
        if (before.version !== input.version) throw new IdentityError(409, 'STALE_VERSION');
        const admins = await query(trx('users as u').join('user_roles as r', 'r.user_id', 'u.id').where({ 'u.enabled': true, 'r.role_code': 'administrator' }).select('u.id'));
        if (before.enabled && before.roles.includes('administrator') && (!input.enabled || !input.roles.includes('administrator')) && admins.length <= 1)
          throw new IdentityError(409, 'LAST_ADMINISTRATOR');
        await query(trx('user_roles').where({ user_id: id }).delete());
        await query(trx('user_roles').insert(input.roles.map(role_code => ({ user_id: id, role_code }))));
        await query(trx('users').where({ id }).update({ enabled: input.enabled, authorization_version: before.version + 1, updated_at: utc() }));
        await query(trx('sessions').where({ user_id: id }).delete());
        await audit(trx, actor.id, id, 'user.authorization.changed', { before: { enabled: before.enabled, roles: before.roles }, after: { enabled: input.enabled, roles: input.roles }, reason: input.reason });
        return { id, version: before.version + 1 };
      });
    },
    async password(session, input) {
      if (input.currentPassword === input.newPassword) throw new IdentityError(400, 'PASSWORD_MUST_DIFFER');
      const before = await this.read(session, 'profile.password', (trx, actor) => query(trx('users').where({ id: actor.id }).first()));
      if (!await verifyPassword(before.password_hash, input.currentPassword)) throw new IdentityError(401, 'INVALID_CREDENTIALS');
      const hash = await hashPassword(input.newPassword);
      return this.read(session, 'profile.password', async (trx, actor) => {
        const row = await query(trx('users').where({ id: actor.id }).first());
        if (row.password_hash !== before.password_hash) throw new IdentityError(409, 'STALE_VERSION');
        await query(trx('users').where({ id: actor.id }).update({ password_hash: hash, authorization_version: actor.version + 1, updated_at: utc() }));
        await query(trx('sessions').where({ user_id: actor.id }).delete());
        await audit(trx, actor.id, actor.id, 'user.password.changed');
      });
    },
    async revoke(session, id) {
      return this.read(session, session.userId === id ? 'sessions.self' : 'sessions.revoke', async (trx, actor) => {
        await identityIncludingDisabled(trx, id);
        await query(trx('users').where({ id }).increment('authorization_version', 1));
        await query(trx('sessions').where({ user_id: id }).delete());
        await audit(trx, actor.id, id, 'sessions.revoked');
      });
    },
    catalog,
  };
}
export async function identityIncludingDisabled(trx, id) {
  const user = await query(trx('users').where({ id }).select('id', 'login_key', 'display_name', 'enabled', 'authorization_version').first());
  if (!user) throw new IdentityError(404, 'NOT_FOUND');
  const assigned = await query(trx('user_roles').where({ user_id: id }).select('role_code'));
  return { id: String(user.id), username: user.login_key, displayName: user.display_name,
    enabled: Boolean(user.enabled), version: user.authorization_version, roles: assigned.map(r => r.role_code) };
}
