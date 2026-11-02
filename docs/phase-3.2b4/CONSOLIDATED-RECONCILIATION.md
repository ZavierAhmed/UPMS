# Independent consolidated reconciliation

All figures below are synthetic PKR; bottle counts are whole units. `scripts/p32b4-consolidated.mjs` creates a fresh positively identified loopback MariaDB fixture, enables the V1.2 interface and executes the real PHP HTTP kernel. It uses explicit scenario constants and BigInt integer cents for expected effects. It never derives expected amounts from application endpoints. After each of 18 checkpoints it compares nine expected quantities with PHP reports, and independently sums the actual stock, party and money journals.

| Operation | Independently calculated effect |
| --- | --- |
| Verified openings | 100 bottles; customer +10.11; vendor −20.22; Haris 1000.31; Junaid 200.42; UBL 3000.53; nonspendable cheque custody 40.64 |
| Finished production | +17 bottles, no party/money effect |
| Paid purchase: 3 × 4.17 | +3 bottles, UBL −12.51, no remaining vendor payable |
| Credit purchase: 5 × 4.19 | +5 bottles, vendor −20.95, no money effect |
| Delivery: 7 × 7.13 | −7 bottles; customer +49.91; sales +49.91 |
| Existing sales return: 2 × 7.13 | +2 bottles; customer −14.26; net sales −14.26; original delivery retained |
| Existing nonfinancial correction | −1 bottle linked to original production; no money/party effect |
| Ordinary partial receipt | Customer −13.27; Haris +13.27 |
| Ordinary full remaining receipt | Customer −32.49; UBL +32.49; customer balance zero |
| Vendor payment | Vendor +11.37; UBL −11.37 |
| Actual cash transfer | Haris −23.41; Junaid +23.41; no party/expense/sales effect |
| Employee-associated paid expense | Junaid −5.43; expense +5.43; immutable category/employee snapshots |
| Full return of customer's partial receipt | Customer +13.27; Haris −13.27 |
| Full vendor payment returned | Vendor −11.37; UBL +11.37 |
| Full expense refund | Junaid +5.43; expense −5.43, same historic category/employee |
| Expense response discarded, same-key retry | Junaid −0.07; expense +0.07 exactly once |
| Over-stock delivery and custody-to-bank transfer | Both rejected; no financial change |

Final pre-backup quantities: stock **119**, customer **13.27**, vendor **−41.17** (company owes 41.17), Haris **976.90**, Junaid **223.76**, UBL **3020.51**, custody **40.64**, expenses **0.07**, net sales **35.65**. Expense gross is 5.50, refund 5.43 and net 0.07. The current-day expense-only filter is **−5.36** because the original 5.43 expense was recorded on the prior business date.

The independent restore reproduces the complete pre-backup source rows and journals, not merely matching report endpoints. The browser subsequently posts a separate full return of the original 32.49 bank receipt: expected customer **45.76**, UBL **2988.02**; stock and sales remain 119 / 35.65. Browser evidence records those independent post expectations separately from the pre-backup fixture.

All original POSTED document rows are compared byte-for-byte after the refund sequence. Canonical source/refund links, full money/audit reconciliation, expense facts and all guards are also checked. Unsupported purchase returns remain blocked without stock or money writes. Custody is not spendable. GST/non-GST ledger separation is **NOT APPLICABLE**: PHP Simple V1 has no supported tax-ledger dimension, and older Node ERP modules are not used to pretend otherwise.

See [every expected-versus-actual checkpoint](evidence/consolidated.json), [browser effects](evidence/browser.json) and [recovery](evidence/recovery.json).
