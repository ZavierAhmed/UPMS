# Controlled diagnostic local verification

Date: 2026-10-26. Baseline SHA: `79acffb3d3a62c000c942c022916db633b545e0c`.

| Check | Result |
| --- | --- |
| Node runtime | 22.23.4 |
| Backend | 252 passed, 0 failed |
| Diagnostic coverage within backend total | 25 controlled-deployment tests plus the 22 unchanged read-only diagnostic tests |
| Frontend | 24 files / 185 tests passed |
| Unchanged V1.2B payment SQL suite | 16 passed, 0 failed |
| Unchanged V1.2 stock/discount/challan SQL suite | 20 passed, 0 failed |
| Frontend lint / production build | Passed; existing management chunk-size warning remains |
| Public website | 111 public build files compared byte-for-byte with baseline public release; no changes |
| Existing CLI-only diagnostic deployment regression | Original package regenerated, installed fixture verified; no-server start and missing-credential behavior pass |
| Controlled package | 11-file allowlist, locked mysql2 3.24.6, ZIP CRCs, source manifest hashes, integrity-only build and Node 22 startup smoke pass |
| Armed package process test | Build makes no connection/marker; corrupted release rejected; first run consumes private marker before real mysql2 connection timeout; restarted process skips without reconnecting |
| Authentication/SQL on dummy timeout server | Zero bytes received from client; no authentication or SQL sent |
| Logs | Synthetic password/URI/path canary checks pass; no raw errors, credentials or connection strings in captured output |
| Diagnostic dependency audit | Zero vulnerabilities |
| Actual GoDaddy execution/app creation | Not performed; lifecycle/storage contract, entitlement/fee and separate staging remain unverified |

The full backend suite contains the existing Delivery Challan Returns exact-decimal and reporting tests. Operational app, return/stock/ledger/payment/posting source, schema/grant/identity gates, existing test files and website source are unchanged. No existing test was removed or weakened.

The existing SQL suites ran on MariaDB 10.4.32 in a new workspace-owned data directory and an independently verified disposable local server, with generated private credentials. Existing local/demo/production directories were preserved. These regression fixtures create synthetic schemas and transactions as required by the unchanged suites; **the diagnostic artifact never performs database writes**. No hosted database was contacted. The disposable server was stopped after testing, preserving its data/evidence.

TLS-positive diagnostic tests use injected, explicitly simulated authorized transport/query fixtures. Real mysql2 tests additionally verify a no-TLS server is rejected before authentication/SQL and a silent handshake times out without credential/SQL bytes. These local checks do not establish actual GoDaddy CA trust, engine, identity or grants.

Run the full backend tests on Node 22 with `node --test server/tests/*.test.js`; focused coverage is `node --test server/tests/godaddy-diagnostic.test.js server/tests/godaddy-deployment-diagnostic.test.js`. The package verifier's optional extracted-directory argument runs the real process marker/restart checks against a local dummy TCP server, never a hosted database. Build and package verification do not execute diagnostics against injected DB credentials.

Final source SHA, ZIP SHA256, deterministic rebuild confirmation and deployment smoke receipt are generated beside `artifacts/upms-godaddy-controlled-diagnostic-node22.zip`. Local logs and synthetic private run state remain in ignored storage; no diagnostic output or credentials are included in downloadable runtime files. [Hosted observations](GODADDY-STAGING-HOSTED-OBSERVATIONS.md) are a separate pending record.
