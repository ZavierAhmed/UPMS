# Proposed manual GST contract

Proposed arithmetic: exact rounded base lines sum to a subtotal; the manually entered GST amount is added once to create one receivable debit. Synthetic example: 10,000.00 base + 1,800.00 manually entered GST = 11,800.00 in the GST ledger, with no NON_GST debit. No percentage is inferred, calculated or checked. Arbitrary exact positive manual amounts are tested.

Manual amount precision uses the existing explicit two-decimal money contract; quantity/rate/base rounding reuses P2.4 utilities. Negative, excess-precision and overflow amounts fail. GST zero is permitted for draft review/testing but posting remains blocked. NON_GST accepts only zero GST and hides the GST entry control.

Posting a GST document requires `sales.gst.enter`, ordinary posting authority, an exact saved version and `gstAmountConfirmed:true` from the review screen. The confirmation is in the durable command payload; changing it on replay conflicts. Live GST authority is checked inside the global guard before returning a saved result. No per-document administrator approval is imposed on ordinary dispatch.

The only classification activation contract is `SYNTHETIC_ONLY`, `MANUAL_ADDITION`, `SHARED_CHALLAN_SEQUENCE`, zero-GST posting false, explicit confirmation and justification. The actual SQL database name must match a fresh P2.5A test namespace; environment flags alone cannot authorize main. The UI exposes proposed status and outstanding owner decisions. It makes no legal tax-invoice or Pakistan tax-compliance claim. Real GST activation needs a later reviewed contract for tax fields, registration, amount-entry authority, calculation treatment, numbering and customer-visible documents.
