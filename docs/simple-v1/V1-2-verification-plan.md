# V1.2 isolated verification and preservation plan

Baseline16dbac8064c895db14275c467703170348cd6dd9. Preserve protected127.0.0.1:3309/upms and all populated demos/tests; no original3306 file/configuration changes.

Use only recovered loopback3309 with force_recovery0. Before any V1.2 migration, take consistent private logical backups and full fingerprints of protected main, original V1 demo and V1.1 demo. Restore the V1.1 backup into new upms_restore_simplev12_20261024_01 and verify exact table readability/fingerprints and actual selected database. Never import into existing databases. DPAPI profiles, backups and evidence are no-overwrite and remain private.

Bounded new targets (create only needed runs; preserve populated/failed runs):

| Purpose | Database | New localhost runtime / schema-only migrator |
|---|---|---|
| Baseline failure reproduction | upms_test_simplev12_20261024_01 | upms_runtime_v12_01 / upms_migrator_v12_01 |
| SQL acceptance | upms_test_simplev12_20261024_02 | upms_runtime_v12_02 / upms_migrator_v12_02 |
| Browser acceptance | upms_test_simplev12_20261024_03 | upms_runtime_v12_03 / upms_migrator_v12_03 |
| Reserve04 | upms_test_simplev12_20261024_04 | upms_runtime_v12_04 / upms_migrator_v12_04 |
| Reserve05 | upms_test_simplev12_20261024_05 | upms_runtime_v12_05 / upms_migrator_v12_05 |
| Reserve06 | upms_test_simplev12_20261024_06 | upms_runtime_v12_06 / upms_migrator_v12_06 |
| Owner UAT | upms_test_simplev12_demo_20261024_01 | upms_runtime_v12_demo / upms_migrator_v12_demo |

Each starts with unchanged eleven legacy migrations and ten-table V1 migration. Baseline reproduction uses the original V1 validation service and captured V1.1 browser payloads in01 only. Others receive one additive V1.2 extension: nullable selling price on items, item-code sequence on V1 control, and nullable immutable discount evidence on documents. Existing posted payloads remain unchanged and reconcile as zero discount. No V1.2 migration to main or old demos. Runtime retains19 exact table scopes, append-only journals/audit/commands and no legacy business rights/DDL. Accounts/passwords are newly generated and encrypted; exact account/schema pairs only.

New owner UAT uses loopback3112 with a distinct cookie. To correct the owner's confirmed3110 runtime/frontend mismatch, capture process/build evidence and freeze the existing V1 and V1.1 frontend builds separately; any required Node-only restart verifies exact PID/command/port first and preserves all database records, profiles and receipts. Do not restart MariaDB. V1.2 must show its version and reject a mismatched frontend/API before mutations.

Run original V1.1 assertions unchanged where legacy semantics apply, plus dedicated V1.2 SQL/browser tests for new auto codes/pricing/positive sale rules. Original legacy-price/zero-total/DC fixture tests remain against baseline-compatible fresh targets or explicit pre-extension synthetic fixtures, never by relaxing live V1.2 gates. Retain lost-COMMIT/concurrency/reconciliation assertions. No new legacy funding-helper exception.

Owner manual UAT remains a separate acceptance step. No merge/deployment/main activation or extra feature work.

Owner explicitly approved this plan in chat before execution. Actual allocation:01 failure reproduction;02 then05 unchanged V1.1 SQL regression;03 then06 dedicated V1.2 SQL;04 actual browser; separate demo for owner UAT.02/05 deliberately omit the extension for unchanged historical fixtures. All populated targets are retained.03/06/04/demo receive the extension; no old demo/main does. The approved restore was imported once and then verified read-only through an explicit selected-database connection; no repeat import or new restore target.
