# Additive migration, guards and recovery impact

This is a **local-only** foundation. No GoDaddy database, account, grant, administrator or deployment was accessed or changed in P3.2A. Source baseline is `f272eec529bcfb803c2461b5399e974c09cbfa32`. The production boundary remains the separately approved existing release; a development branch is not proof of hosted readiness.

## Five additional tables

| Table | Purpose and protection |
|---|---|
| `money_accounts` | Configured immutable account code, name and CASH_HOLDER/BANK/CHEQUE_CUSTODY classification. The approved defaults are Haris, Junaid, UBL Official and Cheques. No balance column; no inferred opening. Runtime INSERT/UPDATE/DELETE denied by new guards. Configuration is a maintenance operation, not a runtime master editor. |
| `money_batches` | One immutable posted source/opening/transfer/reversal, PKR amount DECIMAL(18,2), Pakistan business date, source namespace/key/reference, from/to accounts, opening identity, correction link, actor, reason and UTC timestamp. Unique source claim, unique account opening and unique original reversal. CHECKs constrain leg shape and positive/nonnegative amounts. |
| `money_movements` | Immutable signed DECIMAL(18,2) legs; one leg per batch/account. FK to source batch/account. INSERT guard verifies account, sign and amount against its batch. |
| `money_audit` | Immutable per-batch actor, justification, timestamp, exact before/after balances and canonical batch hash. INSERT guard checks source actor/reason/time; application reconciliation verifies the full evidence. |
| `money_schema_receipts` | Singleton version/plan/configuration hash and migration reference. Runtime cannot create, edit or delete it. It is not an activation approval or an opening balance. |

Definitions are in `upms.php/resources/money-accounts-schema.json`; MariaDB-normalized DDL hashes are committed separately. No existing table is rebuilt or altered. Account identities come from configured records, not hardcoded names in calculations. PKR amounts follow existing V1 exact-money limits; no JavaScript float is authoritative.

The original `Schema::TABLES`, production canonical schema/receipt hash and `CrudGuards` are unchanged. Their exact baseline guard hash remains `7047bb1d5bce5b1208330594cb88478248a9f0cd10ceab09bd0ab34d4cdbce13`. Money readiness separately verifies the five additional canonical DDLs and the immutable receipt/configuration hash. This avoids pretending the old schema verifier covers new tables.

## Fifteen new guards, sixty combined

The original 45 guard rules do **not** protect these tables. New `upms32_*` guards add six master/receipt INSERT/UPDATE/DELETE prohibitions, six batch/movement/audit UPDATE/DELETE prohibitions, and three INSERT validation guards. `MoneyGuards` checks the exact combined 60 definitions/events/tables/timing and expected definer. The original 45 verifier remains unchanged and intentionally rejects an unexpected 60-trigger set; future release, security, backup and recovery tools must use the version-aware combined verifier rather than weaken the original count check.

For the proposed GoDaddy release, the runtime remains `upms_runtime84@localhost`, with exactly the existing four schema-level CRUD privileges; **no runtime DDL, TRIGGER, GRANT OPTION or administrative privilege is required or proposed**. The combined verifier must run as the existing `upms_guard85@localhost` identity and verifies its SELECT/TRIGGER-only, nongrantable, exact-schema permissions, direct grants and absence of role/other scope escalation. This canonical hosted-definer verification is implemented but **not executed against GoDaddy here**. Local tests use a distinct synthetic runtime and local maintenance definer; their report deliberately does not claim production definer privilege verification.

The original strict scoped policy is untouched. An optional extension privilege catalogue for a future strict host would need SELECT on the five tables and INSERT only on batches/movements/audit; no money UPDATE/DELETE. The current strict verifier is not silently widened in this milestone. A strict-host rollout requires a separate reviewed policy/version change.

## Controlled shared-hosting strategy

