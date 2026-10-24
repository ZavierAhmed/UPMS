# V1.2B isolated verification plan

Baseline1db1c4878d314a7f7050fcc9630371eada008830; branch feature/upms-simple-v1-2b-payment-ux.

Preserve main127.0.0.1:3309/upms, original3306/data, all previous schemas/accounts/profiles and demos3110–3113. Owner Draft9 is read-only. No migration, posting or profile switching on protected/populated targets.

Authorize at most eight NEW synthetic test targets on loopback3309:

|Target|Schema|Runtime account @localhost|Schema-only migrator @localhost|
|---|---|---|---|
|01|upms_test_simplev12b_20261024_01|upms_runtime_v12b_01|upms_migrator_v12b_01|
|02|upms_test_simplev12b_20261024_02|upms_runtime_v12b_02|upms_migrator_v12b_02|
|03|upms_test_simplev12b_20261024_03|upms_runtime_v12b_03|upms_migrator_v12b_03|
|04|upms_test_simplev12b_20261024_04|upms_runtime_v12b_04|upms_migrator_v12b_04|
|05|upms_test_simplev12b_20261024_05|upms_runtime_v12b_05|upms_migrator_v12b_05|
|06|upms_test_simplev12b_20261024_06|upms_runtime_v12b_06|upms_migrator_v12b_06|
|07|upms_test_simplev12b_20261024_07|upms_runtime_v12b_07|upms_migrator_v12b_07|
|08|upms_test_simplev12b_20261024_08|upms_runtime_v12b_08|upms_migrator_v12b_08|
|demo|upms_test_simplev12b_demo_20261024_01|upms_runtime_v12b_demo|upms_migrator_v12b_demo|

Create only needed targets; refuse existing schema/account collisions and retain every populated/failed run. Generate credentials encrypted with DPAPI in ignored server/.local/simple-v12b. Runtime receives exactly existing simpleV1RuntimePrivileges, and each migrator only its own schema rights. Extend only exact synthetic schema/account allowlists; no financial funding helper or main activation change.

Planned roles:01 archived V1.2A HTTP reproduction;02 original compatibility SQL without V1.2 extension;03 original V1.2 SQL;04 stock/financial/browser regression;05 new payment/time SQL;06 new payment/time browser;07/08 fresh reserves if needed. Cumulative browser stages may append labeled synthetic fixtures to their new test target; they do not reset it or rerun fresh setup. Preserve initial receipts and prior document snapshots.

Apply only existing unchanged migrations in new targets. No new application migration is planned: official references are minted from the existing immutable document ID at successful posting (CR- plus at least4digits for client receipts; VP- for vendor payments). This is an explicitly synthetic V1 numbering convention with gaps across shared document IDs, no annual reset, no change to DC sequences, no historical renumbering and no live cutover approval. The existing unique official_number constraint, source journal uniqueness, identity_guard transaction lock and durable command record remain the protections. Optional external references stay in payload.reference; cheque identification remains mandatory.

Create one new optional UAT demo on3114 with a frozen UI and synthetic business fixtures only. Preserve all older demos. Capture screenshots and sanitized HTTP evidence privately, run SQL/browser/restart/lost-COMMIT checks, compare protected fingerprints, verify final package and push only after required acceptance passes. No merge, deployment or next milestone.
