# Round 3 test results

Evidence date: 24 October 2026, Asia/Karachi. MariaDB10.4.32 on loopback3309, normal recovery mode. This is compatibility testing, not Oracle MySQL certification. Private logs: `tmp/ui-r3`, encrypted profiles/receipts: `server/.local/ui-r3`; none belong in Git or deployment.

| Suite | Verified result |
|---|---|
| Frontend |166 passed, including146 retained and20 added|
| Backend |162 passed|
| Identity SQL |17 passed|
| Business SQL |17 passed: original16 plus one permission-scoped metadata detail API case|
| Inventory SQL |20 passed|
| Purchasing SQL |29 passed|
| Classification SQL |39 passed: original38 plus one Round3 browser case|
| Full cross-module SQL |134 passed on fresh full06: original133 plus one Round3 browser case|
| Mutable Round3 browser case |17 individual workflows within one SQL test; classification06 and full06 passed (17 checks each; repeated proof, not34 independent workflows)|
| Preserved demo browser |19 passed, four roles|
| Navigation / source-return stress |17 passed /20 cycles passed|
| Visual |34 checks /61 acceptance screenshots;100 business tables unchanged,0 financial POSTs|
| Public W06 |66 route/viewport +22 interactions passed|
| Frontend build / lint |Passed|
| npm audits |Server/client0 vulnerabilities|
| Extracted deployment package |Final candidate113 files passed; the same verifier is required on the commit-bound archive before push|

Original accounting, rollback, lost-COMMIT, deadlock, concurrent stock/receipt allocation, reconciliation, approval and immutable posting assertions remain. Presentation selectors changed to lifecycle attributes, visible workspaces and current labels; numerical assertions were retained. Added master API proof verifies permissions and approved fields. No migration or financial service changes.

All populated failed runs remain preserved. See UI-R3-isolated-test-plan.md and UI-R3-regression-forward-plan.md. Early failures exposed outdated caption waits, hidden cached controls, invalid native Code pattern, route-read races, missing per-receipt unapplied credit and missing per-challan outstanding. The test helper alone has exact owner-approved schema/account/marker exceptions; it is not packaged. A transient demo503 occurred during final build; subsequent health and original19 browser checks passed without reset.

Final protected checks: main100 business tables matched, expense tables remained empty, administrator retained,109 runtime scopes, seven profiles unchanged. Original/offline recovery hashes matched1037 files each. Owner UAT/visual approval remain pending.

Full05 retained130 passing checks before its legacy Payable1500.00 browser-label wait. Full06 passed all134 after the adapter checked the same1500/1000/0 values under Outstanding and the actual partial/paid settlement state. Full07 reserve was not provisioned. All financial form submit handler ASTs matched the starting commit; only two Sales read-only ledger handlers moved into the dedicated workspace. Git review confirms no migration or financial service diffs.
