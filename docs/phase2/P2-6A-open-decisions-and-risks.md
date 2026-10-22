# Pending decisions and disabled features

Synthetic receipt workflows are locally testable; genuine owner receipts remain operationally blocked. Actual SQL database identity restricts policy/posting to fresh P2.6A synthetic namespaces. Existing P2.5A real GST compliance gates remain in force.

| Owner decision | Current behavior |
|---|---|
| Receipt/application/correction prefixes and GST/NON_GST numbering | Explicit synthetic shared-per-type choice; no inferred company prefix or split |
| Settled methods/account types | Only explicit compatible Cash/Bank/Cash-holder contracts; no cheque |
| Currency/precision, cutoff and open period | Exact explicit supported contract; no main defaults/activation |
| Customer/account historical openings | Verified scoped states required; no imports/inferred zero |
| Unapplied treatment | Explicit synthetic allocated-only or ledger-scoped credit policy |
| Cross-ledger/customer payments | Prohibited; no offsets/transfers |
| Reversal/refund/subsequent-allocation protocol | Reviewable exact Administrator correction requests; all effects disabled |
| Backdated receipts | Blocked pending policy |
| Cheque recognition/clearance/dishonour | P2.6B, not implemented |
| External reference conventions | Stored evidence; no unapproved global reference-uniqueness assumption |

No tax calculation, purchase correction, customer return, general ledger, gateway settlement, bank reconciliation or historical opening import is included. Production hosting, tax requirements, off-host backup/recovery and performance review remain outstanding. The recovered MariaDB endpoint is local development evidence; original port3306 remains unhealthy and unchanged. Stop for independent technical/business review; no merge, deployment or P2.6B.
