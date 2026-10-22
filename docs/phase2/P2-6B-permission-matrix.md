# Cheque authority

| Action | Accounts | Administrator | Sales/Dispatch | Inventory |
|---|---|---|---|---|
| Read cheque financial details/reconcile | Yes | Yes | No | No |
| Receive/deposit/clear/request dishonour | Yes | Yes | No | No |
| Approve/reject/post dishonour | No | Yes | No | No |
| Accept synthetic policy | No | Yes | No | No |
| Sanitized classified receipt status | Existing ledger read | Yes | Existing ledger read | No |

Nine additive cheques.* permissions. Receipt posting also requires current customer receipt/allocation/money authorities; clearance/dishonour require current money posting authority. Additional permissions are checked before idempotent replay. Server-side role/approval checks apply independently of hidden UI buttons. Existing session/CSRF/origin defenses cover every route. Sales projections expose only classified status, customer credit and compensation links, without custody/bank account data or private bank evidence.
