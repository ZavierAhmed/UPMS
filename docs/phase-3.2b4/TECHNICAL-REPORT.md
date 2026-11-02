# P3.2B4 — consolidated acceptance and release readiness

Baseline branch `feature/upms-p3-2b3-financial-corrections`, exact required SHA **73a290dfb5bea2bc616784f89f7c22e6636fa943**, verified locally and against fetched origin before any changes. Delivery branch: `feature/upms-p3-2b4-consolidated-readiness`. Ending commit is the commit containing this completed report; delivery supplies the exact full SHA and verifies equality with origin. A commit does not embed its own hash.

## Actual changes

- A single fresh loopback MariaDB scenario checks 18 operation checkpoints against independent BigInt scenario constants and direct stock/party/money journal sums. It covers production, paid/credit purchases, sales/returns, permitted stock correction, partial/full ordinary receipts, vendor payment, four holdings, transfer, historic employee expense, full original-account refunds, insufficient stock/custody restrictions, dated net reports and uncertain-response idempotent replay.
- `FinancialArchive` supplies a separate offline authenticated manifest/envelope around the existing refund-aware snapshot. Synthetic Windows DPAPI acceptance, invalid-archive cases and independent empty-target restoration extend the prior recovery prototype without replacing the live 20/45 stream or keys.
- Read-only release preflight records actual source hashes, cumulative schema/guard preservation, feature defaults and local evidence. Mandatory hosted gates remain BLOCKED. Three focused gate tests prevent GO from omitted/duplicate/failed/blocked/optionalized mandatory gates.
- Real browser acceptance now serves the optimized built management assets and sends every API request through the actual isolated Laravel kernel/middleware and MariaDB. It creates and finalizes a synthetic refund, checks independent effects, views ledgers/statements/expenses and exports reports. Only synthetic fixtures are written.
- Fixed a verified refund-review navigation defect: after a successful draft save, the component's own pending-navigation listener blocked the intended move to the draft. The pending flag is now released after successful API completion and before navigation; a focused test proves pending external navigation remains blocked while successful internal navigation is allowed.
- Fixed the draft-to-posted transition retaining a stale pre-post account preview; posted documents now omit that draft-only preview and link to the current money statement. A focused transition test verifies it disappears.
- Fixed mobile expense-report columns that squeezed text vertically: a screen-only minimum table width and focusable scroll region preserve readability and keyboard scrolling without altering print layout.
- Build-only vendor grouping separates shared dependencies. Both existing Management and SimpleV1 imports remain eager; no route/feature or public website change. The largest management JS chunk fell from approximately **599.82 kB / 162.56 kB gzip** to **380.23 kB**, with vendor approximately **218.76 kB** and a small runtime chunk. Total code is approximately unchanged; this removes the per-chunk advisory rather than claiming less total downloaded functionality. [Measured sizes and UI retest](evidence/ui-validation.json).

See the [complete changed-file inventory](evidence/changed-files.json). All original 29-table resources and 72 guard definitions are preserved, including runtime-parameterized guard bodies. New runtime fixture names produce different parameterized hashes; canonical verification and baseline source comparison establish preservation. Existing financial transaction/idempotency/stock services and production backup scripts are unchanged. No new schema, trigger, grant or accounting policy was introduced.

## Validation and independent results

Actual command argv, working directory, exit code and captured counts are retained in [final validation](evidence/validation.json). The [final review rerun](evidence/final-review-validation.json) records the additional UI-only fixes after that full run. Supplementary final UI tests/lint/build and chunk sizes are in [UI validation](evidence/ui-validation.json). These are actual reruns, not inherited result claims.

| Suite | Result |
| --- | --- |
| PHP 8.3.36 | 92 tests / 1,378 assertions; includes 3 new archive unit tests |
| React | 257 tests / 36 files; includes 2 new navigation/posted-preview regression tests, 11 refund tests total |
| Release-gate logic | 3 tests, including every mandatory gate failing/blocked/unknown and omitted/duplicate/optionalized cases |
| Rerun P3.2A / B1 / B2 / B3 | 28 / 28 / 28 / 26 grouped checks; security, password/CSRF, role revocation, duplicate/concurrent/stale cases and applicable fault boundaries retained |
| Existing independent PHP financial differential | 83 HTTP comparisons / 4 database snapshots; retains P3.1 Hafta/item behavior |
| New consolidated oracle | 18 checkpoints × 9 expected/actual quantities, plus direct journal/movement sums and source preservation |
| Isolated recovery | 231 rows / 29 tables / 72 guards, exact pre-backup rows and reconciliation reproduced; nonempty target rejected |
| Windows protected recovery | Real CurrentUser DPAPI roundtrip, tamper/context rejection and 7 invalid/missing archive cases |
| Built browser | Actual isolated PHP API, 2 successful financial POSTs, 12 screenshots, no JavaScript errors; mobile navigation, keyboard scrolling, source links and dated negative expense filtering |
| PDF/XLSX exports | Category/employee PDFs: 2 A4 landscape pages each, no blank/clipped pages or orphan group totals; all 3 posted expense/refund rows, exact 0.07 net, no workbook formulas |
| Quality/build | PHP Pint, ESLint, public build, SSR, 11 public prerenders plus 404, management build |

