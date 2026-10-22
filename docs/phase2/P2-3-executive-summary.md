# P2.3 delivery and operational status

**Locally test-accepted; operational activation pending. Not production ready.** Stop for independent review. No merge, deployment or P2.4.

Starting SHA: `4154efa3d80a3d4d3039e83f2d27d6ba25754e08`. Delivery branch: `feature/upms-p2-3-inventory-operations`. The final commit SHA is supplied in the completion response and branch Git history.

## Delivered behavior

One shared factory/warehouse has independent AVAILABLE, QUARANTINED and DAMAGED balances. BigInt arithmetic and DECIMAL(20,6) storage enforce exact unit precision, overflow and nonnegative stock. Missing starting state remains unverified.

Inventory staff directly post ordinary finished-bottle production and separate raw-material/component/packing consumption. Production never auto-consumes materials. Counts retain expected quantity/checkpoint and do not change stock themselves. Every discrepancy and partial/full linked inverse correction requires administrator approval and posting authority. Posted source evidence and movement journals remain immutable. Exact approval version/hash and current approver authority are revalidated.

The P2.2 coordinator commits source document, batch/effects, deterministic locked balances, immutable journal, official number, audit and durable idempotency together. The private Inventory UI provides stock inquiry, entry/review/posting, count submission, administrator approval, movement history, reconciliation and explicit owner configuration/new-item authorization.

## Recovery and migration

The owner approved the reversible P2.3B handoff. Local main upms now uses `127.0.0.1:3309`, MariaDB 10.4.32, recovery mode zero, and the verified private console-mode instance. All 38 original table fingerprints matched both the logical backup and readable physical copy; no missing or newer UPMS rows were found. The original 1,037-file XAMPP directory, configuration, snapshot, unrelated data and failed schemas remain preserved. The historical initiating cause remains uncertain.

A fresh consistent backup restored exactly in new upms_restore_p23b_resume_20261022 before migration. New `202610220003_inventory_operations.js` applied as the dedicated migrator: 44 total tables, 42 visible to runtime. All original rows were retained; both historical migration sources are unchanged. The original administrator/password, roles, audit and sessions were preserved. Final main inventory tables, periods and inventory-policy acceptance remain empty. Local runtime serves http://127.0.0.1:3000/management with its existing signing key.

## Acceptance evidence

Final successful runs: 125 backend, 101 frontend, original 17 identity SQL, original 16 business SQL, and 20 inventory SQL/browser tests; zero failures/skips in each final run. Inventory browser checks staff production review/post, count submission, administrator approval/post, Sales read-only, Accounts denial and mobile layout. Build/lint, zero-vulnerability full dependency audits, public regression (66 route/viewport combinations, 22 interactions) and isolated production-package verification passed. See [full results including retained failures](P2-3-concurrency-and-test-results.md).

Main and synthetic journal/balance reconciliation matched with no negative balances. Twelve concurrent posts completed in 284 ms, p50 207 ms and p95 283 ms; safety guards remain. This is a small local workload, not production capacity evidence.

## Changed areas and limits

New inventory migration/catalogue/validation/quantity/service/router; shared item tracking and policy-specific numbering; identity grants/router integration; fail-fast preflight; guarded private operator tooling; SQL/browser/unit/UI tests; management Inventory screen and errors; milestone/recovery documentation. Public website sources, dependencies, private references and all nine original unused logo assets are preserved. Conflicting source branding was not imported or published.

Owner cutoff/open period/four prefixes and justified item starting states remain explicit activation decisions. Historical openings are deferred; condition reclassification is disabled; corrections are inverse-only. No purchasing, sales, challans, payments, financial posting, costing, BOM or auto-consumption. See [risks](P2-3-open-decisions-and-risks.md), [recovery](P2-3B-recovery-results.md) and [handoff/rollback](P2-3B-main-handoff-plan.md).
