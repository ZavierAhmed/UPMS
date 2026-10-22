# Read-only classified reconciliation

Each customer/classification/currency projection is compared with the sum of its classified journal, separately. Every outstanding challan is compared with its current immutable classified revision, base lines, manual GST, final original/unpaid amount and single scoped debit. Stock movements retain shared three-journal reconciliation and line quantity checks; source batch/effect references are verified.

Missing projections, wrong scopes, arithmetic differences, orphan journal evidence, unexpected unclassified history or unclassified posted sources produce investigation findings. Nothing is repaired. Legacy counts are reported separately and never added to both classified balances.

SQL foreign keys prevent a GST journal from referencing a NON_GST challan scope; exact CHECK constraints reject inconsistent receivables. Acceptance intentionally tampers with an isolated projection inside a rolled-back owner transaction, confirms detection/no repair, and then confirms clean reconciliation. Future receipts need their own classified reconciliation rules; none are inferred here.
