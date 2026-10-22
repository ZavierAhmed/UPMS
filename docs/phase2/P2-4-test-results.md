# Final P2.4 acceptance results

**Locally tested; operational posting blocked pending owner policy/opening decisions. Not production ready.** MariaDB 10.4.32 at recovered loopback port 3309; no Oracle MySQL or production-hosting claim. All final successful suites had zero failures, cancellations and skips.

| Gate | Final result |
|---|---|
| Complete backend | 128 passed |
| Complete frontend | 104 passed |
| Original identity SQL | 17 passed, fresh regression run 02 |
| Original business SQL/browser | 16 passed, same one-time regression pipeline |
| Original inventory SQL/browser | 20 passed, fresh inventory run 03 |
| New purchase/vendor/money SQL/browser | 29 passed, fresh purchase run 08 |
| Build and frontend lint | Passed |
| Full backend/client dependency audits | Zero vulnerabilities |
| Public website regression | 66 route/viewport combinations, 22 interactions passed |
| Lighthouse | Performance home96/catalog97/detail97/contact98; accessibility/best-practices/SEO100 on all four |
| Extracted production package | 75 files; production-only install, native identity hash/verify, checksum/corruption rejection, eleven routes/assets, seven private probes and disabled delivery passed |
| Main migration/preservation | 59 physical/57 runtime tables, four migration records, original rows retained, sole administrator preserved, no operational activation |

SQL acceptance includes pending-invoice receipt without money, later invoice without duplicate receiving, purchased finished goods, gross payable and immediate partial/full payments, deferred/multi-invoice settlements, money and invoice races, concurrent vendor credits, reference uniqueness, insufficient funds, account-type gating, exact deficit approval/revocation/version/hash/balance invalidation, cross-vendor/surplus denial, audit/stock-journal rollback, immutable source/correction requests, unit/rate/date/starting-state checks, shared stock history, independent inventory cutoff, current authority on replay, real deadlock/lock timeout, TCP-proxy COMMIT-ACK loss and independent process restart/replay. No mocked transaction evidence substitutes for MariaDB.

The browser uses independent contexts for Accounts, Administrator, Inventory and Sales. It creates/reviews/posts a pending receipt, confirms a later invoice with no extra stock, pays it through the vendor ledger, reviews money history, checks mobile width, denies staff deficit approval/insufficient funds, approves the exact payment as Administrator in another session, posts from Accounts and verifies the approval-linked negative money event. Both nonfinancial departments lack purchasing navigation and direct financial APIs are separately denied. No page errors occurred.

Inventory's retained 12-concurrent-post workload took 178ms total, p50 131ms/p95 178ms; guards retained, reconciliation matched and negative stock zero. This is small local workload evidence, not production capacity.

## Failed/incomplete attempts retained

- Restricted initial backend attempt was interrupted after a temporary-file access failure; it is not acceptance evidence. Full normal-access final run passed 128.
- Initial frontend run: 103 passed/1 failed because the existing overview-copy test still expected the superseded upcoming-milestone message. The assertion now checks the new explicit-policy notice. Final runs passed 104. A slower restricted run also eventually passed; no test was removed.
- Purchase 01: 4 passed/2 failed (including parent). Stored DECIMAL six-place padding incorrectly failed three-place unit validation. Value/modulus validation fixed the service without permitting excess precision.
- Purchase 02: 12 passed/2 failed. Synchronous schema validation escaped a rejection assertion. Public service commands now consistently reject asynchronously; mandatory justification still applies.
- Purchase 03 passed its then-current 27 checks. Expanded run04: 27 passed/2 failed at initial browser draft submission. Run05 passed all29.
- Added deficit-browser run06: 27 passed/2 failed because the harness searched the administrator list before data rendered. Exact button-ready wait added. Run07: 27 passed/2 failed at draft entry. Private diagnostics showed a blank required vendor: options had not loaded when selection ran. Both browser helpers now wait for the actual option and assert the selected value. Complete fresh run08 passed29, including the added deficit flow. No assertions were weakened.
- Inventory01: 17 passed/2 failed because the browser report directory was absent after browser actions. Inventory02: 17 passed/2 failed at draft entry. Evidence-directory preparation and option-ready handling are corrected. Complete fresh run03 passed20. Populated runs are never reused/reset.
- Regression01 and final02 each passed17 identity plus16 business tests. Original assertions remain; only schema/endpoint/history/evidence metadata was adapted for P2.4.

All failed/successful databases, private credentials and receipts remain preserved. Unused planned runs are not created. Evidence is ignored under `tmp/w06/p24` and `server/.local/p24`, including final SQL logs, browser reports, audits, package checks, backup/restoration, migration/grants and original-file/profile preservation. No owner financial rows, dumps, cookies or passwords are committed.
