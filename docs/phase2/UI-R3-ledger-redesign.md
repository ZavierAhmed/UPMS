# Customer ledger redesign

`/management/customer-ledgers` separates financial accounts from `/management/customers`. The previous `/management/sales/customers` deep link redirects after authorization. Customer and GST/NON_GST selection remain explicit and separate.

Eight position cards display authoritative issued sales, approved credits, net sales receivable, receipts, gross unpaid, unapplied credit, overpayments and net position. No client arithmetic or invented running balance was introduced. Transaction rows distinguish challan debits, receipt credits, credit notes, cheque receipts and dishonour reversals. Custody/clearance does not duplicate customer credit. Each receipt retains its remaining unapplied amount.

Tabs, date/reference/type filters, challan load-more and source links support investigation. Source details return to the selected ledger. Existing bounded ancillary history (100 records) is disclosed; an unavailable reversal date says See source and is excluded from date-filtered results. A source-reference search trusts the server's matching challans. Amount formatting changes presentation only.

Challan descriptions also show authoritative current outstanding; this preserves the original exact108.00/80.00 receipt-browser financial assertions. Full06 passed all134 original/added cases.
