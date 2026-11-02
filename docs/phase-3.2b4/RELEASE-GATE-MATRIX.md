# Release gate matrix — production NO GO

The read-only `scripts/p32b4-release-preflight.mjs` records actual source hashes and local evidence and never connects to a database or host. `p32b4-gates.mjs` requires every named mandatory hosted gate to be present, unique, mandatory and PASS. FAIL, BLOCKED, unknown, omitted, duplicate or optionalized hosted gates prevent GO. Its tests use in-memory booleans only, not fake approval files. No migration, activation or rollback code is present.

Final machine-readable statuses are in [preflight evidence](evidence/release-preflight.json). During development, incomplete validation is BLOCKED and an actual failing command is FAIL; neither is passed by assuming earlier success. The retained [pre-fix validation](evidence/validation-before-navigation-fix.json) records the browser failure before the navigation defect was fixed.

| Gate | Status / evidence boundary |
| --- | --- |
| Required starting SHA matches local and fetched remote | PASS — `73a290dfb5bea2bc616784f89f7c22e6636fa943` |
| Canonical 20/45 → 25/60 → 29/72 sequence, original schema/guard resources preserved | PASS — source comparisons and fresh isolated canonical verifiers |
| Feature flags disabled by default | PASS — actual example configuration inspected |
| Isolated authenticated runtime and four database CRUD privileges | PASS — actual CURRENT_USER/SCHEMA_PRIVILEGES in rerun refund evidence |
| Immutable history, atomic failures, authorization, concurrency and retries | PASS — rerun financial suites plus new oracle and safe lost-response replay |
| Independent numerical oracle / money / party / stock / expenses | PASS — 18 checkpoints, direct journal/movement sums and PHP reports |
| Windows DPAPI + synthetic encrypted refund-aware recovery | PASS — actual Windows test, 231 rows / 29 tables / 72 guards |
| Built browser, dated reports, keyboard/mobile, PDF/XLSX | PASS after fixes — actual PHP transport and verified generated artifacts |
| Source inspection / candidate hashes | PASS for inspected tree; final committed SHA is verified separately after commit |
| Exact production target and owner-approved release SHA | BLOCKED — prohibited/unavailable in this milestone |
| Actual hosted runtime/grants and restricted guard-definer privileges | BLOCKED — isolated maintenance creator is not proof of hosted SELECT/TRIGGER-only definer |
| Actual hosted immutable schema/72-guard proof | BLOCKED — no hosted inspection performed |
| Genuine protected off-host archive independently restored | BLOCKED — synthetic fixture is not independent production recovery |
| Live 29/72 streaming collection, DPAPI consumer, retention/alerts | BLOCKED — legacy live implementation intentionally unchanged |
| Separate target-bound money, expense and refund readiness/release approvals | BLOCKED — no approvals created or inferred from earlier milestones |
| Maintenance order, real opening/cutoff policy and controlled rollout | BLOCKED — needs separate owner-approved production procedure |
| HTTPS, host isolation and non-business production smoke acceptance | BLOCKED — no hosted request made |
| Approved file/config restoration, rollback limits and stop conditions | BLOCKED — no automatic migration/rollback authorized |
| Cross-Windows-account DPAPI access test | BLOCKED — second authorized identity unavailable |
| GST/non-GST separation, purchase-return stock posting, cheque-funded corrections | NOT APPLICABLE as supported operations — PHP GST dimension does not exist; purchase/cheque correction policies are deliberately blocked, not silently implemented |

No unresolved local financial defect is intentionally waived. Unsupported accounting policies remain blocked. Production remains **BLOCKED / NO GO**, even when every local acceptance check passes. Before a future release, follow the [production checklist](FUTURE-PRODUCTION-CHECKLIST.md); never relabel local synthetic evidence as a genuine recovery certificate or owner approval.
