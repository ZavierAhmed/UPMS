# V1.2 verification

Baseline remote/local16dbac8 matched; corrective branch created without amending V1.1. Three owner failures were reproduced against the archived original API with actual browser request capture, exact reason-only issue paths and no partial effects.

| Coverage | Result |
|---|---|
| Backend |174 passed: prior170 +4 V1.2 tests |
| Frontend |171 passed: prior169 +2 line-editor tests |
| Original V1/V1.1 SQL |33 reported tests passed on fresh05; original assertions unchanged |
| Dedicated V1.2 SQL |20 reported tests passed on fresh06 (19 child checks + suite parent) |
| Additional real-engine compatibility probes |7 passed; all writes rolled back and full business fingerprints equal |
| Actual mutating V1.2 browser |11 grouped checks passed on04, including field-error retry, code/pricing, production, discount/stock/ledger, saved draft repricing, XLSX/navigation/reconciliation |
| Final read-only owner-demo browser |7 checks passed, including clean screenshots, non-priced print, exports,12 viewport/form measurements, navigation/logout and unchanged business fingerprints |
| Public W06 |66 route/viewport combinations +22 interactions passed |
| Lighthouse |Home/catalog/detail/contact performance96/97/97/98; accessibility/best-practices/SEO100 |
| Build/lint/audits |Build and lint passed; backend/client dependency audits0 vulnerabilities |

Original33 includes legacy isolation, exact DC boundaries, competing dispatches, lost-COMMIT replay, payments, paid expenses and source reconciliation. New20 covers code concurrency/immutability, no-price handling, duplicates, exact fixed/percent discounts, zero-total blocking, discounted ledger debit, oversize/concurrent stock, immutable snapshots, explicit repricing, discounted lost-COMMIT and DC boundaries. Additional probes verify legacy codes/unpriced columns, collision skipping and old zero-discount payloads.

Failed evidence retained: preservation stopped after successful import because the general connection-name guard excluded the restore schema; read-only forward verification selected the exact approved restore and proved all fingerprints without repeating DDL.03 had18 passing checks and one fixture failure (missing required correction justification), preserved.02 original regression exposed400 vs409 stock-conflict drift, corrected to the original409 contract and passed on05. Initial04 browser stopped before business writes because the helper counted toolbar buttons as sidebar entries; verified-empty04 resumed successfully. Earlier reproduction/frontend helper failures remain in ignored logs. No assertions were weakened or populated schema reset.

Extracted deployment package121files passed production-only npm ci, corruption rejection, routes/assets,7private probes and SMTP-disabled smoke checks. Actual XLSX reopened with6numeric source-matching rows; discounted sales/receivable4500 and signed client export agree. Rendered delivery note1page has quantity200/DC-0001 and no rates/subtotal/discount/PKR/GST; company register print1landscape page. Final fingerprints match all111main tables and all10business tables in each old demo. HTTP/hash checks prove3110/3111/3112 serve separate frozen frontend assets. Reconciliation matched in the original/new SQL suites and actual browser, including the7rolled-back compatibility probes. Owner manual UAT and real-company activation remain pending.
