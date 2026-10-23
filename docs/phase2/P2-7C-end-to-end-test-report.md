# P2.7C full-system synthetic E2E report

Status:23 automated scenario checks passed in isolated upms_test_p27c_uat_20261023_02 on127.0.0.1:3309. Demo URL http://127.0.0.1:3108/management is usable with four generated private demo accounts.19 independent role/navigation/login/logout responsive browser checks pass at390px/1440px, with no page or console errors. Manual owner UAT remains NOT YET EXECUTED.

The seeder uses supported identity/bootstrap, master, policy, inventory, purchasing, sales, receipt, cheque, return, credit and expense services/APIs. Settled synthetic funds are explicitly numbered/audited money-journal entries with actual database identity guard and balance compare-and-swap; never an unexplained balance assignment. Demo funding is an operator-only tool excluded from deployment routes/package. There is no production activation or external communication.

| Journey | Executed evidence/result |
|---|---|
| A Identity/masters/policies |Four enabled roles, customers/vendors/items/accounts/categories, synthetic period/cutoff/prefix contracts|
| C Procurement/payables |Raw receipt20, manual invoice2000; payments500+1500, vendor payable0|
| B Production/stock |Consume5 raw; raw15; bottleA available80, damaged1, quarantine0; bottleB50|
| D GST/NON_GST sales |GST20000 and10000; NON_GST5000, classifications remain separate|
| E Customer receipts |GST5000 allocates3000+2000; NON_GST1000 allocates1000; accounts credited once|
| F Cheques |8000 clearance applies5000 with3000 unapplied;7000 dishonour reverses initial and later applications atomically|
| G Physical returns |Receive/quarantine3, inspect2 available and1 damaged; no automatic financial credit|
| H Credit notes |Price1000, manual return credit250, paid-challan credit300 creates surplus; no money refund or stock double effect|
| I Expenses |Utility12000 paid5000+7000; transport1500 immediate; maintenance25000 Admin-approved unpaid|
| J Reconciliation/security |Shared purchase/stock/money/customer/receipt/cheque/return/credit/expense reconciliation matched; idempotency and policy/role/overpay negative cases deny unauthorized effects|

Final expense dashboard recorded38501, paid13500, outstanding25001 (includes intentional1-unit idempotency scenario). GST issued34000, credits1550, net sales32450, applied14000, gross unpaid18750, unapplied3000, overpayments300, net position15450. Expense obligations are separate from vendor/customer balances. The detailed expected dataset and document IDs are in the owner guide.

Private authoritative evidence: uat-02-e2e.json and timestamped uat-02-health/browser receipts under server/.local/p27c, screenshots under tmp/w06/p27c/uat-02. The initial E2E receipt's ids retain creation-time DRAFT response objects; read-only health snapshots query actual final database states and are authoritative. The guide explains this distinction. UAT01 is preserved after early seed failure; it is not the active environment. UAT03 is reserved for a new owner-requested rebuild; no populated schema is reused.

Only exact UAT01/02/03 names with matching explicit authorization flag and actual database identity are accepted. Main upms cannot pass those guards. Runtime authenticates with109 restricted table scopes; demo has independent session secret/cookie and disabled SMTP/gateways. Passwords are DPAPI-encrypted locally and obtained only through the owner-run clipboard helper. Owner manual actions may change the seeded balances; health reports actual state without resetting them.

Real-policy scenarios remain blocked: historical openings/imports, official spending/deficit rules, backdating, tax/withholding, reversals/refunds and correction financial effects. Technical/demo readiness is separate from real-policy acceptance and manual sign-off. No merge, deploy or P2.8.
