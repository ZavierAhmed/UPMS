# Identity schema and migration contract

P2.1 implements only `server/migrations/202610210001_identity.js`, using Knex 3.3.0 and mysql2 3.24.6 as resolved in the lockfile. [Knex's migration API](https://knexjs.org/guide/migrations.html) supplies explicit version tracking and migration locking. Application startup never calls it.

## Tables

| Table | Identity-only purpose and constraints |
| --- | --- |
| `identity_guard` | Precreated PK `id=1`; locking guard for reads, bootstrap, grants, revocations and audit-coordinated writes |
| `users` | BIGINT unsigned ID; unique normalized ASCII login key; display name; Argon2id PHC hash; enabled flag; unsigned authorization version; UTC created/updated DATETIME(6). No plaintext password |
| `roles` | PK department code; four confirmed names only |
| `permissions` | PK explicit identity action identifier; no active business permissions |
| `user_roles` | Composite PK(user_id,role_code); indexed FKs to users/roles; current assignments; audit retains prior state |
| `role_permissions` | Composite PK(role_code,permission_code), indexed FKs; fixed reviewed role catalogue; runtime SELECT only |
| `sessions` | PK SHA-256 token hash, nullable user FK/index, private JSON text for session state and CSRF binding, indexed idle/absolute expiry milliseconds, revoked tombstone flag. Never raw session ID |
| `identity_audit_events` | BIGINT ID; nullable actor/target user FKs; action, event correlation reference, allowlisted JSON-text details, UTC creation time; target/id index. Append-only through application/runtime grants |
| `login_attempts` | PK global or SHA-256 normalized-login bucket, window start and attempt count; durable short-window counters; no user-existence disclosure or client-IP dependency |
| `upms_identity_migrations` | Knex migration names, batch and time |
| `upms_identity_migrations_lock` | Knex's separately managed migration lock |

Identity tables explicitly use InnoDB/utf8mb4/utf8mb4_unicode_ci. Tracking tables inherit the reviewed schema/server defaults. MySQL connections use UTC, strict SQL and a three-second InnoDB lock wait. No timezone tables or named-zone installation is needed for these UTC instants. IDs are serialized as strings at API boundaries; no financial decimal design is implemented.

The database supplements validation with primary/unique/foreign keys. Authorization, last-usable-administrator and cross-table state checks run under the identity guard. No business invariant, financial journal, stock balance, party, approval workflow or opening table is added.

## Migration execution and failure

The explicit command validates local target configuration, exact database-name confirmation, nonproduction execution, engine capabilities and version/compatibility opt-in. `migrate.latest()` records successful versions and rejects an occupied migration lock. Subsequent invocation applies no duplicate migration. Reviewed migration source is immutable after application; Knex tracks names, not a cryptographic content checksum. Compare against the reviewed Git revision before applying future changes.

`config.transaction=false` and `disableTransactions=true` are deliberate: MySQL DDL is not assumed rollback-safe. Tables are created in dependency order; seed role/permission inserts use a separate ordinary InnoDB transaction. A failure after some DDL can leave partial tables without a completed migration-tracking row. Do not hide this with CREATE IF NOT EXISTS, automatic table deletion or a reset script.

Recovery:

1. Stop further migration attempts and retain the failure time, reviewed source revision and target schema name privately. Do not dump credentials/SQL bindings into shared logs.
2. Inspect only the dedicated target's migration lock/tracking and actual definitions. Determine which DDL committed and whether another migration process is still active.
3. Preserve data/backups. Have the owner review a forward-fix migration or a new empty schema and controlled data transfer. Never drop/truncate an existing schema to make verification pass.
4. Clear a stale Knex lock only after confirming no migration process is running and authorizing the specific recovery. The normal tool exposes no automatic unlock/reset.
5. Reconcile schema and seed catalogue, verify all FKs/uniqueness/engine/timezone, then rerun the full acceptance suite on a separately provisioned empty schema.

`down()` deliberately throws: destructive rollback is not an approved recovery procedure. Backup restore/forward fixes require separate review; no automatic reverse migration is provided. Migration creation, owner provisioning and production deployment are separate actions.

## Connection budget and uncertain outcomes

The pool has at most five connections and at most twenty pending acquisitions, with a three-second acquisition timeout and finite connection creation/connect deadlines. Statements use a five-second driver inactivity timeout. The connection is destroyed on statement timeout so an uncommitted transaction cannot be reused; the real compatibility test verifies rollback after an inserted audit event followed by a slow statement. MySQL/MariaDB may observe connection closure after the statement finishes. Queries and lock waits therefore fail closed rather than continue on a reusable connection.

A lost response/COMMIT acknowledgement can still have an uncertain outcome; inspect the audit/account state before manually retrying. User uniqueness and expected authorization versions prevent many repeated identity changes, but this milestone does not claim the durable business-command idempotency protocol from P2.0. The guard deliberately limits concurrency; expensive hashing occurs outside write transactions. No network calls, rendering or user prompts are performed under the identity guard.

## Evidence limits

The actual local engine is MariaDB 10.4.32. Fresh-schema migration, repeat migration, uniqueness, concurrent bootstrap, persistence/revocation across connections, audit rejection rollback, transaction rollback, timeout rollback and shutdown passed there. **The corresponding real MySQL acceptance run remains pending.** No schema was applied to the owner's `upms` database. Earlier disposable compatibility schemas are retained with synthetic data; no cleanup was performed without approval.
