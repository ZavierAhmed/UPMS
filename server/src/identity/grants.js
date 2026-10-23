import {creditRuntimePrivileges} from '../credits/catalog.js';
import {returnRuntimePrivileges} from '../returns/catalog.js';
import {chequeRuntimePrivileges} from '../cheques/catalog.js';
import {receiptRuntimePrivileges} from '../receipts/catalog.js';
import {salesRuntimePrivileges} from '../sales/catalog.js';
import {purchaseRuntimePrivileges} from '../purchases/catalog.js';
import { businessRuntimePrivileges } from '../business/catalog.js';
import { inventoryRuntimePrivileges } from '../inventory/catalog.js';
export const identityRuntimePrivileges = Object.freeze({
  identity_guard: ['SELECT', 'UPDATE'], users: ['SELECT', 'INSERT', 'UPDATE'],
  roles: ['SELECT'], permissions: ['SELECT'], user_roles: ['SELECT', 'INSERT', 'DELETE'],
  role_permissions: ['SELECT'], sessions: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  login_attempts: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], identity_audit_events: ['SELECT', 'INSERT'],
});
export const runtimePrivileges = Object.freeze({...identityRuntimePrivileges,...businessRuntimePrivileges,...inventoryRuntimePrivileges,...purchaseRuntimePrivileges,...salesRuntimePrivileges,...receiptRuntimePrivileges,...chequeRuntimePrivileges,...returnRuntimePrivileges,...creditRuntimePrivileges});
export function summarizeGrant(row) {
  const raw = Object.values(row).join(' ');
  const match = raw.match(/^GRANT (.+?) ON (.+?) TO /i);
  if (!match || /WITH GRANT OPTION/i.test(raw)) return { unsupported: true };
  return { scope: match[2].replaceAll('`', ''), privileges: match[1].split(',').map(p => p.trim().toUpperCase()) };
}
export function verifyRuntimeGrants(rows, database, account) {
  const parts = account.split('@');
  if (!/^upms_runtime(?:_test_[a-z0-9_]+)?$/.test(parts[0]) || !['localhost','127.0.0.1','::1'].includes(parts[1]))
    throw new Error('A dedicated loopback-only runtime account is required.');
  const found = new Map();
  for (const row of rows) {
    const grant = summarizeGrant(row);
    if (grant.unsupported) throw new Error('Unsupported or delegable runtime grant.');
    if (grant.scope === '*.*' && grant.privileges.length === 1 && grant.privileges[0] === 'USAGE') continue;
    const [schema, table, extra] = grant.scope.split('.');
    if (schema !== database || extra || !runtimePrivileges[table] || grant.privileges.some(p => !runtimePrivileges[table].includes(p)))
      throw new Error('Runtime privileges exceed the reviewed table allowlist.');
    const current = found.get(table) || new Set(); grant.privileges.forEach(p => current.add(p)); found.set(table, current);
  }
  for (const [table, rights] of Object.entries(runtimePrivileges))
    if (!rights.every(p => found.get(table)?.has(p))) throw new Error('Required runtime privileges are missing.');
  return { account, database, tables: Object.keys(runtimePrivileges).length, globalPrivileges: false, auditUpdateDelete: false, verified: true };
}
