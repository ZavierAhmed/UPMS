# Confirmed requirements and evidence

Authority: the owner's P2.0 request, supplied 2026-10-21. Business rules below are **CONFIRMED**; this is not an implementation or an assertion that every spreadsheet transaction is correct. Technical designs elsewhere are proposals. Shared terminology/statuses are defined in [business workflows](P2-0-business-workflows.md).

## Private source review

| Source | Read-only inspection actually performed | Safe structural observation / limit |
| --- | --- | --- |
| E-01 challan photograph | Visual inspection of supplied JPEG | Number/date, customer/address, vehicle/driver/time, description, quality, colour, packing, quantity, total and signature fields. No separate printed rate/GST columns observed. Different printed identity must not be reused. A single photographed form does not decide future print content or stock policy. |
| E-02 PURCHASE OCTOBER 26.xlsx | One worksheet; first 120 rows and at most 40 columns, formula text retained for inspection | Date/reference/name, quantity, rate, amount headers and multiplication/total formula patterns. No historical amounts or supplier names copied. This is not a financial reconciliation or full item taxonomy audit. |
| E-03 SALE AND PAYMENTS.xlsx | Both worksheets; same bounded range | A worksheet title contains GST; SMALL F / SMALL R / BIG F / BIG R, rates, amounts, totals and arithmetic patterns observed. Meaning of abbreviations remains unknown. |
| E-04 SALE PARTY LEDGER.xlsx | 112 worksheets; first 120 rows and up to 40 columns of each | Debit/credit/balance, quantity/rate and brought-forward headings, running addition/subtraction patterns. Sheet names and party details withheld. No assertion of complete historical correctness or approved GST mapping. |
| E-05 IN HAND DETAILS - 19-10-26.pdf | Text extraction and visual review of its single page | Separate account/holder/cheque sections with received/paid/balance columns; an advance-related description is present. Names and values withheld. Existing negative figures do not establish permanent exemptions. Advances must not become opening expenses. |

Files were located at the owner-supplied `server/src/asset` directory after access was requested. Originals were not edited, imported, moved, uploaded or staged. Private inspection intermediates stay under ignored tmp/w06. Do not publish the source folder or infer affiliation, account names or authoritative balances from it. Source hashes were computed privately to identify inspected copies; customer records are not committed.

## Requirements register

| ID | Confirmed requirement | Design home |
| --- | --- | --- |
| R-01 | Preserve W06 public React/Vite/Node website, inquiry API, SEO, security, WhatsApp/Maps and disabled SMTP | Architecture; verification |
| R-02 | Design only; no implementation, connection, schema/migration, dependency, deployment or master merge | All documents; verification |
| R-03 | Four inventory groups: finished goods, raw materials, components, packing materials; one item base unit, no V1 automatic conversion | Inventory design |
| R-04 | Finished identity = bottle type + size + quality + colour; packing not identity; standardized masters/inactivation/duplicate controls needed | Inventory design; model |
| R-05 | Every inventory category nonnegative without any administrator bypass; server-side concurrent checks; drafts may exceed balances | Inventory; architecture; verification |
| R-06 | Production stock-in and independent material consumption stock-out each keep reference/date/creator/audit; no automatic BOM or linked manufacture | Workflows; inventory |
| R-07 | Purchases of finished goods/materials/components/packing increase correct stock and vendor payable | Workflows; ledgers; model |
| R-08 | Challan is dispatch and simultaneous sale; internal rates mandatory; required dispatch fields and optional remarks | Sales challans |
| R-09 | Ordinary permitted Sales/Dispatch users post directly; atomic stock, sale, ledger, posted state and audit; retries cannot repost | Sales; architecture |
| R-10 | GST and non-GST customer balances independent; no automatic netting/transfers/allocations across them | Ledgers; sales |
| R-11 | Manual rates/GST, quantity × rate subtotal; GST debit includes approved entered GST; no GST on non-GST documents | Sales; model |
| R-12 | Tax compliance/invoicing/withholding and printed rates/GST unresolved; no invented tax rate or legal policy | Decisions; sales |
| R-13 | Posted challans immutable; approved linked quantity/rate/variant/metadata/financial adjustments, cumulative safeguards and no invented physical stock | Sales; inventory |
| R-14 | Returns inspected; only authorized reusable units enter available stock, damaged unavailable; credit follows approved valuation, not reusable quantity alone | Workflows; sales; ledgers |
| R-15 | Purchases can be paid/partial/credit; immediate payment stock/payable/account/settlement atomic; later payments supported; purchase returns/corrections unconfirmed | Workflows; ledgers |
| R-16 | A receipt credits one selected customer ledger once; optional partial/multiple/later challan allocations create no new credit | Ledgers; architecture |
| R-17 | Admin-controlled cheque credit-on-receipt or credit-on-clearance policy, snapshotted per cheque, no retroactive changes/double credits; conditional dishonour reversal | Accounts/cheques |
| R-18 | Independent configurable cash/bank/cash-holder accounts and cheque register; transfer moves money without income/expense or duplication | Accounts/cheques; model |
| R-19 | Normally no money deficits; specific admin-approved reason/amount/resulting-deficit exception; no standing staff exemptions and no inventory exception | Security; accounts |
| R-20 | Configurable general expenses; required category/amount/account/reason/reference/posting fields; one deduction/expense, no double purchase settlement | Accounts/expenses |
| R-21 | Employee advances, salary/payroll, attendance/payslips, automatic valuation/COGS/P&L/general ledger/balance sheet/trial balance deferred | Scope; opening; reporting |
| R-22 | Approved cutoff/opening stock, both customer ledger classes, vendors, money accounts, pending cheques; reconcile, approve, immutable posting and controlled pre-cutoff authorization | Opening migration |
| R-23 | Department roles and backend field/report/export restrictions; authority separate from title; no inventory mutation merely from Accounts role | Security |
| R-24 | Sensitive changes/openings/stock adjustments require approval; staff no self-approval, admin self-approval justified; approval invalidation and authorization-at-action required | Security; workflows |
| R-25 | Independent document-type calendar-year sequences, year visible, issue at posting, no duplicates/reuse, Pakistan local business time proposed year rule | Architecture; model; decisions |
| R-26 | Operational journals as balance authority, exact DECIMAL arithmetic, durable posting idempotency, source links and reconciliation | Architecture; model; ledgers |
| R-27 | Secure sessions/passwords/CSRF/revocation/least privilege/audit/backup design; no management data in public static output | Security; architecture |
| R-28 | Single-process-compatible monolith, bounded MySQL pool/short locks/deadlock handling, explicit reviewed migrations; no mandatory worker/VPS services | Architecture; roadmap |
| R-29 | Operational reports, filters, protected CSV/Excel/PDF/print; no V1 statutory/general-ledger reports | Reporting |
| R-30 | Fifteen consistent Markdown deliverables with diagrams, decision register, future invariant tests and proposed staged roadmap | Verification; executive summary |

E-01–E-05 support field/convention observations only. Where old records and R-01–R-30 differ, retain the original as historical evidence, follow the confirmed rule for the design, and request an explicit exception decision rather than guessing. Do not decode the four sales abbreviations or quality names from item descriptions.
