# cPanel database integration and initialization procedure

Status: prepared procedure; owner database unconnected. Read [compatibility verdict](GODADDY-CPANEL-COMPATIBILITY.md) first.

The existing application uses Node 22/24, mysql2 with Knex/InnoDB transactions, a bounded persistent pool, database-backed sessions, a transaction guard, durable idempotency commands, table-specific runtime grants and immutable source journals. Management startup does not migrate or bootstrap an administrator. Production initialization and opening approval use an offline CLI and explicit operation approvals. Keep those protections.

## Provider evidence, before any SQL

Obtain the assigned database hostname/port, supported remote-network route from the actual Node application, Node egress allowlist, CA chain, TLS hostname, exact supported engine/version, schema/account names and provider limits. Do not send passwords through chat or put them in the deployment ZIP. A cPanel database on another hosting product is not established to be local to Node hosting.

Record read-only identity observations privately: database name, current account, port, server UUID/ID, version, recovery/read-only state and TLS cipher. Do not log secrets, connection strings, grants containing authentication material or raw database errors. Provider console evidence and runtime observations must agree. A future activation change must hard-pin the independently approved hostname/port and all identities, validate every new connection and reject arbitrary remote alternatives.

## Isolation and schema inspection

1. Establish a separate synthetic staging schema and distinct account, independent from live production, existing local databases and demos. Prove Preview cannot write production and Publish cannot write staging. If isolation is unavailable, stop before SQL.
2. With explicit read-only access, list `information_schema.TABLES` for the confirmed schema, check every table's engine and inspect migration history if present. Record counts and migration names privately. An absent schema is not permission to create it.
3. If any unknown tables, rows or migration state exist, stop. Preserve the data and request a forward migration review. Never reset, drop, truncate, import over or relabel it as empty.
4. Inspect `SHOW GRANTS FOR CURRENT_USER`; reject global/schema wildcard rights for runtime. Keep migration and backup identities separate and scoped to the exact approved schema.

## Reviewed initialization, only after separate authorization

The current local production CLI must **not** be pointed at cPanel: its schema/account/localhost checks intentionally reject it. First deliver and review a provider-specific implementation with exact identity, authenticated TLS, UUID checks and isolation evidence. Review the migration file list and fingerprints before authorizing that implementation.

1. Approve the exact schema/server instance, staging result, migration hashes and operation reference. Production SQL initialization requires separate owner authorization.
2. Use temporary schema-scoped migration credentials, securely connect and repeat identity/privilege/empty-schema verification immediately before DDL.
3. Apply the reviewed Simple V1 production migration list in order: `202610240001_identity.js`, `202610240002_simple_v1.js`, `202610240003_entry.js`, `202610240004_release.js`. MySQL DDL is not an atomic rollback; preserve partial failures for a reviewed forward repair. No startup migrations.
4. Create the single administrator privately with a generated password and required private handoff/rotation. No default password, demo account or test export. Use a distinct random session secret scoped to that environment.
5. Initialize in **OPENING** with the approved cutoff date and initial DC number. Review and approve the DCR prefix/shared-ID convention before operational cutover. Do not post real transactions during setup.
6. Grant only existing `productionRuntimePrivileges`; ensure append-only source lines, stock journal, party journal, audit and idempotency evidence remain protected. Runtime has no DDL rights. Validate connection and release metadata before listening.
7. Verify login, CSRF, logout/session revocation, password rotation and bounded idle/absolute expiry. Restart Node and verify sessions, saved drafts and posted synthetic transactions persist in staging.
8. Export using the independent backup identity to private storage; checksum/encrypt it, restore to a separate isolated schema, verify identity/table history and run document/stock/ledger reconciliation. Never restore into live for a test.
9. Keep operational posting disabled until opening fingerprints, backup/restore evidence and a separately reviewed owner release approval exist. Do not copy staging credentials to Publish.

Delivery challan returns reuse existing Simple V1 document, line and journal tables; this feature adds no schema migration or new runtime grants. Rollback means retaining source evidence and using a forward code fix. Do not delete posted returns or restore a stale database over new transactions.

## Node 22 preparation

Use Node 22.23.4+ on the supported 22 line. Build and run the checks in [deployment plan](UPMS-RETURN-DEPLOYMENT-PLAN.md). The supplied cPanel ZIP is a blocked private Preview artifact. It cannot be converted into an operational deployment merely by setting credentials. Preview variables are documented separately in `GODADDY-CPANEL-PREVIEW-VARIABLES.txt`.
