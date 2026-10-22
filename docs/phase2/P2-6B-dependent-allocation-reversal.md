# Initial and later allocation dependencies

Every P2.6A application explicitly retains receipt_id. All initial and later allocations funded by a cheque are selected by that source, in deterministic order. Sum(allocations)+remaining must equal original cheque amount before request/post. The request snapshots the complete set; later application posting locks/checks cheque eligibility under the same coordinator guards, so pending/dishonoured credit cannot fund further application.

For20000 received,5000 initial and10000 later allocation: append two allocation compensations totaling15000, restore their exact challan outstanding amounts, remove5000 remaining credit and append20000 credit reversal. No new bank debit/credit. Each compensation uniquely references the immutable allocation. Projection updates never exceed original challan amount or reverse unrelated receipts. Repeated target challans across different applications are handled cumulatively.

Corrections/refunds/transfers remain disabled. Ambiguous linked correction, stale dependency or arithmetic mismatch fails the whole transaction; no partial compensation or automatic repair.
