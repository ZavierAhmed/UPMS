# Receipts and cheque interaction

Original receivable debits and receipt allocations stay immutable. Effective allocations are original allocations less approved cheque allocation reversals. Credit notes are separate sales adjustment events, never receipt credits or money movements. Receipt allocation validates credit-reduced current outstanding and immutable settlement evidence before writing; no new allocation can exceed outstanding.

With original 20,000, cheque allocation 15,000 and credit 3,000, outstanding is 2,000. Dishonour appends the existing receipt/allocation compensation, recomputes the affected challan from immutable events and leaves the legitimate credit untouched: outstanding becomes 17,000. When a fully paid cheque had created a 3,000 credit surplus, dishonour removes that surplus and restores only 17,000 receivable. Multiple allocations for the same challan are reversed first and the projection is recomputed once.

Receipt/credit and dishonour/credit races use identity → business guards. A credit with a changed settlement version fails stale and needs renewed approval. If the credit wins, dishonour applies to the latest legitimate correction. Receipt credit remaining, receipt totals, holding/bank journals and cheque timelines retain their existing meaning. No allocation is silently unlinked, refunded or reassigned.
