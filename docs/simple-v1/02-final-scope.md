# Final V1 scope

One configured administrator operates finished-bottle masters, clients/vendors, explicit openings, production/purchase stock-in, non-tax delivery challans and account-level payments. Stock uses whole bottles; money uses exact PKR cents. No BOM, raw-material deduction, production costing, GST classification, staff administration, approval queues, custody dashboard, returns inspection, credit-note module or expense accounting is active in V1.

All eleven navigation entries have implemented reads/forms/actions. Settings shows actual company/currency/unit/cutover state and next number, runs read-only reconciliation and changes the operator password using the existing secure endpoint. Existing company import and numbering activation remain blocked rather than exposing unsafe reset controls.

Payment methods are CASH/BANK_TRANSFER and immediate-credit CHEQUE_RECEIVED for clients. Methods/references are recorded explicitly; V1 does not manage cash/bank account balances or automatically allocate to individual challans. Unique payment/invoice references prevent independent-key duplicates. Ordinary actions need no second approver. Finalization asks the operator to confirm the transaction and stock/ledger impact.
