# PHP-6 — report, ledger, inventory and export acceptance

All reads were compared against independent Express schemas on PHP 8.3.36 and
8.4.27 with MariaDB 10.11.19. Every corruption read also compares its entire before/
after business snapshot: no repair, audit rewrite, counter change or stock adjustment.

## Integrated all-thirteen-kind fixture

Historical dates span 2020-01-01 through 2020-01-04. The fixture includes verified
client/vendor openings, unrelated customer/vendor advances, two unverified parties,
production, credit/immediately-paid purchases, fixed/percentage challans, a partial
discounted return, cash/cheque receipts, vendor payments, cheque reversal, signed
stock correction, replacement opening correction and four paid expenses.

Verified register totals before later fault/large-amount cases:

| Field | Exact value |
| --- | ---: |
| sales | 96.34 |
| returnCredits | 10.00 |
| netSales | 86.34 |
| purchases | 52.56 |
| clientReceipts | 542.35 |
| vendorPayments, including immediately-paid purchase | 522.47 |
| expensesRecorded | 69.15 |
| expensesPaid | 69.15 |
| productionBottles | 7 |
| clientReceivables, excluding unrelated advances | 156.33 |
| vendorPayables, excluding unrelated advances | 230.09 |
| unverifiedParties | 2 |

The four expenses cover Cash, Bank Transfer, different categories, one category with
different payees and duplicate external references. Duplicate expense references are
permitted by Express; only command keys determine duplicate submission behavior.
Expense posting changes documents/audit/commands only: stock, lines, both journals and
v1_control are equal to their before snapshots.

## Filters, balances and historical identity

Register cases cover inclusive From/To dates, individual days, type, party/payee,
official/external/cheque/original-return references, combined filters, no matches,
Unicode whitespace, literal string "0", empty unknown filters, invalid dates, invalid
types, excessive text and unsupported fields. All response keys/types match Express.
Expense category stays in document payload; the source register presents expense
description/payee without inventing a new category field or filter.

As-of 2020-01-02, receivables are 160.05 and payables 250.10. As-of 2020-01-03 they
are 143.99 and 230.09. These journal-derived balance totals remain independent of
type/party/reference event visibility. The separate overview net balance fields keep
the original net-including-advances convention; they are not redefined as gross debts.

The client day-two ledger brings forward 140.05 and closes at 143.99. Hiding every
visible row with a reference filter retains the same brought-forward balance, debit,
credit and closing totals. Client/vendor advance ledgers, date/reference combinations,
stock movements, overview, original challan/return details and reconciliation compare
exactly. No report restarts balances from filtered visible rows.

PHP compatibility corrections found by these cases preserve source semantics:

- "0" is a real nonempty search/reference/description value, not PHP-falsey data.
- Register filter validation preserves source fieldErrors and ECMAScript trimming.
- Invalid ledger date "0" is rejected instead of silently ignored.
- Reconciliation requires positive expense/payment amounts; zero evidence raises the
  source's 400 INVALID_AMOUNT. Valid string "0" metadata is not classified as empty.
- Source numeric-JSON evidence coercion is preserved observationally; all resulting
  monetary arithmetic still uses Brick Math integers. Posting validation stays strict.

## Reconciliation evidence

Thirty-three reversible probes span all thirteen document kinds and lines, movement,
projection, party-journal, audit and command evidence. Twenty-seven yield exact source
mismatch lists; two zero-amount probes yield source error responses. Four source blind
spots remain matched true and are documented in
[PHP-6-RECONCILIATION-FINDINGS.md](PHP-6-RECONCILIATION-FINDINGS.md). All probes are
observational, restore their original synthetic rows, and end in matched reconciliation.

## Actual browser print and Excel observations

Each runtime passes 26 checks through Apache TLS, PHP FastCGI, Laravel, MariaDB and
the unchanged compiled React dashboard. The integrated UI creates parties/openings,
stock/challan/return, client receipt/cheque reversal, purchase/vendor payment and
Cash/Bank Transfer expenses. It checks paid-only errors, cancellation, unchanged
client/vendor ledgers and inventory, Company Transactions filters/totals, ledgers,
stock reports and matched reconciliation. Zero JavaScript errors occur.

The browser expenses total 69.12. Type/reference/date filtering selects the Cash
expense and 12.34 recorded/paid totals, while account balances retain their coverage.
The actual native downloads are:

- UPMS-Company-Transactions.xlsx: filtered row, exact 12.34 and approved company/report
  metadata verified in worksheet XML.
- UPMS-CLIENT-ledger.xlsx: exact receipt 30.01 and combined closing balance 60.08.
- UPMS-stock.xlsx: unchanged bottle identity and 101 bottles after integrated activity.

Downloads are real Chrome blob downloads, with XLSX ZIP signatures, worksheet XML and
expected values checked. Tests use a normalized native Windows path and browser-level
download session; no application/export code changed. The existing minimal XLSX writer
uses inline text, numeric monetary cells and frozen headers; no new backend export API
or spreadsheet recalculation was introduced. Native Microsoft Excel was not launched.

Existing register and posted-expense Print actions are exercised, followed by actual
Chrome A4 PDF rendering. PDFs and XLSX files are private ignored test artifacts; byte
counts and SHA256 hashes are committed in [machine evidence](PHP-6-EVIDENCE.json).
The unchanged generic React detail heading falls back to "Draft {id}" for an expense
without an official number even when its status is POSTED; the paid amount/status and
external reference are correct. This existing source UI copy quirk is preserved,
not hidden by inventing an expense number. A separately reviewed label correction can
be considered with PHP-7 report/download integration.
All filter/print/export/reconciliation activity after report entry sends no business
write requests. PHP-7 still needs public inquiry delivery and any broader report/
download acceptance required for reviewed cutover. PHP-8 hosting validation remains pending.
