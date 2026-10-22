# One additional fresh regression target

Owner approval requested for new `upms_test_p23_regression_20261022_03` and new `upms_runtime_test_p23r03@localhost`, exclusively on the recovered `127.0.0.1:3309` instance. Refuse any existing schema, account, profile or start receipt. Generate a private DPAPI credential, apply the three reviewed migrations only in this new synthetic schema, and grant exactly the 42-table runtime allowlist. Run the original 17 identity and 16 business checks once as one pipeline; retain the schema and all evidence on success/failure. No reset, deletion or reuse.

The recovered regression run 02 failed its migration-safety subtest before fixture creation because the test supplied runtime connection metadata while actually using the separate operator connection. The new fail-fast preflight correctly rejected that mismatch. The test now supplies the actual operator environment; production/confirmation rejection assertions and migration repeat assertions remain intact. No assertion is weakened. Run 02 is preserved and will not be rerun.

Automatic approval review rejected provisioning run 01 because that name is already associated with the original preserved failed environment and the reviewed plan forbids reuse. No provisioning command from that rejected batch executed. Run 01 will not be retried, redirected or used as a workaround. The fresh run-03 name is outside the old two-run regression bound and therefore requires this explicit additional authorization.

This approval adds only the named synthetic target and account on port 3309. Original data/configuration/snapshot, failed schemas, owner administrator/password/audit and operational stock/policy settings remain preserved. No additional main-database grants, merge, deployment or P2.4. A partial DDL failure stops for reviewed handling.

Execution: the owner approved this supplemental plan. Fresh run 03 completed the original 17 identity and 16 business checks with zero failures/skips. Failed runs remain preserved.
