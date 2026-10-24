# V1 preservation and transition plan

Source and remotely preserved checkpoint: `7fdd9918f3e2c00297570534a1a80800ce193250`, `backup/upms-pre-simplification`. Implementation branch: `feature/upms-simple-v1`. Nine untracked supplied logo files remain untouched and unpublished.

Before any V1 DDL, inspect normal loopback3309/upms, eleven legacy migration records and111 physical tables. Take a private consistent logical backup without DROP statements, restore once into NEW `upms_restore_simplev1_20261024_01`, and compare all table row-count/content fingerprints. Preserve the backup, restore and evidence. Refuse existing targets and any incomplete state; no automatic retry/reset. Original3306 files, recovery snapshots, credentials and signing secrets are read-only.

V1 uses ten additive tables in a separate migration directory: control, items, parties, stock, documents, lines, stock journal, party journal, audit and command outcomes. Existing eleven migrations and tables are not changed. Main does not receive the V1 migration. Fresh synthetic targets: `upms_test_simplev1_20261024_01` through `_04` as needed, plus dedicated demo `upms_test_simplev1_demo_20261024_01`. No populated target reuse. Generated private DPAPI credentials; restricted localhost runtime grants cover identity authentication and V1 only. Schema-only migrators apply reviewed DDL. Retain every target.

V1 mode is explicit, synthetic-only and fail-closed. Legacy business APIs (including reads and mutations) and staff administration are denied in that mode. V1 has one configured administrator and its own immutable journal; it does not merge legacy GST/NON_GST, stock or money projections. Outside V1 mode legacy behavior remains available for regression and historical review.

Fresh setup requires explicit opening states and numbering-cutover evidence. Missing stock and party openings are unverified, never inferred zero. Existing company history remains blocked pending owner-reconciled imports and an independently reviewed cutover. No live activation or migration from legacy balances occurs here. Rollback is to stop the separate V1 demo and use the preserved prior branch/demo; never restore over main or delete V1 evidence.

Verification extension: preserve targets01–04. Target03 exposed an ineffective test-proxy connection override; corrected target04 passed27 checks, including actual lost-COMMIT replay. Use new target05 for final SQL/source-reference checks and target06 for final browser proof after snapshot/print refinements. No target reset/reuse; these remain wholly separate V1 synthetic schemas with the same restricted grants. Existing restore was reverified with explicit DATABASE() identity; preservation-v2.json supersedes the earlier unproven comparison while retaining it.


Final verification matched all111 main tables to preservation-v2, with eleven migration records unchanged. Runtime profiles/signing secret files and original recovery sources matched their preserved hashes. For rollback, use Stop-UPMSSimpleV1Demo.ps1 (verifies exact Node PID/port/schema and archives logs); the old branch/demo remain available. Never restore over main or delete the new schemas.
