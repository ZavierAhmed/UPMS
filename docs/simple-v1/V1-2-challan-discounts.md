# Exact challan pricing and discount contract

Modes are NONE, FIXED PKR, or PERCENT; only one applies. NONE requires zero entered discount. Inputs use at most two decimal places, never binary floating point. Negative values, fixed reductions above subtotal and percentages above100 are rejected.

Subtotal is the sum of whole quantity multiplied by each immutable rate in cents. For a percentage expressed in hundredths, discount cents = floor((subtotalCents * percentHundredths +5000)/10000). This is positive half-up rounding to the nearest paisa. Example25PKR *0.02percent produces0.01PKR reduction. Final = subtotal minus discount. Zero-final drafts can be reviewed, but posting is blocked pending owner policy; no real zero-total/free sales are enabled.

The server calculates draft discountSummary and recomputes it during posting. Immutable source payload stores entryVersion, mode, entered value, subtotal, calculated discount and final total. Additive document columns sale_subtotal/discount_mode/discount_value/discount_amount retain independent posted evidence. A changed/tampered summary cannot silently post. Existing documents have NULL extension columns, retain original payloads and reconcile as zero discount.

For200 bottles at25 with10percent: subtotal5000, discount500, final4500. Client ledger debit and overview/sales/company-register amounts are4500. Stock journal remains minus200, independent of the discount. Discounts are sale reductions, not payments/refunds. No tax/GST calculation.

Independent reconciliation checks lines, gross subtotal, exact discount evidence, final document/ledger total and unchanged numbering. A tampered discount column is detected without repair. Delivery-note print remains the approved non-priced document: no rate, subtotal, discount or monetary total appears.
