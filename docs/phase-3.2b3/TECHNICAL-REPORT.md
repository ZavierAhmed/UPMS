# P3.2B3 — integrated financial corrections and refunds

Starting branch: `feature/upms-p3-2b2-expense-employees-reports` at verified local/remote SHA `59e317949a7239c41c021e55219bfd74e3758aad`.

Delivery branch: `feature/upms-p3-2b3-financial-corrections`. The delivery commit containing this report is the ending SHA (reported with the push receipt); it is deliberately not embedded in its own contents.

## Implemented boundary

The active PHP Simple V1 API and management interface now support full actual customer refunds, returned vendor payments and paid business-expense refunds through the original cash/bank account. Original posted records and snapshots remain unchanged. A new linked FINANCIAL_REFUND document receives an RF reference; its exact party/expense and money effects, audit and command result commit together through BusinessCommand. No Node production backend is substituted.

Eligibility, source version/batch/hash, actor authorization, password restrictions, readiness, current Pakistan date, actual-funds attestation, evidence, funds availability and single full correction are rechecked on final posting. Server-selected original amounts/accounts cannot be overridden. Cancelled drafts have no financial effect and do not reserve the source. Existing native unique `corrects_id` plus transaction serialization prevent competing corrections. Standalone DOCUMENT reversal remains blocked. New features default off.

See the [eligibility matrix and accounting/date policy](CORRECTION-POLICY.md). Mistaken/duplicate-entry-only, metadata/category/employee, wrong-account, partial/backdated, legacy/unlinked, cheque and purchase/goods-return corrections are explicit policy-required outcomes. Purchases remain blocked because a complete stock/consumption/supplier-credit/refund policy is not implemented. No stock write or stock-write fault injection is claimed for this blocked workflow.

## Actual validation

All tests use isolated synthetic loopback MariaDB fixtures. No GoDaddy connection or production test transaction occurred.

| Check | Actual result |
| --- | --- |
| PHP 8.3.36 unit suite | 89 tests / 1,375 assertions passed |
| React suite | 255 tests / 36 files passed; 9 focused refund tests passed again after UI wording adjustment |
| ESLint / scoped PHP Pint | Passed |
| Public, SSR, prerender and management builds | Passed; 11 public routes plus 404. Management bundle retains a >500 kB advisory. |
| Refund MariaDB integration | 26 grouped checks passed |
| P3.2A / P3.2B1 / P3.2B2 regressions | 28 checks each passed in fresh fixtures |
| Existing financial differential | 83 HTTP comparisons and 4 database snapshots passed; P3.1 Hafta/item tests retained |
| Browser desktop/mobile | 10 screenshots, no JavaScript errors, no outer mobile overflow; zero financial writes |
| Authenticated encrypted isolated recovery | 289 rows / 29 tables / 72 guards restored and reconciled; nonempty target rejected |

The integration exercises customer/vendor/expense directions, historical expense identity after master changes, negative refund-date category/employee totals, insufficient funds, evidence and policy rejection, stale source/version/date, duplicate/concurrent claims, identical idempotency retries, cancellation, corrupted money evidence, CSRF, revoked roles and password rotation. Fault injection at party journal, money batch/movement/audit, business audit, command insert and final document update rolls back the whole correction. Failed expense posting publishes no negative expense fact. Originals remain byte-for-byte unchanged. Runtime SQL cannot mutate posted refunds/journals/audits or obtain CREATE/GRANT. No new guard definition is introduced.

An initial fixture assertion used the wrong sign for a vendor payable; it was corrected to the existing debit-minus-credit convention. The expanded recovery verifier initially included draft audit events in posting evidence; it was corrected to select document.posted events, and the complete fresh run passed. Browser setup initially omitted the expense directory fixture; actual directory evidence was added. Mobile screenshots were recaptured after navigation animation settled and visually checked. None of those failed attempts is represented as a passed run; committed evidence is the successful final run.

Browser GET responses come from the actual isolated PHP fixture. Final posting confirmation is checked then dismissed, and all browser financial writes are blocked. API posting/rollback is covered separately by real MariaDB integration; this is not hosted end-to-end acceptance.

## Exact synthetic accounting examples

| Event | Party / expense | Original account |
| --- | --- | --- |
| Customer cash receipt 25.01, then full return | Original credit 25.01 retained; refund debit 25.01 restores receivable | Haris +25.01 then −25.01 |
| Customer bank receipt 10.02, then full return | Separate original credit / refund debit | UBL +10.02 then −10.02 |
| Vendor payment 30.03, then actual returned payment | Original debit 30.03 retained; refund credit 30.03 restores payable | UBL −30.03 then +30.03 |
| Paid expense 0.30, then actual full return | Original +0.30 and refund −0.30, same historic Transport / Synthetic Employee snapshots | Haris −0.30 then +0.30; no party/stock entry |

The complete fixture also contains explicit openings, an unchanged paid purchase, legacy entries, an unrefunded insufficient-funds source, an actual transfer and another unrefunded 0.02 expense. Consequently final client balance is **98.93**, vendor balance **−99.98** (company owes vendor 99.98), Haris **100.98**, Junaid **0.00**, UBL **479.92**, nonspendable cheque custody **10.00**. Expense net is **0.02**; the refund-only period shows **−0.30**. Hafta separately shows **35.04** customer receipt reversals without changing sales. These are synthetic test figures, not production balances.

[Exact ledger, statement and report rows](evidence/reconciliation-examples.json), [full integration and actual local grants](evidence/integration.json), [validation summary](evidence/validation-summary.json), [browser evidence](evidence/browser.json).

## UI evidence

- [Desktop full refund review](evidence/refund-review-desktop.png)
- [Incorrect-entry policy block](evidence/incorrect-entry-blocked.png) and [purchase-return policy block](evidence/purchase-return-blocked.png)
- [Final draft review](evidence/refund-final-confirmation-draft.png)
- [Posted vendor refund](evidence/vendor-refund-posted.png), [posted expense refund](evidence/expense-refund-posted.png), [mobile expense refund](evidence/expense-refund-mobile.png)
- [Money statement source/refund links](evidence/money-statement-refund-links.png)
- [Signed expense report](evidence/signed-expense-report.png) and [mobile report](evidence/signed-expense-report-mobile.png)

## Release and recovery limits

Schema/guards remain **29/72**, with every existing definition unchanged. No migration or grant change is needed for this milestone itself. The earlier cumulative additions and the refund-aware protected backup consumer still require a separate future release. See [guard protections and recovery plan](RECOVERY-AND-GUARDS.md), [pending production checklist](FUTURE-PRODUCTION-CHECKLIST.md) and [P3.2C dependencies](P3.2C-CHEQUE-PLAN.md).

The refund feature additionally requires its own target-bound owner release approval in production; no approval file or successful hosted gate is fabricated. Operator attestation, reconciliation and immutable history are not proof of physical funds, second-person approval or database row isolation. Compromised broad-CRUD SQL credentials retain the documented insert/mutable-record risks.

Production remains untouched and is not declared ready for these features. Existing website identity/design, credentials, administrator accounts, database records, activation, SMTP state and protected backup operations are unchanged. Unrelated source assets are preserved and excluded from this commit.
