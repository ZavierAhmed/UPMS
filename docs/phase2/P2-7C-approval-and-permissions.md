# Expense approval and permissions

| Role | Read/draft/record/pay | Category management | Restricted approval | Correction request | Correction approval/post permission | Configure |
|---|---|---|---|---|---|---|
| Accounts | Yes, accepted policy | No | No | Yes | No | No |
| Administrator | Yes | Yes | Yes | Yes | Yes; effects blocked | Yes |
| Sales/Dispatch | No | No | No | No | No | No |
| Inventory | No | No | No | No | No | No |

Twelve additive expenses.* permissions separate recording, payment, categories, approval, corrections, reconciliation and configuration. Every mutation uses current-session authorization before durable replay; payment additionally requires money.transactions.post. Categories are administrator-managed with versioned updates, immutable code identity and before/after audit. No operational categories are seeded by migration.

The default synthetic threshold is15000 only in explicit acceptance/UAT setup, not a real company spending rule. Approval binds the exact source payload/version/hash, line category IDs/versions, total/currency, payee/evidence, account and expected balances where relevant. Only an administrator may decide. Shared validateApproval retains its original default business.approve requirement; the expense caller explicitly passes its current record/pay permission so Accounts can execute an administrator-approved expense. Original approver enablement, generic approval authority and current administrator expense approval authority are still revalidated. Other modules keep unchanged default behavior.

Threshold and deficit approvals are distinct. Revision or changed category/policy/payable/money state fails stale rather than bypassing review. Synthetic actual-database guards reject main even with demo flags. No main historical openings or live policy activation occurs.
