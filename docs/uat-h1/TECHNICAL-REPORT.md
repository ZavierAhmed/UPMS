# UAT-H1 technical report

Implemented on `feature/upms-uath1-employee-hafta` from verified UAT-1A SHA `7c8e6184c4be16ed33adb03b71d47fac9b2a53fd`. Scope is the active PHP Simple V1 management application, isolated UAT only.

Production now supports an active searchable employee, reused inline Add Employee popup and explicit per-line labor rates. Posted production creates durable immutable earnings atomically with stock. A separate Hafta workspace records outgoing canonical money settlements against verified payable, carries balances, links sources and prints/exports employee statements. Client Hafta is renamed Client Weekly Statement without changing its PHP calculations or saved URL. See the policy/design documents for chronology and unknown-opening behavior.

The original 29-table schema and 72 guard definitions are preserved. Additive isolated schema is 34/88. Feature defaults off, production-profile readiness is rejected, and installers/restores assert the known loopback test engine and synthetic schema namespace. No owner records, production connection, website, cheque feature, numbering sequence, operational backup job or SMTP setting was changed.

## Validation

| Check | Actual result |
|---|---|
| Full PHP suite | 160 tests, 1,894 assertions passed on PHP 8.3.36 |
| PHP unit subset | 106 tests, 1,422 assertions passed |
| React | 272 tests in 38 files passed |
| ESLint / management build | Passed |
| Prior money suites | Foundation, financial documents, expenses and refunds; evidence retained separately |
| Legacy pricing/security differential | 83 HTTP comparisons and 4 snapshots; see final validation evidence |
| Integrated original financial scenario | Independent stock/party/expense/holding constants checked after each operation |
| New labor integration | 13 groups; exact rates, two employees, several weeks, unknown openings, rollback injections, concurrency/idempotency, native guards and permissions |
| Native runtime mutation attempts | 11 rejected UPDATE/DELETE/duplicate-earning attempts |
| Separate money-detail permission | Actual payment account/batch redaction, money API denial and unchanged visible labor balance passed |
| Chrome acceptance | 154 PHP requests, desktop/mobile, popup focus/field preservation, real draft and one real synthetic settlement; successful final run has no API/page errors |
| Actual artifacts | 5 Chrome PDFs, 4 Excel workbooks; independent totals verified, all 15 PDF pages rendered and visually reviewed |
| Encrypted recovery | Final synthetic state restored to fresh isolated schema: 34 tables / 88 guards / 674 rows, full reconciliation passed |
| Original owner UAT | Before/after fingerprints of 23 business/identity/control tables unchanged |

Independent wage oracle: Alice earnings = 100.00 + 3.75 + 4.20 + 0.40 = 108.35. Integration payments = 30.00 + 5.00 + 60.00 = 95.00; browser settlement adds 1.00. Final payable = **12.35**. Bob earnings = 5.00 + 10000.00 = 10005.00, no payment. Existing unverified employees keep the all-employee closing unknown. Ordinary employee business expense 0.11 is excluded from wages and deducted only once from cash. Posted zero-rate productions deliberately exercise long real statement pagination without altering these wage totals.

Test development failures were not accepted as passes. Fixes included CRUD trigger-definition visibility via target-bound maintenance evidence, binary identifier comparisons across old/new collations, strict labor command-receipt recognition, test-fixture field corrections and payment-detail redaction. An initial browser attempt had an unsuccessful API status and an error banner; it was rejected, and the successful rerun's responses, exports and regenerated PDFs were verified. Legacy PHP fixtures were stale and regenerated only in isolated schemas. The final remaining MIME security failure was local vendor drift (installed 7.4.19 versus locked 7.4.22); installing the existing lockfile resolved it without a dependency/lockfile change.

## Evidence and retest

`evidence/validation.json` summarizes actual results; individual integration, browser, money-detail, print, recovery and preservation receipts retain the supporting checks. `CHANGED-FILES.md` inventories the complete staged scope. PDFs are in `output/pdf/uat-h1/`; workbooks and screenshots are in this directory's `evidence/` folder. Developer rerun commands are `node scripts/uath1-php-suite.mjs`, `node scripts/uath1-regressions.mjs`, `node scripts/uath1-integration.mjs`, `node scripts/uath1-browser.mjs` and `node scripts/uath1-final-recovery.mjs`, in that order on the explicitly verified local engine. Private engine credentials are required and never printed.

The original owner preview remains separately bound at port 5173. The supplied owner-operated startup for a distinct Employee Hafta workspace securely requests a new synthetic password; it does not recreate the original owner administrators. Its syntax was checked, but interactive password selection is an owner retest step, not a claimed completed login. See OWNER-UAT-GUIDE.md.

## Limits requiring later approval

No wage reversals, advances, retroactive allocations or correction mechanism; no delegated ordinary-staff access; no proof of physical payment. Immutable guards protect existing recorded labor but CRUD credentials can still fabricate consistent new inputs. Maintenance evidence is needed for full trigger definitions. Old recovery/operational backups are not automatically compatible with new 34/88 data. Hosted migration, recurring new-format backup integration and production activation need a separately reviewed release and explicit approval. Local tests do not constitute production readiness.
