import { roles, permissions } from '../src/identity/catalog.js';
export const config = { transaction: false };
export async function up(db) {
  // MySQL DDL commits independently. Partial failure requires a reviewed forward fix.
  const create = (name, define) => db.schema.createTable(name, t => {
    t.engine('InnoDB'); t.charset('utf8mb4'); t.collate('utf8mb4_unicode_ci'); define(t);
  });
  await create('identity_guard', t => { t.integer('id').primary(); });
  await db('identity_guard').insert({ id: 1 });
  await create('users', t => {
    t.bigIncrements('id'); t.string('login_key', 64).notNullable().unique();
    t.string('display_name', 100).notNullable(); t.string('password_hash', 255).notNullable();
    t.boolean('enabled').notNullable().defaultTo(true); t.integer('authorization_version').unsigned().notNullable().defaultTo(1);
    t.dateTime('created_at', { precision: 6 }).notNullable(); t.dateTime('updated_at', { precision: 6 }).notNullable();
  });
  await create('roles', t => { t.string('code', 32).primary(); t.string('name', 64).notNullable(); });
  await create('permissions', t => { t.string('code', 64).primary(); });
  await create('user_roles', t => {
    t.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users');
    t.string('role_code', 32).notNullable().references('code').inTable('roles'); t.primary(['user_id', 'role_code']);
  });
  await create('role_permissions', t => {
    t.string('role_code', 32).notNullable().references('code').inTable('roles');
    t.string('permission_code', 64).notNullable().references('code').inTable('permissions'); t.primary(['role_code', 'permission_code']);
  });
  await create('sessions', t => {
    t.string('token_hash', 64).primary(); t.bigInteger('user_id').unsigned().nullable().references('id').inTable('users').index();
    t.text('data').notNullable(); t.bigInteger('idle_expires').notNullable().index(); t.bigInteger('absolute_expires').notNullable().index();
    t.boolean('revoked').notNullable().defaultTo(false);
  });
  await create('identity_audit_events', t => {
    t.bigIncrements('id'); t.bigInteger('actor_id').unsigned().nullable().references('id').inTable('users');
    t.bigInteger('target_id').unsigned().nullable().references('id').inTable('users');
    t.string('action', 64).notNullable(); t.string('correlation', 64).notNullable();
    t.text('details').notNullable(); t.dateTime('created_at', { precision: 6 }).notNullable(); t.index(['target_id', 'id']);
  });
  await create('login_attempts', t => { t.string('bucket', 64).primary(); t.bigInteger('window_start').notNullable(); t.integer('attempts').unsigned().notNullable(); });
  await db.transaction(async trx => {
    await trx('roles').insert(roles.map(({ code, name }) => ({ code, name })));
    await trx('permissions').insert(permissions.map(code => ({ code })));
    await trx('role_permissions').insert(roles.flatMap(r => r.permissions.map(permission_code => ({ role_code: r.code, permission_code }))));
  });
}
export async function down() { throw new Error('Destructive rollback disabled. Restore an approved backup or apply a reviewed forward migration.'); }
