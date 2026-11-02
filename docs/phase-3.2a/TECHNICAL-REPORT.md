# P3.2A — Money Accounts foundation

Branch: `feature/upms-p3-2a-money-accounts-foundation`.
Starting local/remote SHA: `f272eec529bcfb803c2461b5399e974c09cbfa32`; the target branch did not exist when inspected. The ending SHA is the commit containing this report, also supplied in the delivery message.

**Implemented and tested locally only. Production financial records, grants, migrations, administrators, guards, deployment, SMTP and scheduled backups were not accessed or changed for this milestone.** Existing unrelated source assets are preserved. The module defaults disabled and does not claim hosted acceptance or readiness.

## Delivered behavior

- Four configured defaults: Haris/Junaid CASH_HOLDER, UBL Official BANK, Cheques CHEQUE_CUSTODY. Independent identities, no name-based calculation or aggregate spendable figure that includes custody. Unverified openings return/display NULL/Unverified, not zero.
- Exact PKR balances derived from immutable signed movements. Every opening is an explicit administrator-verified declaration with a source reference, date and justification; no old customer receipt/payment-method balance inference.
- Money-only external source credits/debits with evidence, global normalized source uniqueness, internal equal-leg cash/bank transfers and exact linked full reversals. Existing V1 official/external/cheque source references are rejected from the manual external path. These operations do not post sales, expenses, party credit or stock.
- All mutations share existing BusinessCommand actor/fingerprint/idempotency ownership, mandatory password-change and designated-administrator gates. Transactions serialize through the existing identity guard, then lock account rows in identity order; both legs, audit and command result commit together. No negative spendable balance or administrator deficit bypass. Dates cannot precede an affected account's latest movement or lie in the future.
- One opening per account; original records never edited/deleted. Reversal preserves the original and must have funds available; duplicate, recursive and opening reversals are blocked. No partial reversal or opening correction policy is invented.
- Source/effect/audit reconciliation checks exact movement shape, chronology, references, before/after evidence and balances. Inconsistency makes balances unavailable and blocks posting without automatic repair. This is consistency evidence, not cryptographic proof of physical funds or protection against fabricated valid SQL inserts.
- Current Simple V1 Money Accounts UI: separate cards/history, explicit opening, from/to transfer, external-source and reversal forms, date-filtered statements, Back, print/PDF and XLSX. Available operations follow backend capabilities. Unsaved forms stay in authenticated-session memory on return; explicit discard warns, pending posting disables in-app Back, and the existing sign-out/session-expiry handling clears drafts. No credentials are cached in these drafts.

Cheque custody supports only an explicitly declared opening value in this foundation. It cannot fund or receive ordinary transfers/external movements and never increases spendable cash/bank. It is not an instrument register, clearance status or independently reconciled cheque inventory; those belong to P3.2C.

## Changed-file map

| Area | Main files |
|---|---|
| Exact ledger/reconciliation/statements | `upms.php/app/Upms/MoneyAccounts.php` |
| Schema/configuration/readiness | `MoneySchema.php`, `resources/money-accounts-schema.json`, `money-schema-hashes.json`, `money-accounts-defaults.json` |
| Additional guards / recovery prototype | `MoneyGuards.php`, `MoneyRecovery.php` |
| Authenticated PHP routes / default-off configuration | `MoneyAccountsController.php`, `routes/api.php`, `config/upms.php`, conditional capability in `SimpleV1::state` |
| Current React UI | `management/src/MoneyAccounts.jsx`, `money-accounts.css`, conditional SimpleV1 navigation |
| Tests / evidence | `tests/Unit/MoneyAccountsTest.php`, CLI-only `tests/Support/money-local.php`, `scripts/p32a-money-*`, React `MoneyAccounts.test.jsx`, this evidence folder |
| Offline future migration review | `deployment/money-accounts/plan.php`, README and checksum-pinned review bundle; LF integrity rule in `.gitattributes` |

No existing financial posting service, party journal rule, item validator, Hafta calculation, baseline schema, CRUD policy, original guard or live backup collector/consumer was modified. The conditional capability is omitted when disabled, preserving existing default state-response compatibility.

## Actual validation

