# P3.2B2 — Expense categories, employees and reporting

**Development only.** No GoDaddy connection, deployment, production migration, grant, live guard, financial record, administrator, scheduled backup or SMTP change was made for this milestone. Both new master/report capabilities and money capabilities remain disabled by default. Unrelated source assets were preserved.

Starting local and remote branch: `feature/upms-p3-2b1-financial-money-integration`, SHA `8fd9a0a3dfea40077fe3490ff7af29c5edfdc711`. New branch: `feature/upms-p3-2b2-expense-employees-reports`. Ending commit SHA is provided in delivery and is independently available through `git rev-parse HEAD` on that branch.

## Delivered workflow

The enabled expense form has a searchable category selector and adjacent Add Category (+) popup with required name, Employee-Based checkbox, Save and Cancel. A successful save selects the category without leaving the expense. Employee-based categories reveal a required searchable employee selector and Add Employee (+) popup, with required name and optional designation, phone and notes. Creating or cancelling either popup preserves amount, date, description, payee/reference/remarks, method and paying account. Switching to an ordinary category clears the employee association and its confirmation only; unrelated draft fields remain.

Employee association is explicitly a **business expense**, not payroll, employee advance or loan accounting. Server input permits only BUSINESS_EXPENSE purpose. An employee-based entry additionally requires explicit confirmation that it is not an advance or loan. This is an authorized operator attestation; it cannot authenticate the physical intent of a dishonest entry. No payroll, salary calculation, advance allocation or loan ledger is implemented.

Separate authorized master directories support case-insensitive search, stable identity, duplicate-name validation across active/inactive records, optimistic versions, active/inactive status and retained change evidence. Category names/Employee-Based flag and employee details can change without rewriting posted expenses. There is no destructive delete API, and runtime triggers prohibit master deletion. Employees with identical normalized names currently require review of the existing identity rather than automatic duplicate creation; see remaining policies below.

## Posting, snapshots and compatibility

`V1Input::document` accepts categoryId/employeeId/purpose/confirmation only under explicit expense-master mode. The server derives category display text and a server-owned p32b2 marker plus immutable category and employee ID/name/version/flag snapshots. It rejects inactive/missing identities, an employee on an ordinary category, unsupported advance/loan purposes and client-invented snapshot fields. Draft posting rechecks current activity/version/flag; any changed master requires editing and re-saving the draft. Posted displays and reports retain the historical snapshot and match the immutable master history at that version.

The original `BusinessCommand` transaction, designated-administrator/mandatory-password gates, CSRF and idempotency protocol remain. P3.2B1 still performs the single canonical DOCUMENT money debit for a posted expense when money is enabled. Category/employee creation never creates an expense or money movement. A master save and its immutable history/command result commit together. Failed history, money or command writes roll back their enclosing transaction. New master command receipts are checked against the exact retained history version and actor rather than bypassing existing integrity validation.

The two feature flags are independent. Tests cover both disabled, both enabled, masters-only with no money effect, and money-only with legacy/unmapped expense categories on an installed 29-table schema. A reviewed 72-guard proof is required for that installed extension even when its UI feature is disabled. Turning off the master feature cannot silently post a previously master-marked draft. Old free-text posted expenses are never assigned master IDs; they remain readable and report in an explicit Legacy / unmapped bucket.

## Exact reporting and exports

Expense Reports is accessible from Expenses and Reports, with date range, searchable All/selected category, All/selected employee, optional paying-account filter and category/employee/date grouping. Inactive identities remain usable for historical filtering. Each grouping, its summary totals and the overall total derives from the same authorized posted expense record set using exact integer cents. Drafts are excluded. Stable identity groups retain all historical name variants rather than substituting a current master name. Ordinary/legacy expenses appear in No associated employee; legacy category rows retain the original free text. No report claims payroll or full profit-and-loss coverage.

Reporting fails closed on master/history, historical snapshot, business/source or money reconciliation disagreement; it does not repair records. Money filters use actual canonical linked debit claims, not payment-method guesses. Unallocated historical and money-disabled entries are labelled honestly and excluded by a selected paying-account filter.

Actual Chrome print output and downloaded XLSX were verified: two A4 landscape pages per report, no blank pages/clipped text/orphan group totals, all five synthetic posted sources present, exact overall **0.63 PKR**, no formulas, and category/employee group totals reconciling to that same amount. Filter context repeats in printed table headers; controls/navigation are excluded. The PDFs were rendered and visually inspected.

## Evidence and actual tests

