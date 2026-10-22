# Final P2.3 verification

Local MariaDB 10.4.32 development acceptance on recovered port 3309. No production or Oracle MySQL claim. Every final successful run had zero failures, cancellations and skips.

| Check | Final result |
|---|---|
| Backend | 125 passed |
| Frontend including Inventory UI | 101 passed |
| Original identity SQL | 17 passed, fresh regression run 03 |
| Original P2.2 business SQL | 16 passed, same one-time pipeline |
| Inventory SQL and real browser | 20 passed, fresh inventory run 05 |
| Build/lint | Passed |
| Full backend/client dependency audits | Zero vulnerabilities |
| Public browser | 66 route/viewport combinations; 22 interactions passed |
| Package | Production-only install, corruption rejection, routes/assets, 7 private probes and disabled delivery passed |
| Main preservation/reconciliation | Original rows retained; no negative balances; journal matches |

SQL coverage includes initial-state authorization, production/material separation, exact fractions/integer units, inactive/category/condition/overflow rejection, repeated-line aggregation, competing spends/exact zero, deterministic multi-item locking, unchanged/stale counts, rejection/self-approval/version invalidation, delegated-permission bypass denial, inverse corrections/caps/concurrency, original immutability, process restart replay, audit-trigger rollback, real deadlock/lock timeout and actual posting COMMIT-ACK loss through a TCP proxy. No mocked concurrency or rollback substitutes for MariaDB evidence.

Same-item production/consumption racing rejects finished-goods consumption under the approved category rule while production succeeds. Finished-goods material consumption is not enabled to manufacture a competing debit test. Actual competing debits and correction/normal-movement races are separately tested.

The browser uses isolated contexts per department. It creates/reviews/posts production, submits an Inventory count, approves/posts as Administrator, checks read-only Sales and Accounts navigation denial, and validates mobile width without page errors. All fixtures remain in the synthetic schema.

Twelve concurrent production postings: 284 ms total, p50 207 ms, p95 283 ms. Lock order remains identity guard, business guard, durable command/resource locks, sorted item/condition balances, then sequence. At most three whole transactions retry deadlock/lock timeout; connection ambiguity requires replay of the same key. No negative stock occurred. A real SQL-transaction fault verified reconciliation detects mismatch without repair; rollback removed only that injected fault.

## Failed attempts preserved

- Original-port inventory run 01 historically passed 18 checks before recovery; it is not the final gate.
- Recovered inventory 02: 16 passed/2 failed/0 skipped, browser automation timed out after draft save. Run 03: 16 passed/2 failed/0 skipped, shared browser cookies prevented another role's sign-in. Run 04: 17 passed/2 failed/0 skipped, administrator list queried before asynchronous rendering. Each stopped before its final workload check and remains preserved. Input interactions, cookie isolation and render waits were corrected without weakening assertions. Complete fresh run 05 passed; run 06 was not created.
- Recovered regression 02: 0 passed/2 failed/0 skipped. Operator connection was paired with runtime environment metadata; preflight correctly refused before identity fixtures. Correct operator metadata fixed the harness while preserving production/confirmation/repeat assertions.
- Automatic approval review rejected regression run-01 provisioning because that name identifies a preserved failed environment. The rejected batch performed no SQL. The owner explicitly approved new supplemental run 03, which passed both original suites. No failed schema was reset or reused.

Private evidence: server/.local/p23b/resumption and tmp/w06/p23. Backups, credentials, private rows and logs are not staged. Original XAMPP failed schemas and recovery copies remain preserved. Completion relies on the successful complete fresh runs, not failed or skipped work.

Final Lighthouse: home 96, catalog 97, detail 97, contact 98 performance; all four scored 100 accessibility/best-practices/SEO, with no accessibility failures. Evidence is isolated from historical reports.
