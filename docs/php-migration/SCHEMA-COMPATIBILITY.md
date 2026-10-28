# Existing-schema compatibility

Read-only owner inspection: **28 October 2026, 05:21 PKT**. The endpoint reported
`10.11.19-MariaDB-cll-lve`. No schema initialization, account bootstrap, password
verification/login or business operation was performed on the owner database.

| Finding | Verified value |
| --- | --- |
| Schema | Existing `upms` |
| Tables | 19 application tables plus `upms_remote_initialization` |
| Migration history | `202610210001_identity.js`, `202610240001_simple_v1.js`, `202610240002_entry_fixes.js` |
| Administrator | Existing ID 1, enabled, authorization version 2, Argon2id hash prefix confirmed without retrieving the hash |
| Management | READY, operator 1, entry version 2 |
| Counters | next_dc 1, next_item_code 1 — inspected only |
| Existing business counts | Items, parties, documents, stock journal, party journal and commands all 0 |
| Compatibility comparison | All 107 application columns match synthetic type and nullability exactly |

The synthetic target was built by invoking those same existing Node migrations on a
new MariaDB 10.11.19 instance and new schema. The PHP application has **no migrations**
and disabled Laravel database connections. `Schema::TABLES` explicitly maps the existing
tables; `Schema::verify` checks required columns/InnoDB and key exact-decimal types.
The tracking table is retained and not managed by PHP. The complete comparison result
is in [SCHEMA-VERIFICATION.json](SCHEMA-VERIFICATION.json).

Financial values use Brick Math BigInteger cents and native string DECIMAL fetches;
whole bottle quantities remain exact integers. PDO result metadata preserves mysql2's
BIGINT-as-string behavior, while INT flags and versions remain numeric. No Eloquent
timestamp, key-name, boolean, decimal or default-user-schema assumptions are applied.

Identity mapping uses users, user_roles, role_permissions, identity_audit_events,
login_attempts, identity_guard and sessions directly. Bootstrap audit evidence controls
forced rotation. All PHP sessions use a distinct cookie/format and hashed opaque token;
existing Node sessions are neither imported nor invalidated. Password changes revoke
all sessions using the existing user identity and authorization version, in tests only.

Runtime test grants allow SELECT on business/control/catalog tables, auth-only mutations
on sessions/login_attempts, INSERT on identity audit, and column-scoped password/version/
updated_at changes on users. A runtime business UPDATE is rejected by MariaDB. No owner
grants were changed. The production grants/profile still require review.

The remote inspection ran inside an explicit READ ONLY transaction and rolled back.
Only metadata, counts and allowlisted identity/control fields were queried; no stored
password hash, session material or contact details were emitted. The PHP automated
suite and fixture provisioning connect only to loopback `upms_test_php_*` schemas;
the owner inspection is a separate explicit tool, never a test/startup hook.