- PHP 8.3.36: **79 unit tests / 1,332 assertions passed** (including master history, snapshots, exact reporting, purpose validation, strict receipts and cipher tampering).
- React: **246 tests across 35 files passed**. Ten new tests cover both popups, selection, draft preservation, employee flag/clearing, inactive/duplicate errors, versions, snapshots, report filters, exact export and pending-save duplicate clicks.
- New MariaDB 10.11.19 integration: **28 grouped checks passed**, actual CRUD-only authenticated fixture runtime, original 60 plus 12 guards, full financial/master/snapshot reconciliation and authenticated encrypted restore of **29 tables / 72 guards / 138 rows**. Nonempty restore refused.
- Existing P3.2A foundation and P3.2B1 document suites: **28 checks each passed** against fresh isolated fixtures. Existing independent financial regression: **83 HTTP comparisons / four snapshots passed**. These retain P3.1 Hafta, item creation, party/stock, exact-money, concurrency and financial rollback coverage.
- ESLint, scoped Pint and complete public/SSR/prerender (11 routes plus 404)/management builds passed. Vite retains its management bundle over 500 kB advisory.
- [Offline migration reproducibility](evidence/migration-plan.json) passed: four canonical new tables, twelve new guards, no executed SQL/grants/seeded records.

These are local results, not hosted validation. [Integration and recovery evidence](evidence/integration.json), [artifact verification](evidence/artifact-verification.json), [browser receipt](evidence/browser.json) and [validation summary](evidence/validation-summary.json) retain the actual checks. Browser captures render real isolated PHP GET fixtures; two inline master creation responses are simulated at the browser transport, while actual master creation/validation/transaction behavior is tested through the PHP HTTP kernel separately. Browser financial POSTs are blocked.

Observed failures and corrections: a new search test initially counted native payment-method options as category search results; it now scopes its assertion to the listbox. One React invocation used the repository root without its jsdom configuration and was rerun from upms.client. The first print layout separated a group total from its source rows; the final row and total now stay together with repeated context. PDF text extraction initially interleaved wrapped table columns; verification now inspects actual table cells and workbooks. Owner-only synthetic fixture ACLs required running artifact verification under the owning identity. A final readiness review also required detecting installed expense tables before selecting a guard proof; money-only mode now rejects stale 60-rule evidence on the 29-table schema. No failed run is counted as a pass, and no production failure or deployment occurred.

Screenshots: [Category popup](evidence/category-popup.png), [Employee popup](evidence/employee-popup.png), [Mobile employee popup](evidence/employee-popup-mobile.png), [Category report](evidence/category-report.png), [Employee report](evidence/employee-report.png). Verified synthetic samples: [Category PDF](../../output/pdf/UPMS-P3.2B2-Category-Expense-Report.pdf) and [Employee PDF](../../output/pdf/UPMS-P3.2B2-Employee-Expense-Report.pdf).

## Main changed files and release limits

New PHP services: `ExpenseMasters`, `ExpenseReports`, `ExpenseSchema`, `ExpenseGuards`, `ExpenseRecovery`; controller: `ExpenseController`. Existing document validation/posting, command integrity, reconciliation, state/readiness and feature configuration gain explicit expense support. New React components `ExpenseMasters.jsx`, `ExpenseReports.jsx` and scoped CSS provide the current Simple V1 workflow. Test scripts, schema resources, offline bundle and docs are included.

The four-table/twelve-guard impact and database limitations are detailed in [schema/guard/recovery review](SCHEMA-GUARDS-RECOVERY.md). Original 45 and P3.2A 15 trigger bodies/hashes, stock/party posting rules, money posting adapter, scoped runtime allowlist and live backup operations remain unchanged. The verifier gains an explicit reviewed extension set; its default 60-rule contract still rejects extra guards.

Remaining policies: real opening/cutoff/source evidence; duplicate real employee names and identity differentiation; permission/approval granularity for category flags and optional employee details; account/operator segregation; independent approval versus administrator self-approval; genuine backup/release tooling; financial corrections and cheque lifecycle. Integrated financial corrections remain blocked pending [P3.2B3](P3.2B3-FINANCIAL-CORRECTIONS.md); [P3.2C](P3.2C-CHEQUE-PLAN.md) remains separately proposed. See the [future production checklist](FUTURE-PRODUCTION-CHECKLIST.md). **No hosted readiness or activation is claimed.**

## Reproduce locally

```powershell
& .\tmp\php-runtime\bin\php.exe .\upms.php\vendor\bin\phpunit -c .\upms.php\phpunit.xml --testsuite Unit
node .\scripts\p32b2-expenses-integration.mjs
node .\scripts\p32b2-financial-regressions.mjs
node .\scripts\p32b2-expenses-plan-check.mjs
node .\scripts\p32b2-expenses-browser.mjs
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\scripts\p32b2-expenses-artifacts.py
Set-Location .\upms.client
node .\node_modules\vitest\vitest.mjs run --maxWorkers=4
node .\node_modules\eslint\bin\eslint.js .
```

Only the existing positively verified loopback fixture engine is accepted by these integration/provisioning scripts. Fixture credentials, keys and raw snapshots remain in owner-protected ignored runtime storage; no credentials or backup contents are printed/committed.
