# PHP-6 — expenses, reports and financial reconciliation

Starting branch: `feature/upms-php-5-payments-corrections`.
Fetched/verified baseline: `bb1cce051f7bef253f826c37e3a51584ee32df8c`.
Delivery branch: `feature/upms-php-6-expenses-reports`.
The final SHA is reported in the handoff and identifies the commit containing this report.

## Enabled behavior

EXPENSE now supports the existing document POST/PATCH, POST documents/{id}/post and
POST documents/{id}/cancel endpoints under `/api/v1/management/simple-v1`, plus existing
detail/register/history reads. All thirteen active Simple V1 kinds are implemented.
No new API route, schema, table, accounting model, tax or expense-approval workflow exists.

Expense posting requires exact positive paid amount, category, description, payee,
reference, PAID status and Cash/Bank Transfer, with no party or bottle lines. Input
defaults, limits, fieldErrors, source error codes, dates, optimistic versions and
cancellation justification are preserved. Duplicate expense references are source-
permitted; UUID/actor/canonical command identity controls retries. Posted evidence is
immutable through the application. Document, audit and command receipt commit together.
Expenses create no stock/party journal effect, counter change or cash/bank balance.

Integrated reporting fixes preserve source behavior for literal string "0", Unicode
trimming, exact filter error paths and invalid dates. Reconciliation uses source-positive
amount validation and source truthiness/coercion for observed evidence; all financial
arithmetic remains Brick Math integer cents. It is observational and performs no repair.

## Results

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | ---: | ---: |
| PHPUnit tests / assertions | 73 / 1,304 | 73 / 1,304 |
| PHP-6 equivalent HTTP comparisons | 250 | 250 |
| PHP-6 complete SQL-state comparisons | 11 | 11 |
| PHP-2 regression HTTP / state | 144 / 13 | 144 / 13 |
| PHP-3 regression HTTP / state | 223 / 12 | 223 / 12 |
| PHP-4 regression HTTP / state | 265 / 14 | 265 / 14 |
| PHP-5 regression HTTP / state | 270 / 13 | 270 / 13 |
| Combined HTTP / state | 1,152 / 63 | 1,152 / 63 |
| Reversible reconciliation corruption probes | 33 | 33 |
| Actual HTTPS/FastCGI browser checks | 26 | 26 |
| Native XLSX downloads / rendered PDFs | 3 / 2 | 3 / 2 |
| Browser JavaScript errors | 0 | 0 |

Every run uses independent newly created Express/PHP synthetic schemas on verified
MariaDB **10.11.19**. PHPUnit and each browser runtime have separate fresh schemas.
Thirty Node-derived input/default/filter vectors extend the prior exact arithmetic,
numbering and partial-return fixtures. Prior milestone pending-expense assertions are
replaced with nine real converted-lifecycle comparisons; accepted cases remain intact.

All-thirteen-kind report totals include sales 96.34, return credits 10.00, net sales
86.34, purchases 52.56, client receipts 542.35, vendor payments 522.47, both expense
totals 69.15 and seven production bottles. Gross receivables 156.33 and payables 230.09
exclude unrelated advances. Date/filter/brought-forward behavior is detailed in
[report acceptance](PHP-6-REPORT-ACCEPTANCE.md).

Expense posting preserves stock, immutable lines, both journals and counters. Same-
document concurrency posts once; both post/cancel race orders match Express. Audit/
command faults and killed transaction connections roll back entirely. Discarded HTTP
responses replay in new PHP processes. Real dropped successful COMMIT acknowledgements
return 503 despite durable posting, then original-key retry returns the one saved result.
No new key is generated to recover an unknown outcome.

Corruption probes cover every kind plus lines, stock movements/projections, journals,
audit and commands. Twenty-seven produce exact mismatch lists, two produce source
INVALID_AMOUNT errors, and four preserve documented source blind spots. Reads never
change the before snapshot; every probe is restored and final reconciliation matches.
[Findings](PHP-6-RECONCILIATION-FINDINGS.md) propose a separate coordinated hardening
milestone rather than silently changing the source algorithm.

Actual browser checks use unchanged compiled React through Apache TLS → PHP FastCGI
→ Laravel → MariaDB. They cover integrated stock/challan/return/receipts/purchases/
payments/expenses, paid-only errors, cancellation, date/type/reference filters, exact
expense totals, unchanged balances, ledger/stock navigation and reconciliation.
Register, ledger and stock XLSX downloads are real browser downloads with expected
worksheet values; register and expense print actions render real A4 PDFs. No business
write requests occur during report/filter/print/export activity. Private screenshots,
PDFs and workbooks remain ignored; hashes/sizes are in machine evidence.

Express regression: **290 passed** with bounded `--test-concurrency=2`. An initial
oversubscribed run hit an existing five-second startup-child timeout; no Node code or
test assertion was changed. React: **188 passed in 25 files**. Build and ESLint pass;
the build retains its prior bundle-size warning. All **111 public assets are SHA256-
identical** to PHP-5 after rebuilding. No public/management React source changed and
owner-supplied assets were preserved and excluded.

Pint, Composer platform checks and extension/storage preflight pass on both PHP versions.
The installed PHP 8.4 configuration still needs `-d extension=sodium`; it was explicitly
enabled for CLI, Composer and FastCGI. Global PHP/Apache settings were not edited.
Private long browser fixtures use PHP_FCGI_MAX_REQUESTS=0; ephemeral local certificates
are confined to ignored test directories.

## Privileges, preserved findings and review boundary

Expense posting requires no grant expansion. Seventeen SQL denial checks retain
immutable journal/line/audit/command protection, forbidden business deletion, protected
identity/role/control fields and absence of DDL/global access. Required mutable document
and legitimate counter columns remain granted; row-level posted-document immutability
is an application invariant, not a column-grant guarantee. PHP-5's reversal review,
duplicate-reversal response, snapshot caveat and privilege limitations are unchanged.

PHP-7 public inquiry/contact delivery and broader cutover download integration remain
pending. PHP-8 Linux packaging, hosting verification, backups/rollback and reviewed
production cutover remain pending. Legacy ERP routes stay disabled. Production PHP
database connections remain blocked. Proposed source hardening requires separate review.

**The owner database was never contacted or modified.** No owner administrator, stock,
balances, schema or migration history changed. No owner migration/bootstrap/reset,
hosting ZIP, GoDaddy/DNS/live-file modification, deployment or publication occurred.
Stop for owner review before PHP-7.

Artifacts: [differential evidence](PHP-6-DIFFERENTIAL-EVIDENCE.md),
[report acceptance](PHP-6-REPORT-ACCEPTANCE.md), [findings](PHP-6-RECONCILIATION-FINDINGS.md),
[machine evidence](PHP-6-EVIDENCE.json), [public hashes](PHP-6-PUBLIC-ASSETS.json),
[exact manifest](PHP-6-FILES-CHANGED.txt), [API matrix](API-PARITY-MATRIX.md),
[remaining plan](BUSINESS-MIGRATION-PLAN.md).
