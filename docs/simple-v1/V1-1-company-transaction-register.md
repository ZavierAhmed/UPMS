# Company Transaction Register

Accessible from Ledgers and Reports and via its sidebar shortcut. Canonical source is POSTED v1_documents, sorted date then immutable numeric ID. One purchase row represents its stock and financial evidence; journal rows are not independently appended. Drafts/cancellations excluded.

Includes stock/party openings, production, purchases, challan sales, both payments, stock/opening corrections, payment reversals and paid expenses. Human-readable event/effect classifications distinguish obligations, payments, sales, inventory and corrections. The source ID opens immutable details. Stock amounts remain zero with quantities separate. Correction/reversal rows retain their source links; opening-correction amount is the replacement target, not a cash movement.

From/to/type/party-payee substring/reference filters apply to event rows and event totals. Sales/purchases/receipts/vendor payments/expense recorded/expense paid are distinct totals. Immediate-paid purchases contribute once to purchases and once to the separately labeled payment summary without a duplicate event. Reversals are separately classified; payment totals describe gross original payments, not net bank movement.

Client receivables and vendor payables are independently computed from verified signed party journals as of To (or present), across all parties regardless of reference/type filters. Advances do not offset other parties. The coverage label and unverified-opening count are displayed. No cash-in-hand, mixed grand total or combined-party running balance exists.

Synthetic owner fixture: sales4000; purchases5000; client receipts5000; vendor payments3000; expenses recorded/paid123.45; client receivable19000; vendor payable12000; production1000 bottles. Stock1300. Every source is synthetic.
