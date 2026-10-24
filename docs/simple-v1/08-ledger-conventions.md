# Excel-style ledgers and reports

Columns: Date, Particulars, Reference, Debit, Credit, Balance. Exact signed balance = cumulative debits − credits, ordered by business date then immutable journal ID. Client sale/opening receivable debits; client receipt/opening advance credits. Vendor payable/purchase credits; vendor payment/company advance debits. Thus a vendor payable appears negative (credit) and a payment moves it toward zero.

Date filters compute opening brought forward from all prior immutable entries. Running balances retain chronological context. Reference search hides rows without restarting balances or changing whole-date-range debit/credit/closing totals; coverage is labelled. Unverified openings are explicitly flagged. Source links return to the selected account. No JSON, hash, batch key or internal event key appears in ledger cells.

All eight reports are implemented: current stock, dated movements, sales/challans, purchase/stock-in, client ledger, vendor ledger, client payments and vendor payments. Current Stock explicitly disables date inputs; dated history belongs to Movements. Bottle quantities and PKR amounts have distinct headings/totals. Print uses native table layout. XLSX exports preserve displayed ledger totals, explicit opening and closing rows; arbitrary text is inline text, not a formula. Full histories are used for correct balances rather than truncated pages.

Payment policy: account-level entries, no automatic challan allocation; methods/references only, no cash/bank account balance. Independent reconciliation derives stock/ledger effects from immutable source payloads/lines and verifies projections, numbering and audit; it never repairs discrepancies.
