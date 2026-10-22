# Read-only reconciliation

Each posted receipt must have one matching classified customer credit and one eligible positive money event. Source document/version, batch/effect keys, official number and receipt audit must exist. Receipt amount equals initial applied plus initial unapplied; current remaining equals original received less all initial/later allocations.

Allocations must match receipt and challan customer/classification/currency. Current outstanding must equal immutable original less valid allocations and remain nonnegative. Receipt totals must equal immutable received credits and all applied allocations; unapplied equals received minus applied and cannot be consumed twice. Gross unpaid and signed net position use the same components. Original issued-debit projections still reconcile with original positive debit journals.

Money balances reconcile against the combined immutable journal, including purchasing and receipts. Receipt reconciliation exposes full financial evidence only to authorized Accounts/Administrator. Sales reconciliation includes classified settlement consistency without exposing receiving-account fields; Sales ledger history shows authorized receipt status and sanitized allocations. Inventory has no receipt/financial APIs.

Findings are returned with `repairPerformed:false`; nothing is silently rebuilt. Synthetic SQL intentionally alters a remaining-credit projection inside a rolled-back owner transaction and verifies mismatch/no repair, then clean reconciliation. Opening/import, reversals, refunds and cheque events need future explicit reconciliation contracts.
