import { roles, permissions } from '../src/identity/catalog.js';
const columns = {
  identity_guard: ['id'], users: ['id','login_key','display_name','password_hash','enabled','authorization_version','created_at','updated_at'],
  roles: ['code','name'], permissions: ['code'], user_roles: ['user_id','role_code'], role_permissions: ['role_code','permission_code'],
  sessions: ['token_hash','user_id','data','idle_expires','absolute_expires','revoked'],
  identity_audit_events: ['id','actor_id','target_id','action','correlation','details','created_at'],
  login_attempts: ['bucket','window_start','attempts'], upms_identity_migrations: ['id','name','batch','migration_time'],
  upms_identity_migrations_lock: ['index','is_locked'],
};
const foreignKeys = ['user_roles.user_id:users.id','user_roles.role_code:roles.code','role_permissions.role_code:roles.code',
  'role_permissions.permission_code:permissions.code','sessions.user_id:users.id','identity_audit_events.actor_id:users.id','identity_audit_events.target_id:users.id'];
const equal = (a,b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
export async function verifyIdentitySchema(db) {
  const [tables] = await db.raw('SELECT TABLE_NAME AS name,TABLE_TYPE AS type,ENGINE AS engine,TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  if (!equal(tables.map(t => t.name), Object.keys(columns)) || !tables.every(t => t.type === 'BASE TABLE' && t.engine === 'InnoDB' && t.collation.startsWith('utf8mb4_')))
    throw new Error('Unexpected identity schema objects/engine/collation; owner review required.');
  const [actual] = await db.raw('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
  for (const [table, expected] of Object.entries(columns))
    if (!equal(actual.filter(c => c.table_name === table).map(c => c.column_name), expected)) throw new Error('Identity column collision or partial schema.');
  const [refs] = await db.raw('SELECT TABLE_NAME AS t,COLUMN_NAME AS c,REFERENCED_TABLE_SCHEMA AS s,REFERENCED_TABLE_NAME AS rt,REFERENCED_COLUMN_NAME AS rc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
  if (!refs.every(r => r.s === db.client.config.connection.database) || !equal(refs.map(r => `${r.t}.${r.c}:${r.rt}.${r.rc}`), foreignKeys)) throw new Error('Foreign-key definitions require owner review.');
  const tracking = await db('upms_identity_migrations').select('name','batch');
  if (tracking.length !== 1 || tracking[0].name !== '202610210001_identity.js') throw new Error('Migration tracking mismatch.');
  const guard = await db('identity_guard').select('id'); if (guard.length !== 1 || guard[0].id !== 1) throw new Error('Identity guard mismatch.');
  if (!equal((await db('roles').select('code','name')).map(r => `${r.code}:${r.name}`), roles.map(r => `${r.code}:${r.name}`)) ||
      !equal((await db('permissions').select('code')).map(p => p.code), permissions) ||
      !equal((await db('role_permissions')).map(p => `${p.role_code}:${p.permission_code}`), roles.flatMap(r => r.permissions.map(p => `${r.code}:${p}`))))
    throw new Error('Seeded authorization catalogue differs from the reviewed migration.');
  return { tables: tables.length, migration: tracking[0].name, foreignKeys: refs.length, roles: roles.length, permissions: permissions.length, verified: true };
}
