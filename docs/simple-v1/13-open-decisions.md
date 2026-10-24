# Open decisions and limits

Owner visual review/manual UAT remain pending. Real-company import, stock/party openings and next real challan number need owner-reconciled source evidence and a separate cutover review. Synthetic acceptance does not validate company history. No silent GST/NON_GST merge is supported.

The A-block limit is conservatively DC-A9999; any later rollover is blocked pending an approved convention. Financial correction of purchases/challans and opening correction after activity are intentionally blocked. Supported corrections are explicit pre-activity opening replacement, nonfinancial stock delta and payment reversal; none delete original evidence.

V1 records payment methods/references at account level and does not maintain cash/bank account balances or automatically allocate receipts to challans. Client cheque credit is immediate; dishonour creates an explicit reverse entry. If account-level payment policy is unsuitable for real use, review it before company cutover.

Whole bottle quantities only. Reports read complete small-business histories for exact running balances/exports; very large histories will need server pagination/streaming that retains brought-forward context. Current Stock is not a historical stock-as-of report; dated movement reports are available. Drafts survive internal navigation in browser memory, with exit warnings; browser shutdown does not persist an unsaved form. Saved drafts are durable and editable.

No live V1 enablement exists for protected main. Legacy mode remains available for historical/regression use, but V1 runtime credentials cannot access its business tables. MariaDB compatibility is tested; Oracle MySQL is not certified. No merge, deployment, old module deletion or P2.8 work is included.