- PHP **8.3.36**: **60 unit tests / 1,259 assertions passed**, including nine new exact-money/configuration/reconciliation/crypto tests; existing P3.1 tests retained.
- Local MariaDB **10.11.19**, exact loopback instance: **28 grouped integration checks passed** through the real PHP HTTP kernel. These include pre-existing synthetic stock/challan/client history preserved across additive migration; four independent openings; exact external effects; concurrent overspend and same-key races; duplicate sources; no party/stock/revenue/expense transfer effects; negative-funds/reversal/backdate/identity-bound rejection; denied DDL/GRANT and immutable SQL mutation; rollback on failed audit; password/role/CSRF gates; default-off and stale extension-evidence rejection; P3.1 name-only item/Hafta compatibility.
- Encrypted versioned **25-table** snapshot restored into an empty, positively identified local schema: **158 rows**, FK integrity, all **60 guard rules** and exact money reconciliation passed. Nonempty target restore refused. Private keys/ciphertext were passed in memory to the local harness, not printed or committed. Hosted recovery and hosted guard-definer privilege acceptance were **not executed**.
- React **228 tests across 33 files passed**; lint, build and print/export results are recorded in [validation evidence](evidence). Nine new component tests cover independent/unverified holdings, excluded custody transfer choices, exact string submission, duplicate-click prevention, disabled capabilities, pending/readiness failures, reconciliation blocking, statement filters/exports and unsaved draft return.
- Actual local Chrome captures show Money Accounts, Transfers, statement and mobile layouts, with a visible synthetic-data annotation. They render real isolated PHP response fixtures over intercepted local transport; this is **not a hosted end-to-end acceptance**. The transfer form in the screenshot was not submitted. Browser checks made zero financial requests and found zero JavaScript errors or outer mobile overflow.
- Actual A4 landscape statement PDF and downloaded XLSX were checked with pdfplumber/openpyxl. All eight Haris statement movements, signed amounts and closing 43.10 remain; brought-forward coverage stays Unverified. Print excludes navigation/posting controls; Excel has no formulas and preserves exact server values. PDF pages were rendered and visually inspected.
- Existing financial regression: **83 HTTP comparisons and four snapshot comparisons passed**.
- Scoped Pint passed. Public client, SSR/prerender (11 routes plus 404) and management builds passed. Vite still reports the management bundle over its 500 kB advisory threshold; no build error is hidden.

Test issues encountered and resolved: the new high-value integration case exposed an accumulated-balance/input-limit mismatch; a distinct canonical balance parser now permits exact spending from valid 14-digit aggregates and the one-cent transfer/reversal regression passes. An unrestricted parallel React run timed out in an existing IntegrityReview async test; isolation and a four-worker full run passed without loosening its assertions. A newly added unsaved-transfer return test caught that only the opening form used the shared draft handler; all money forms now use it and the regression test passes. One test invocation used an incorrect config/root combination and was rerun from `upms.client`. None of those failed runs is counted as a pass.

## Review artifacts and limits

[Money Accounts screenshot](evidence/money-accounts.png) · [Transfer screenshot](evidence/money-transfer.png) · [Statement](evidence/money-statement.png) · [Mobile](evidence/money-mobile.png). All figures are synthetic, including the example 43.10 / 3.90 / 68.00 / 99.99 values; they are not live company balances.

The [migration and guard report](MIGRATION-AND-GUARDS.md) explains five additional tables, fifteen additional guards, unchanged 45-rule baseline and backup incompatibility. The [integration contract](INTEGRATION-BOUNDARIES.md) specifies later receipt/vendor/expense/cheque linkage without double postings or historic backfill. The [future production checklist](FUTURE-PRODUCTION-CHECKLIST.md) is deliberately pending.

**Production release blockers:** complete the version-aware streaming/off-host backup and protected Windows consumer, independent restore and production preflight/finalization tooling; verify actual 25-table/60-guard hosted definitions/definer/runtime permissions; obtain explicit owner approval of money-specific SQL fabrication/row-isolation risks and actual opening/source policy. The snapshot prototype and local receipts do not satisfy those hosted gates.

Remaining financial policy decisions: evidence/cutoff for real openings and opening corrections; external source categories and physical verification; per-account restrictions/dual approval (current gate is the existing designated administrators with justified self-approval); bank fees and bank reconciliation; account closure/rename governance; cheque instrument/clearing/dishonour timing; any explicitly authorized historical linkage. Deficit exceptions, partial reversals and automatic adjustments remain unsupported.

## Reproduce locally

Use the existing ignored runtime/dependencies and pre-existing positively verified test engine; no production connection is used:

```powershell
& .\tmp\php-runtime\bin\php.exe .\upms.php\vendor\bin\phpunit -c .\upms.php\phpunit.xml --testsuite Unit --no-progress
node .\scripts\p32a-money-integration.mjs
node .\scripts\p32a-money-browser.mjs
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\scripts\p32a-money-artifacts.py
Set-Location .\upms.client
node .\node_modules\vitest\vitest.mjs run --maxWorkers=4
node .\node_modules\eslint\bin\eslint.js .
```

The integration harness creates fresh `upms_test_php_money_*` and `_restore` fixtures only after validating exact local engine/data-directory identity. It does not reset existing schemas or create production users. Local fixture credentials and source snapshots remain outside Git. Full frontend build uses the existing package build pipeline; the offline migration generator is not a deployment command.
