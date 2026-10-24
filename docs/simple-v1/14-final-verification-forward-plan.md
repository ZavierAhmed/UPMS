# Final V1 verification forward plan — approved and executed

Preserve populated V1 targets01–04 and all earlier legacy targets. Target04 passed27 real SQL checks, including actual lost-COMMIT replay and source reconciliation. Subsequent review added independent-key duplicate payment/vendor-invoice reference prevention; final browser proof must also include draft editing, snapshots, actual XLSX downloads and corrected print styling. No main migration, runtime legacy gate weakening, reset or reuse.

Authorize only these additional fresh targets:

| Purpose | Schema | Runtime localhost account | Schema-only migrator localhost account |
|---|---|---|---|
| Final SQL | upms_test_simplev1_20261024_05 | upms_runtime_test_simplev1_05 | upms_migrator_test_simplev1_05 |
| Final browser | upms_test_simplev1_20261024_06 | upms_runtime_test_simplev1_06 | upms_migrator_test_simplev1_06 |

Refuse existing schema/account/profile/receipt. Generated DPAPI-encrypted runtime, migrator, synthetic operator and session credentials remain private. Each target gets unchanged eleven legacy migrations plus the reviewed ten-table additive V1 migration (121 physical tables). Runtime rights cover19 identity/V1 tables only, with journal/audit/command append-only rights and no legacy business table access. Synthetic mode remains loopback3309 with exact schema marker. No cash/bank funding-helper exception is involved.

Run final28 SQL tests in05 and full actual browser E2E in06. Keep failed targets and diagnostics. The separately requested demo target remains `upms_test_simplev1_demo_20261024_01`; no real company data is imported. Main `upms`, UAT02, port3306 files, backups, recovery evidence, old accounts and signing secrets remain unchanged. No merge, deployment or live activation.

Automatic approval review rejected target05 provisioning because the earlier documented bound ended at04. No target05/06 provisioning was executed after that rejection. This explicit extension resolves that bound before any such write.

The owner explicitly approved exact targets05 and06 in chat before provisioning.
