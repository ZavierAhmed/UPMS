# PHP-7.5 automated evidence

All numbers below are newly executed for this milestone, including the ten-run
matrix completed before the session interruption. The sanitized JSON manifest
records raw private evidence paths and SHA-256 hashes. No passwords, cookies,
SQL dumps or inquiry bodies are committed.

Node 22.23.4; PHP CLI/CGI 8.3.36 and 8.4.27 (explicit Sodium on 8.4);
MariaDB 10.11.19; Apache 2.4.58 Win64; OpenSSL 3.1.3;
Chrome 156.0.8078.48. These local versions are not hosting approval.

| Suite | PHP 8.3 HTTP / SQL states | PHP 8.4 HTTP / SQL states |
| --- | ---: | ---: |
| PHP-2 | 144 / 13 | 144 / 13 |
| PHP-3 | 223 / 12 | 223 / 12 |
| PHP-4 | 265 / 14 | 265 / 14 |
| PHP-5 | 276 / 13 | 276 / 13 |
| PHP-6 plus integrity corrections | 345 / 11 | 345 / 11 |
| Total per runtime | 1,253 / 63 | 1,253 / 63 |

Combined: 2,506 management HTTP comparisons and 126 complete SQL-state comparisons.
PHP-6 includes 126 reversible integrity probes per runtime. Both databases' ten
business tables are checked before/after observational reads. Runtime privileges:
26 denied/constraint checks plus four allowed no-ops rolled back per runtime.

| Check | Actual result |
| --- | --- |
| PHPUnit 8.3 / 8.4 | PASS 73 tests / 1,316 assertions each |
| Inquiry 8.3 / 8.4 | PASS 66 HTTP comparisons / 78 checks each |
| Express | PASS 290 tests, zero failures |
| React | PASS 192 tests / 27 files, two workers |
| Production build / ESLint | PASS / PASS |
| Management HTTPS per runtime | PASS 26 + 9 checks, zero JavaScript errors |
| Public HTTPS per runtime | PASS 28 checks, zero JavaScript errors |
| Final owner fixture public browser | PASS another 28 checks |
| Disposable browser artifacts per runtime | 3 XLSX / 2 PDFs |
| Fixed worksheet artifacts | 4 XLSX / 6 PDFs, seven pages, additional to disposable runs |
| HTTPS security | 16 checks completed; overall FAIL for two missing management headers |
| Composer platform | PASS both runtimes |
| Composer normal validate | Valid, exit 0 with exact-pin warnings |
| Composer strict validate | FAIL exit 1 for existing exact-pin warnings |
| Composer locked audit | FAIL one medium advisory, symfony/mime 7.4.19 |
| Full Pint / changed SecurityTest | FAIL eight existing files / PASS with project configuration |
| Public assets | PASS 111 hashes identical |

The unrestricted React run passed 191/192, with one IntegrityReview component
timeout. A complete rerun with maxWorkers=2 passed all 192; no test was removed
or assertion weakened. The collector now uses bounded workers. Full Pint flags
PublicInquiries.php, Documents.php, InquiryInput.php, InquiryStore.php,
Integrity.php, Reconciliation.php, config/inquiries.php and scripts/inquiry-mail.php.
No unrelated formatting change was made.

## Negative and concurrency coverage

| Requirement | Newly executed coverage |
| --- | --- |
| Insufficient stock, stale/duplicate post, changed selling price | PHP-3 differential and complete state checks |
| Excessive return, wrong original line | PHP-4 differential and rollback checks |
| Unsupported methods, duplicate normalized external/cheque reference | PHP-5 rejection controls |
| Client Cash/Bank cheque-path reversal, repeated/reversal-of-reversal | PHP-5 and actual browser side fixtures |
| Allowed vendor Cash/Bank reversals | Both runtime browser side fixtures |
| Opening correction after activity, invalid stock correction source | PHP-5 rejection/state checks |
| Unpaid, zero and missing-reference expense | PHP-6 and actual browser validation/cancellation |
| Unauthorized, disabled, role, expiry, CSRF | Fresh PHPUnit, identity differentials, actual HTTPS checks |
| Replay/conflict, concurrency, rollback | PHP-2–6 independent fresh fixture schemas |
| Interrupted transaction / lost COMMIT acknowledgement | Existing real database proxy/process tests re-executed |
| Inquiry dedup, rate/capacity, corrupt/abandoned storage | Both inquiry runs and final HTTPS DevelopmentFile replay |
| SMTP TLS/authentication/rejection/timeout/disconnect | Local SSL/STARTTLS fixtures only, trusted fixture CA and untrusted-certificate controls |

Existing before/after assertions verify rejected actions create no unintended
business effects. The accepted worksheet was excluded from fault injection.
Reconciliation stayed observational. No balancing SQL or repair was introduced.
Final public UAT created exactly one synthetic DevelopmentFile message; replay
retained one, and UI did not claim email delivery. No customer mail was sent.

## Reproduction and harness corrections

Use the bundled Node 22 executable. `scripts/php-7-5-automated.mjs` runs PHPUnit,
inquiries, dependencies and React; `scripts/php-7-management-regressions.mjs`
runs the ten management differentials. Results retain every exit code; failed
gates make the collector exit nonzero. Test-admin values are loaded privately.

PHPUnit helpers accept explicit PHP_TEST_ADMIN_PORT=3330 and the private test
admin user. Legacy 3328 defaults are retained for old workflows, but PHP-7.5
never used or started that engine. Positive engine/data-directory/binding checks
precede provisioning. No business guard or schema was relaxed for tests.

Run destructive browser/fault suites only on fresh disposable fixtures, never
the accepted worksheet. `php-7-5-worksheet.mjs` requires a fresh empty fixture;
its `--reports-only` stage verifies totals and exports without reposting.

The first partial worksheet fixture was preserved after a harness response-wrapper
mistake. A new schema holds the accepted run. Return print button text was fixed
and only reports rerun. Security harness corrections handled valid no-store/private
headers, the actual sign-in selector, and desktop sidebar visibility. The service
helper's timestamp comparison was corrected for PowerShell JSON DateTime parsing.
These were harness defects; accepted amounts and business code were unchanged.
