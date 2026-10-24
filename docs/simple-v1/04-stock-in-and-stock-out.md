# Stock In and Stock Out

`/management/stock-in/new` offers Production or Purchase, plus explicit opening and traceable nonfinancial correction. Production records date/item/quantity/reference/remarks and increases stock without material consumption or costing. Purchase accepts multiple bottle lines, vendor, manual rates and invoice reference. It atomically increases stock and vendor payable. Paid-immediately purchases require an explicit method/reference and offset the vendor debit/credit in the same transaction; no cash/bank projection is implied.

Stock is posted opening + production + purchases − finalized challans + supported correction deltas. Missing openings remain unverified. Explicit zero opening is audited. Dates before stock opening are blocked. All quantities are whole bottles and stock cannot go negative. Identity guard and stock row locks serialize competing finalizations. A failed transaction rolls back movements, lines, ledger and numbering together.

Corrections are new signed stock entries linked to a posted stock opening, production or prior nonfinancial stock correction, with date/reason/audit. Financial purchase/challan corrections are deliberately blocked in V1 until a separate atomic financial correction design is reviewed. Original movements cannot be silently edited/deleted.
