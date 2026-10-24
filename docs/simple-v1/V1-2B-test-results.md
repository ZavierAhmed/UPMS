# V1.2B test results

Actual runs on2026-10-24. Historical counts were baselines, not targets.

| Check | Result | Evidence |
|---|---|---|
|Backend suite|180 passed|tmp/v12b-backend-final.log|
|Frontend suite|176 passed|tmp/v12b-frontend-handoff.log|
|Original V1 compatibility SQL|33 passed, fresh07|tmp/v12b-legacy-sql-final.log|
|Original V1.2 SQL|20 passed, fresh03|tmp/v12b-original-sql.log|
|New payment/time SQL|16 reported tests passed, fresh05|tmp/v12b-payment-sql.log|
|Archived V1.2A failure|API + browser reproduced400; no effects, fresh01|tmp/v12b-reproduction/http.json|
|Retained stock browser|11 groups passed, fresh04|tmp/v12-browser-b-04/results.json|
|Retained financial browser|6 groups passed, cumulative04|tmp/v12b-financial-browser/results.json|
|Retained stock freshness/history|3 assertions passed, cumulative04|tmp/v12b-freshness/results.json|
|New payment/time browser|5 groups passed on06 and final08,20screens each|tmp/v12b-payment-browser-b-{06,08}/results.json|
|Final read-only demo stock/export review|7 groups passed|tmp/v12-browser-b-demo/results.json|
|Final payment/native keyboard review|20screens, no overflow, no business changes|tmp/v12b-owner-review/results.json|
|Actual XLSX inspection|8 numeric source-matching rows,4500sales,8500client balance|tmp/v12-browser-b-demo/export-print-verification.json|
|PDF print|1page,10:30 exact, no prices/discount/GST|tmp/v12b-payment-browser-b-06/print-verification.json|
|Build/lint|Passed|tmp/v12b-build-handoff.log;tmp/v12b-lint-handoff.log|
|Security audits|0 backend production/client vulnerabilities|tmp/v12b-audit-{server,client}.json|
|Public W06|66 route/width checks,22 interactions|tmp/v12b-public.log|
|Lighthouse|Performance96/97/97/98, other categories100|tmp/v12b-public.log|
|Extracted package|121files; production install, corruption rejection, routes/assets,7private probes, SMTP-disabled passed|tmp/v12b-package-handoff-results.json|
|Preservation|All111 main tables and all10V1 tables per old demo unchanged|tmp/v12b-preservation-final.log;server/.local/simple-v12b/preservation.json|

New SQL covers unnumbered drafts, exact client credit/vendor debit, optional cash/bank references, supplied-reference preservation/deduplication, mandatory cheque identity, wrong party, unverified opening, date before opening, invalid amount, stale versions/snapshots, concurrency, durable original-key replay after a separate API-process restart, and an actual dropped TCP COMMIT acknowledgement. Invalid posting leaves the draft and every V1 fingerprint unchanged. Time validation/reconciliation and independent DC progression pass. The original suites retain stock/pricing/discount/number-boundary/lost-COMMIT/legacy-isolation assertions without weakening.

The first original compatibility run on02 exposed a real reference-search regression: official identity hid external-reference lookup. One child assertion failed (parent also failed;31 of33 reported tests passed). Its schema and log are preserved. The read models were fixed to search separate references; the exact original assertion passed on fresh approved reserve07. No reset/reuse or assertion relaxation was used. Approved reserve08 ran the final complete payment/time browser pass after purchase-help and status-style review; its20screens and all5workflow groups passed. Earlier06 evidence is preserved.

Browser cash receipt1000 with blank reference changes a verified5000 receivable to4000 exactly once and assigns CR-0005 in that fresh fixture; refresh removes mutation actions. Vendor1000 assigns VP and debits once. A stale finalize shows its actionable message and leaves the draft intact. Challan200 at25 less10% gives4500 and stock300;10:30 persists to the non-priced print. Native keyboard16:45/blank validation and40 dedicated responsive captures passed. Source journal/register/XLSX reconciliation remains exact.

The existing private management bundle exceeds Vite's advisory500kB threshold. No dependency was added. Owner manual acceptance and live prefix/cutover decisions remain pending. Final commit-bound package identity and remote SHA are recorded in the handoff response/private final receipt.

Archived reproduction service/router/exact source content (normalizing Git archive CRLF/LF) was checked against git show of1db1c48. Five demo HTTP endpoints and each frozen JavaScript asset were verified independently (`tmp/v12b-serving.json`).