`deployment/money-accounts/plan.php` is an **offline generator**, not an installer. Its committed review bundle contains canonical additive DDL, the four approved master records, 15 additional guard definitions and checksums. It does not connect to a database, grant privileges, create users, post financial rows, finalize a receipt or enable the module. Its manifest is explicitly `NOT_APPROVED_NOT_APPLIED`.

The local `installIsolated` path requires CLI, the exact pre-existing loopback MariaDB 10.11.19 instance/port/data directory and a whitelisted fresh `upms_test_php_money_*` schema. It refuses partial/existing money tables. The restore path additionally requires an empty `_restore` schema. Neither is a production migration command.

Future hosted execution must be a separate approved maintenance milestone: identify the selected target and release, record genuine before-state/backups, block posting, verify all 45 base guards, prove the extension is absent, apply each numbered DDL stage using a maintenance/guard identity, verify all 25 table definitions and all 60 guards, verify that new financial tables are still empty, then finalize a target-bound evidence receipt and obtain explicit owner release approval. DDL is not transactionally atomic. Stop and preserve a partial migration; never run a reset, blindly retry, drop existing data or rerun initialization/provisioning. Existing administrators and activation receipts must be retained.

`UPMS_MONEY_ACCOUNTS_ENABLED` defaults false. The module is omitted from navigation when disabled. Money endpoints still require current designated-administrator authorization and first-password-change compliance. When enabled, they require schema/receipt evidence and a target/runtime/hash-bound private guard report. On `upms_v1`, an additional matching owner-approved release record, verified recovery declaration and canonical definer evidence are required. No production approval record is generated in this milestone. Runtime guard evidence is an attested maintenance check, not continuous trigger inspection by the CRUD account; maintenance must invalidate it before changing guards.

## Backup/recovery incompatibility and release blocker

The existing live protected backup is pinned to exactly **20 tables / 45 triggers**, and its local decoder/restore tooling verifies that exact format. Adding money tables while leaving it unchanged would cause backup rejection. No deployed collector, key, scheduled backup, hash pin or decoder was modified here.

`MoneyRecovery` provides an isolated, versioned **prototype**: `UPMS_MONEY_SNAPSHOT_V1`, all 25 table DDLs/rows, source target/plan hashes and all 60 trigger definitions. It takes a consistent read-only snapshot, verifies schema/guards before and after, encrypts in memory with sodium sealed-box authenticated encryption, and restores only a fresh positively identified local target. Before DDL it validates the canonical allowlist and complete trigger manifest; afterward it compares every row, scans all foreign keys, reinstalls the expected guard rules, verifies the extension receipt and reconciles money balances. Tests restored pre-existing V1 records as well as money history.

This is **not** a replacement hosted off-host backup system: it is an in-memory prototype, not the deployed streaming envelope/Windows DPAPI scheduled consumer. A future milestone must integrate a version-aware encrypted streaming collector, protected off-host client, table/guard manifest, retention/freshness checks and target-bound restore approval, and perform an independent restore before any hosted migration. Sealed-box integrity does not authenticate the business origin of supplied records. Archive provenance/checksum binding and trusted source verification remain required. No new hosted restore or off-host end-to-end acceptance is claimed.

## Limits of protection

Runtime UPDATE/DELETE of posted money history is database-enforced. Leg shape, uniqueness and custody constraints also have database checks. Whole-batch two-leg completeness, live authorization, source verification, nonnegative spending, idempotent HTTP behavior and atomic posting are enforced by the application transaction and reconciliation. MariaDB has no deferred constraint requiring exactly two inserted legs at commit in this design.

Compromised schema-wide CRUD credentials can fabricate compatible new source batches, movements and audit evidence, or insert incomplete evidence that halts posting. They can also exploit the previously accepted shared-password/mutable-state risks. An attacker with SQL credentials is not confined to application routes or account ownership. **Application authorization is not database row isolation or proof of physical money.** Reconciliation detects inconsistency, not a fully fabricated consistent origin. Any future owner approval must explicitly assess these money-specific residual risks; the earlier production approval is not reused as new approval.
