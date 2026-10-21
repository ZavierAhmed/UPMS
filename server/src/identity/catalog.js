export const permissions = ['portal.access', 'profile.read', 'profile.password', 'sessions.self',
  'users.read', 'users.create', 'users.update', 'roles.read', 'roles.assign', 'audit.read', 'sessions.revoke'];
export const roles = [
  { code: 'administrator', name: 'Administrator', permissions },
  ...[['inventory', 'Inventory'], ['sales_dispatch', 'Sales/Dispatch'], ['accounts', 'Accounts']]
    .map(([code, name]) => ({ code, name, permissions: permissions.slice(0, 4) })),
];