Fault/negative coverage is extended rather than copied: the new oracle adds cross-workflow independent arithmetic and lost-response replay; established suites are rerun for party, stock, expense, money batch/movement/audit, final status, business audit and command-persistence failure rollback, authorization, idempotency and concurrency. Purchase refunds do not write stock; no nonexistent purchase-return stock fault test is claimed. The active backend remains PHP Simple V1, not the older Node ERP.

Final pre-backup balances are stock **119**, customer **13.27**, vendor **−41.17**, Haris **976.90**, Junaid **223.76**, UBL **3020.51**, custody **40.64**, expense net **0.07**, net sales **35.65**. Browser posting of a separate full 32.49 bank receipt refund yields customer **45.76** and UBL **2988.02**, preserving stock/sales. [Independent calculation and operation matrix](CONSOLIDATED-RECONCILIATION.md) / [machine-readable evidence](evidence/consolidated.json).

## Failures found and resolved

Initial scenario assertions omitted the required original-production link for a nonfinancial stock correction and expected 400 instead of the existing 409 insufficient-stock conflict; the fixture was corrected, not application policy. The first real-browser fixture used legacy interface mode; it now explicitly uses V1.2. A session expired during the interruption between attempts, so final browser runs use fresh fixtures. Programmatic button clicks now wait for React to enable the action. A real successful-save navigation defect was then reproduced, fixed and tested. Visual mobile review led to the readable/keyboard-scroll report fix. Final posted-document review also found and removed the stale draft balance preview. The final targeted rerun covers the complete React suite, lint/build and fresh consolidated/recovery/browser/export fixtures; unchanged backend regressions remain in the full 14-command receipt. A command aimed at a nonexistent engine-guard test filename failed and is not counted as test coverage; actual engine verification is executed before each isolated fixture.

The actual failed pre-fix validation receipt is preserved. Only successful reruns are used for final PASS statuses. No failure was waived or converted into a fabricated hosted success.

## Artifacts and reproduction

Run from the repository under the owner identity required for ignored private fixture ACLs:

```powershell
node scripts/p32b4-validate.mjs
node scripts/p32b4-ui-verify.mjs
node scripts/p32b4-release-preflight.mjs
```

All DB helpers positively identify the existing local MariaDB 10.11.19 engine on loopback port 3330, accept only explicit test-schema identities, and strip inherited UPMS environment settings from PHP workers. Browser startup also verifies the generated environment host/port/schema/runtime. Never point this tooling at production.

[Browser receipt and screenshots](evidence/browser.json), [category PDF](../../output/pdf/UPMS-P3.2B4-Category-Expense-Report.pdf), [employee PDF](../../output/pdf/UPMS-P3.2B4-Employee-Expense-Report.pdf), [artifact checks](evidence/artifact-verification.json). Screenshots are explicitly synthetic. PDFs are rendered and visually reviewed in addition to text/table and exact-decimal workbook checks.

## Limits and production decision

Supported full refunds require actual returned funds, original account, full amount, current Pakistan date, reason/evidence and authorized administrator attestation. Incorrect-entry-only, metadata/category/employee, partial/backdated, cross-account, legacy/cheque and purchase/goods-return corrections remain blocked. GST separation is unavailable in PHP Simple V1; no payroll, profit-and-loss or new cheque policy is added.

Broad CRUD SQL credentials still permit fabricated inserts and allowed mutable-record changes, including administrator passwords. Application authorization and consistency checks do not establish database row isolation, independent second-person approval or proof that physical funds moved. Isolated tests use a maintenance guard creator and do not prove a restricted hosted definer. Real Windows CurrentUser tests do not prove another Windows user's rejection.

**Production readiness: BLOCKED / NO GO.** Genuine independent production-archive recovery, operational 29/72 streaming/DPAPI integration, hosted target/runtime/definer/guard checks, real openings/cutoff, exact release approvals, HTTPS/host isolation/smoke acceptance and controlled rollout/restore procedures remain unavailable or unauthorized. [Precise gate matrix](RELEASE-GATE-MATRIX.md), [backup acceptance and limits](BACKUP-RECOVERY-ACCEPTANCE.md), [future checklist](FUTURE-PRODUCTION-CHECKLIST.md).

No GoDaddy/hosted connection, deployment, live transaction, migration, administrator/password change, production backup/schedule/key/retention change, SMTP change or public website alteration occurred in P3.2B4. All new feature defaults remain disabled. Unrelated untracked source assets remain preserved and excluded.
