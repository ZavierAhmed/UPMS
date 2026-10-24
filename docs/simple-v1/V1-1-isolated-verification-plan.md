# V1.1 isolated verification plan

Starting revision: 435eee019e45d0aa550d5ac6a8d83c87eaa130f3.

Create only the following fresh databases on recovered loopback port3309, refusing any existing schema, account, credential file or provision receipt. Preserve failed environments without reuse. Generate private passwords and save with Windows DPAPI; never commit them.

| Purpose | Schema | New localhost runtime / migrator accounts |
|---|---|---|
| SQL run01 | upms_test_simplev11_20261024_01 | upms_runtime_v11_01 / upms_migrator_v11_01 |
| Browser run02 | upms_test_simplev11_20261024_02 | upms_runtime_v11_02 / upms_migrator_v11_02 |
| Reserve03 | upms_test_simplev11_20261024_03 | upms_runtime_v11_03 / upms_migrator_v11_03 |
| Reserve04 | upms_test_simplev11_20261024_04 | upms_runtime_v11_04 / upms_migrator_v11_04 |
| Owner UAT | upms_test_simplev11_demo_20261024_01 | upms_runtime_v11_demo / upms_migrator_v11_demo |

Only needed targets are created. Each receives the eleven existing legacy migrations and ten-table V1 additive migration. Paid expenses use immutable V1 documents, not legacy expense tables. No new financial funding exception. Runtime retains the reviewed19-table identity/V1 rights, append-only journals/audit/commands and no legacy business writes or DDL. Migrator rights apply only to its exact new schema. Explicit synthetic activation accepts only these exact names on3309; protected main stays blocked.

Verify main111-table fingerprints against existing preservation evidence and capture current V1 demo ten-table fingerprints before and after testing. Preserve all old profiles, demo data, legacy test databases, port3306 files, snapshots and backups unchanged. Serve the new synthetic owner UAT separately on loopback3111; preserve3110 demo.

Run existing28 V1 SQL checks plus new V1.1 assertions, actual browser acceptance and fresh synthetic UAT seed. Reserve targets support bounded forward fixes without resetting populated targets. No merge, deployment or live activation. Legacy SQL tests requiring additional new persistent targets need a separate concrete reviewed plan; no implicit expansion of old bounds.

Owner explicitly approved this bounded plan in chat before provisioning. All four test targets and the separate UAT target were used; preserve them. No new migration was required.
