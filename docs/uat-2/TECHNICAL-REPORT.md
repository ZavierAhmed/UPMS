# UAT-2 technical report

Baseline verified locally/remotely: `feature/upms-uath1f-hafta-statement-clarity` at `53b95ecee5f500dc1da0ffda57eb682c8f358726`. Work branch: `feature/upms-uat2-cheque-management`. Existing unrelated evidence edits and untracked owner assets are preserved and excluded from this milestone's commit.

The implementation adds the incoming customer-cheque lifecycle to active PHP Simple V1 and the existing React management dashboard. Receipt/deposit are custody; only evidenced complete bank clearance posts the canonical customer payment and matching bank credit. Operational approval is pending and production/default activation remains blocked.

Schema: **44 tables / 124 guards**, adding six tables and 21 guards to unchanged 38/103. The native maintenance verifier compares the original and additional definitions exactly; the migration proves preservation of preexisting rows. See LIFECYCLE-AND-SCHEMA.md and SECURITY-AND-RECOVERY.md for the boundary and metadata-visibility limitations.

Changed-file inventory:

| Area | Files |
|---|---|
| PHP lifecycle/security | Cheques, ChequeSchema, ChequeGuards, ChequeReconciliation, ChequeRecovery, ChequeController; versioned schema/hash resources |
| Existing financial integration | Documents, MoneyDocuments, MoneyAccounts, V1Input, BusinessCommand, Integrity, Reconciliation, SimpleV1, SimpleV1Controller, EmployeeHafta, LaborExtensionSchema; FinancialRecovery rejects new cheque evidence in older formats |
| Existing boundaries/config | UpmsBoundary, API routes, default-off config |
| React | CustomerCheques; SimpleV1 sidebar/payment entry; PaymentDocument and MoneyAccounts source links; narrow cheque CSS; focused CustomerCheques tests |
| Isolated infrastructure | uat2 workspace, preview/startup, integration, negative, legacy, auth, recovery, browser and regression harnesses; additive options in the existing local launcher/adapter; CLI cheque helper |
| Review artifacts | Seven UAT-2 documents; structured test evidence; desktop/mobile screenshots; actual Chrome PDFs and completed Excel downloads |

The original accounting algorithms, numbering, posted immutability, stock/Hafta business rules, prior 103 guard definitions and production backup infrastructure are not changed. Existing generic command code gets an optional final validator so the new compound receipt is verified before commit; prior callers retain their previous behavior.

Commands from repository root (owner-bound local engine access is required):

```powershell
node scripts/uat2-integration.mjs
node scripts/uat2-negative.mjs
node scripts/uat2-bank-opening.mjs
node scripts/uat2-recovery.mjs
node scripts/uat2-legacy.mjs
node scripts/uat2-auth-boundary.mjs
node scripts/uat2-browser.mjs
node scripts/uat2-startup-browser.mjs
node scripts/uat2-regressions.mjs
node scripts/uat2-regressions.mjs --full
node scripts/uat2-client-checks.mjs
node scripts/uat2-release-check.mjs
```

In `C:\Users\zasah\source\repos\UPMS\upms.client`:

```powershell
node node_modules/eslint/bin/eslint.js management/src src/test/CustomerCheques.test.jsx
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node node_modules/vite/bin/vite.js build --config vite.management.config.js
```

Numerical acceptance, native guard/privilege attempts, eight SQL fault points, authenticated recovery negatives and browser exports are recorded in the evidence JSON files. The existing PHP suite has 166 tests / 1,906 assertions; prior financial differential compares 83 HTTP operations and four snapshots. Prior full stock/labor/correction/recovery and real browser/startup suites are retained under `evidence/regressions` with new paths, not overwritten in earlier milestone evidence. `evidence/FINAL-VALIDATION.json` is the final result index; incomplete checks must remain incomplete there until actually run.

During development, tests caught restricted trigger-body visibility, collation-dependent trigger-name ordering, lock contention outside the controller, an XLSX metadata contract error and a loading notice in an early acknowledgment PDF. These were corrected and their affected checks rerun. Failed/intermediate attempts are not counted as passes.

The numerical oracle is 50,000 -> 0 due with one 50,000 bank credit; dishonour adds no effect; a separate complete 20,000 cheque against 50,000 leaves 30,000 due. Detailed evidence and policy limitations are in FINANCIAL-RECONCILIATION.md and CHEQUE-ACCOUNTING-POLICY.md.

Final verified results:

| Check | Actual result |
|---|---|
| Existing PHP suite | 166 passed, 1,906 assertions |
| React | 304 passed in 42 files |
| Management lint/build | Passed |
| Existing financial differential | 83 HTTP comparisons and four snapshots passed |
| Existing cumulative suites | Stock/challan, labor/Hafta, expenses/refunds, rollback, recovery, employee browser and startup passed |
| Cheque negatives | 50 checks plus two focused BANK opening/date-coverage rejections; eight SQL insert-fault points; 18 direct native protection attempts passed |
| Encrypted independent recovery | 44 tables, 124 guards, 239 restored rows; authenticated decryption and 20 rejection cases passed |
| Legacy/additive migration | Original rows/ledger identity preserved; no bank backfill; ambiguous references rejected |
| Authentication/startup | Five authentication checks and six startup/binding/retry checks passed |
| Actual Chrome | Registration/deposit/clearance; one company/customer payment; desktop/mobile; five PDFs and three XLSX downloads passed |
| Artifact review | Five rendered pages inspected; correct cheque bank label, customer print privacy, exact exported amounts and source URLs |
| Manual UAT listener | HTTP 200 on port 5196; stop/restart tested; WAITING for owner-chosen synthetic password |

The mobile register uses readable horizontally scrolling columns; the browser checks its measured column and viewport widths. Excel retains source URLs as plain text using the existing formula-free exporter. Run the artifact validator with the installed Python runtime:

```powershell
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\zasah\source\repos\UPMS\scripts\uat2-artifact-check.py'
```

The manual listener's setup page being available is not a claim that its database is initialized. It creates a fresh independent database only after the owner supplies a new synthetic password. Full authenticated acceptance already passed in separate automated fixtures; their random passwords are not retained.

No owner database on ports 5173/5180, production administrator, production record, hosted grant, deployment, SMTP setting or recurring production backup is modified by UAT-2. Any independently requested recurring backup heartbeat remains a separate read-only backup operation against the existing deployment.
