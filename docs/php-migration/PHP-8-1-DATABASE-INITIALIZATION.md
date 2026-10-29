# PHP-8.1 database initialization

Implementation: private CLI `upms.php/scripts/initialize-clean.php`, `CleanInitialization`, `MaintenanceApproval`, shared secure `ProductionConnection`/`ProductionProfile`, and reviewed `resources/production-schema.json`. No web route, application startup, Composer hook, packager or ordinary request invokes initialization.

The canonical19 tables match the three historical identity/SimpleV1/pricing migrations and Laravel compatibility map. DDL includes exact keys, indexes, foreign keys, nullable attributes and decimal precision. Every table is InnoDB/utf8mb4; the clean database default becomes utf8mb4_unicode_ci independently of the server default. Generation exports schema metadata and required source-defined catalogs only; it is not a test-database/business-row dump. The old initialization table is excluded. One new dedicated receipt makes20 clean tables, not an assumption that the old20 tables match.

## Ordering and recovery

An explicit enabled private maintenance profile, protected transport/pinned identity, verified backup reference and exact operation/target/plan approval are prerequisites to the CLI. Default examples reject before connecting.

The initializer takes a schema-scoped GET_LOCK, refuses nonempty unowned targets, writes a private0600 INTENT receipt before the first DDL, then maintains a durable database receipt with plan hash/reference/state/step. DDL intent is persisted before execution. MariaDB DDL commits independently; there is no claim of transactional schema rollback.

Each table is compared against exact canonical SHOW CREATE TABLE and must remain empty before the catalog transaction. System catalogs/control/guard and SCHEMA_READY are committed together. Initial control is PENDING, operator NULL, next_dc1, next_item_code1, entry_version2. No fake financial openings or documents are needed.

Unreviewed retry after partial DDL stops. `resume-reviewed` requires a separate exact forward-recovery approval; it accepts only owned matching empty table definitions and creates missing definitions without deleting/resetting anything. Unknown tables, mismatched DDL, target/reference/hash conflicts or unexpected rows stop recovery. A completed seed transaction with a stale external receipt needs reviewed receipt reconciliation, not repeated catalog inserts. Interrupted creation of the receipt row itself, or leftover private `.pending` files, requires special manual review or abandonment of the new candidate; no generic automatic repair/destructive reset is provided.

Provisioning first verifies the canonical SCHEMA_READY/BOUND receipt, PENDING control and empty business tables before creating identities. It uses the proven atomic AdminProvisioning transaction and private credential handoff. Binding verifies exactly two enabled designated users, only their Administrator memberships and the full permission catalog, then leaves PENDING. Stages have separate durable receipts; filesystem and database commits are not a distributed atomic transaction. An interruption may leave provisioned users while posting remains disabled; reconcile the same receipt rather than reset passwords.

Activation requires separate operation approval and all owner/backup/transport/management-trust/hostname-isolation/Linux-release gates. It rechecks schema, real IDs, roles and control before atomically setting READY and ACTIVATED with maintenance-principal audit evidence. Runtime independently requires matching ACTIVATED reference/plan hash plus READY and exact designated identities. Runtime needs SELECT only on the new migration receipt; it must not be able to update that receipt or change control state/operator.

Future operator command shapes (DO NOT RUN now): `php initialize-clean.php initialize --approved-production-profile /private/init.json`; `resume-reviewed` for a separately reviewed interrupted run; `php provision-admins.php --approved-production-profile /private/provision.json`; `php initialize-clean.php activate-reviewed --approved-production-profile /private/activate.json`. Initialization/provisioning/activation approvals are distinct operation receipts and cannot be replaced by a read-only diagnostic approval.

Receipt version2 also pins the actual selected schema, server ID, hostname and exact server version. A receipt copied to another database/server is not accepted merely because its reference and canonical plan hash match. The private and database receipt states are checked independently; targeted tests reject a wrong target fingerprint and require reviewed reconciliation after a simulated post-commit private-receipt interruption.


The production profile intentionally fences identity DB access as well as posting until the matching ACTIVATED receipt exists. The first trusted production login then requires password rotation before business access. Pre-activation rotation in local acceptance uses the isolated synthetic profile. Any host-matching staging must be a separately approved isolated target; never post synthetic staging data into the new production target.
