# P2.7A local acceptance results

| Suite | Passed reported checks | Successful evidence |
|---|---:|---|
| Backend |154|149 retained + five return checks|
| Frontend |119|116 retained + three return checks|
| Identity SQL |17|fresh regression01, top-level execution|
| Business SQL/browser |16|same dedicated regression pipeline|
| Inventory SQL/browser |20|fresh inventory01|
| Purchasing SQL/browser |29|fresh purchasing01|
| Standalone Sales SQL/browser |23|fresh sales01|
| Expanded GST/NON_GST |38|fresh classification02|
| Standalone receipts |48|fresh receipts01|
| Standalone cheques |66|fresh cheques01|
| Complete return acceptance |86|fresh returns05; also passed returns03/04 before final safeguards|

Larger suites repeat baseline scenarios: return86 includes prior cheque66 plus20 return checks; cheque66 includes receipt48; receipt/classification suites repeat Sales assertions. These are reported suite counts, not summed unique tests. No successful run contains skipped/failing checks. Build/lint passed and both security audits report zero vulnerabilities.

Return coverage: exact posted source/customer/class/item/unit/active status and dispatch evidence, positive unit-compatible quantities, request without stock/financial effects, direct quarantine receipt, partial/full inspections, exact70 reusable/30 damaged outcome, cumulative repeated request/receipt bounds, concurrent receipts and competing inspection versions, exact Administrator approval/rejection authority and stale revision denial, immutable snapshots, all-or-nothing condition pairs and no-negative conditions. Real journal/update/number/audit trigger failures roll back projections, source effects and numbers. Same-key/changed-intent/current-permission checks, separate process replay, real deadlock/lock-timeout and actual TCP COMMIT-ACK loss pass. Corrupted mutable allowance/receipt projections fail closed against immutable evidence; reconciliation detects source/quantity tampering without repair.

Financial snapshots prove no change to original Sales rates/manual GST, classified original/current outstanding, customer journals/receipt credits/allocations/remaining/totals, cheque sources/events/reversals, vendor balances/journal and money balances/journal during physical posting. GST/NON_GST scope remains original. Request quantity does not establish credit entitlement.

Actual independent Sales/Inventory/Administrator/Accounts browser sessions create a request, receive to quarantine, record inspection, approve/post paired7 AVAILABLE/3 DAMAGED transfers, and read evidence under proper authority. Accounts has no stock controls; Inventory source JSON contains no rate, amount, tax or original financial payload. Customer outstanding/receipt-credit/money counts remain unchanged. Mobile390px has no horizontal overflow. Page and unexpected console error lists are empty. Return-source/shared-stock/customer reconciliation passes after browser effects.

Public W06:66 route/viewport combinations and22 interactions passed. Lighthouse performance home96/catalog97/detail97/contact98; accessibility/best-practices/SEO100 for all four samples. Public sources/assets and dependencies are unchanged. Final-source package:99 files, independent fresh extraction and production-only dependency installation;11 routes, asset, seven private probes, native identity and disabled-SMTP failure smoke passed. Final commit-bound package is regenerated and verified before push.

Preserved evidence: return01 scale-zero stock-fixture formatting failure; return02 exposed existing baseline quarantine stock, so later runs use a genuinely new synthetic variant with explicit zero/no-history activation. Classification01 stopped on an accidentally advanced historical migration import path; the original path/assertions were restored and fresh02 passed38. Return03/04 passed86; final05 verifies immutable-evidence posting safeguards. The first new backend test attempt had a syntax error; complete corrected runs passed154. No populated schema was reused/dropped, and no assertion was weakened.

Main migration009 applied with dedicated migrator:98 physical tables,96 restricted runtime scopes/nine ordered migrations, recovery0. All original rows/eight source hashes, one Administrator, seven profile/signing-secret hashes and1037 original/offline files remain preserved. Main business, return, stock, financial and activation/policy tables remain empty. Shared stock, return-source, classified customer, receipt, cheque and combined money reconciliations match. Real GST/receipt/cheque/return activation gates reject main. Verified local Runtime/Serve restarted and management returned200 without bootstrap or startup migration.

Locally accepted synthetic foundation only. No company activation, production readiness, merge, deployment or P2.7B. Stop for independent review.
