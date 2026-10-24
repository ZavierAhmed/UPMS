# V1.2A bounded isolated verification plan

Baseline: 758bf3ce8640f95a14d2afdbf82ad345d075eb43. Branch: feature/upms-simple-v1-2a-uat-corrections.

Preserve main 127.0.0.1:3309/upms, original port3306/data directory, all previous schemas/accounts/profiles and demos3110/3111/3112. Existing owner UAT records are read-only. No migration or business posting against these databases.

Authorize at most six NEW synthetic schemas on loopback3309:

| Target | Schema | Restricted runtime account | Schema-only migration account |
|---|---|---|---|
|01|upms_test_simplev12a_20261024_01|upms_runtime_v12a_01@localhost|upms_migrator_v12a_01@localhost|
|02|upms_test_simplev12a_20261024_02|upms_runtime_v12a_02@localhost|upms_migrator_v12a_02@localhost|
|03|upms_test_simplev12a_20261024_03|upms_runtime_v12a_03@localhost|upms_migrator_v12a_03@localhost|
|04|upms_test_simplev12a_20261024_04|upms_runtime_v12a_04@localhost|upms_migrator_v12a_04@localhost|
|05|upms_test_simplev12a_20261024_05|upms_runtime_v12a_05@localhost|upms_migrator_v12a_05@localhost|
|06|upms_test_simplev12a_20261024_06|upms_runtime_v12a_06@localhost|upms_migrator_v12a_06@localhost|
|demo|upms_test_simplev12a_demo_20261024_01|upms_runtime_v12a_demo@localhost|upms_migrator_v12a_demo@localhost|

Only needed targets are created. Refuse existing schemas/accounts; never reset or reuse populated targets. Generate encrypted local credentials in ignored server/.local/simple-v12a. Runtime receives exactly the existing simpleV1RuntimePrivileges table-level map; migration account rights are confined to its new schema. Extend only the exact synthetic schema/account allowlists; financial activation rules and funding helpers remain unchanged.

Apply unchanged identity/business migrations and Simple V1 foundation; use unchanged V1.2 extension where required. No new application migration is planned. Separate targets support original compatibility SQL, V1.2 SQL, actual browser stock/layout acceptance and reserves for failed runs, with each populated run retained.

The new optional owner UAT demo uses port3113 and a frozen frontend build; existing demos stay running unchanged. Seed only explicitly labeled synthetic items, zero openings, production and test transactions. Capture before screenshots from preserved3112 read-only and after screenshots on the new isolated target. Compare preservation fingerprints before completion, accounting separately for authentication activity and any concurrent owner changes.

No merge, deployment, main activation or subsequent milestone. Commit and push only after required checks pass; otherwise report Partial Completion.
