# P2.6B local acceptance results

| Suite | Passed reported checks | Evidence |
|---|---:|---|
| Backend |149|143 retained + six cheque validation/permission checks|
| Frontend |116|113 retained + three cheque interface checks|
| Identity SQL |17|fresh regression01, top-level execution|
| Business SQL/browser |16|same dedicated regression pipeline|
| Inventory SQL/browser |20|fresh inventory01; negative-stock concurrency retained|
| Purchasing SQL/browser |29|fresh purchasing02; payments and exact deficit approvals retained|
| Standalone Sales SQL/browser |23|fresh sales01; also repeated in final acceptance|
| Expanded classification |38|fresh classification01|
| Standalone receipts |48|fresh receipts02, final source|
| Complete cheque acceptance |66|fresh cheques07: Sales23 + receipt25 + cheque18|

Expanded classification and receipts repeat Sales baseline assertions. Cheque66 includes the48 Sales/receipt checks; it is not66 wholly new checks. No failures/skips in the successful runs. Build/lint passed and both dependency audits report zero vulnerabilities.

Cheque coverage includes immediate credit/multiple allocations/pending holding, unchanged settled bank before clearance, immutable source SQL rights, exact metadata/scope/currency/opening checks, duplicate instrument and durable/process restart replay, deposit without settlement, one clearance without second customer credit, terminal-state denial, exact Administrator request approval/rejection and stale hashes, initial/later allocation compensation and remaining-credit removal, NON_GST isolation, missing evidence, clearance-versus-return and application-versus-return races, real audit-trigger rollback and actual TCP COMMIT-ACK loss. Existing Sales/receipt suites execute real deadlocks and lock-timeouts, stock races, rollback faults and lost-ACK replay. No mocks substitute for SQL evidence.

Independent Accounts/Administrator browser contexts receive, review, post, deposit, clear, request, approve and post dishonour. Mobile390px has no horizontal overflow. Sales sees sanitized cheque status and credit compensation without bank evidence; Sales/Inventory have no cheque controls or financial API authority. CSRF and current permission checks on durable replay pass. Page and unexpected console error lists are empty. Reconciliation passes again after browser postings, without repair.

Public W06:66 route/viewport combinations plus22 interactions passed. Lighthouse performance: home96/catalog97/detail97/contact98; accessibility/best-practices/SEO100 on all four samples. Public portfolio sources/assets/identity unchanged. Independently extracted final precommit deployment package:93 files, production-only dependency install,11 routes, asset, seven private-path probes, native Argon2/identity and disabled-SMTP failure smoke passed. A package bound to the final commit is regenerated/verified after commit and before push.

Preserved failed evidence: cheque01 duplicate-fixture stale allocation metadata; cheque03 encoded text wait; cheque04 dynamic React-label wait; cheque05 genuine mobile status overflow; cheque06 and receipt01 Sales rendering regression introduced while adding sanitized status. All corrected without weakening assertions; no populated schema was reused/dropped. Cheque02 previously passed64 SQL/receipt checks. Purchasing01 retained an obsolete synthetic funding namespace guard and stopped; fresh02 passed29. The first sandboxed backend attempt lacked private-file permissions; complete elevated runs passed149. Logs/profiles/dumps remain private and ignored.

Main migration008 and seven exact grant additions succeeded:90 physical/88 runtime tables/eight migrations, recovery0. Original owner rows, one Administrator, seven profile/signing-secret hashes and all1037 original XAMPP files/offline copies are preserved. Main business, money, receipt, cheque, cutoff, period and policy tables remain empty. Stock/classified/receipt/cheque/combined-money reconciliation matches. Read-only actual-name checks reject real GST/receipt/cheque activation. Verified Runtime/Serve restarted and management returned200 without bootstrap or startup migration.

No production-readiness claim, merge, deployment or P2.7. Stop for independent review.
