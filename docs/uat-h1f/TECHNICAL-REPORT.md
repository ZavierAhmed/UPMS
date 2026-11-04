# UAT-H1F technical report

Starting branch and verified local/remote HEAD: feature/upms-uath1e-hafta-opening-report-fix, f73a898585aa669d882c394391d3e45001fc1f73. Correction branch: feature/upms-uath1f-hafta-statement-clarity.

## Presentation policy

employeeHaftaStatement supplies one shared presentation model for React and Excel. It consumes the existing PHP report's coverage, reconciled opening, recorded activity and authoritative closing. Exact integer cents are used only to display the new total available before payment and aggregate presentation values. Existing accounting calculations, command receipts, idempotency, posting rules, cash effects and reconciliations are unchanged. PHP adds only the retained opening employee name from its existing snapshot to read-only opening detail; it does not alter any record or arithmetic.

FULL statements use the server's verified report opening. If the original opening precedes From, the dated row is a carried balance as of From, retaining the original opening ID; it never reposts the historical opening amount. PARTIAL statements retain the unknown selected-period beginning separately from the actual verified opening within the period. Their numeric closing is shown only with existing successful reconciliation and an as-of date. UNVERIFIED statements show recorded activity but no fabricated opening or verified closing. An unknown employee propagates null to relevant aggregate balances.

Opening/carry rows have a dedicated opening-balance column. Their earned and paid cells are empty; original production, expense, payment and opening IDs remain intact. The final summary displays opening, earned labor, available before payment, direct payments, applied existing expenses, total deductions and the emphasized amount owed. Ordinary business expenses are never added as wage deductions. Summary values restate activity, rather than representing new transactions; Excel metadata explicitly warns against summing summaries into activity.

Individual reports omit the redundant overall card grid. All-employee reports keep aggregate coverage and totals plus separate employee statements. Printing omits interactive controls and duplicate top cards, keeps the final settlement/summary/signatures together, and repeats table identity/header when a long statement spans pages. Approved Unique Plastic Industry logo, graphite/orange/warm-white language and signatures are retained. Mobile keeps the nine-column statement within its horizontal scroll container without page overflow.

## Owner safety and evidence

The fixed 5180 database remains upms_test_php_money_1793691451921 on the verified loopback test engine. Native before/after inspection checks 38 tables/103 guards and unchanged owner business/administrator fingerprints. Opening 1 remains 1000.00 on November 3, production 1 remains 200 bottles/2000.00 labor, and allocation 1 still applies original expense 3 for 1200.00 against its original canonical money movement. No owner opening/payment was reposted; no additional cash movement, schema migration, credential change, feature flag change, hosted connection or production deployment was performed. Port 5173 and recurring backup infrastructure were left untouched.

Actual owner browser acceptance follows owner-performed sign-in with existing credentials. The revised statement and exported workbook show 1000.00 opening, 2000.00 earned, 3000.00 available, 1200.00 deductions and 1800.00 owed, with PARTIAL coverage retained. Evidence includes actual owner after screenshot/download and a read-only before/after preservation receipt.

Before evidence is explicitly attributed: fresh isolated screenshots render the verified H1E component against the same H1F synthetic records. The baseline PDF/Excel and owner before screenshot are actual H1E artifacts from the verified starting commit, retained with source paths/hashes and current read-only value revalidation. They are not presented as newly generated owner financial transactions.

## Validation

Independent fixtures cover zero/thousand openings, full/partial/missing coverage, opening on From, opening after To, inclusive boundaries, carried balances, five mixed employees and multiple productions/allocations. Browser checks compare each summary amount against explicit independent expected values; PDF/Excel validation sums only dated activity, verifies numeric cell types and keeps opening separate from earned/paid. Final actual Chrome artifacts and exact regression counts are recorded in evidence.

Initial legacy UI mock expectations were updated for structured summary rows; they still assert source amounts and no additional cash row. An initial isolated startup retry failed at base-guards with STARTUP_FAILED after the deliberately injected administrator failure; the failed log/stage evidence is retained and the independent recheck result is reported separately. No owner startup or configuration was changed to mask it. Financial and database consistency checks retain their original assertions.

Existing evidence limitations remain: reconciliation is canonical source/arithmetic/audit consistency, not proof of physical cash or full SQL row isolation.

## Final results

PHP 166 tests/1906 assertions passed. React 298 tests in 41 suites passed, including 10 new independent statement-model cases; the final focused statement/opening/classification run passed 29 tests. ESLint and management build passed. Financial differential passed 83 HTTP comparisons/four snapshots. Full stock/labor checks passed 34 operations and 13 labor checks; independent prior-format restores reconciled 270 and 656 rows. Employee Chrome passed 158 requests, five PDFs, four Excel exports and 13 screenshots. Startup's fresh recheck passed seven checks/240 requests after its retained initial failure. Classified security/fault/print/recovery suites passed; the encrypted 38/103 restore authenticated and reconciled 292 rows, including negative recipient/ciphertext/data/DDL tests.

Final H1F Chrome generated nine PDFs (13 pages) and nine actual Excel downloads. Each of the eight individual cases fits one page; the all-employee report uses five pages. All 13 pages were rendered and visually reviewed. A mistaken unverified opening date/label caught in review was corrected, and explicit browser/Excel assertions now reject it. Opening amounts remain outside earned/paid totals; Excel money cells are numeric and introduce no formulas/macros. Actual owner Excel independently matches opening 1000.00, earned 2000.00, available 3000.00, deductions 1200.00 and authoritative closing 1800.00. Native owner financial/administrator fingerprints and all 103 guards match before/after. No owner financial POST was sent.
