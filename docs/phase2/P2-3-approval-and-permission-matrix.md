# Inventory authority

| Action | Administrator | Inventory | Sales/Dispatch | Accounts |
|---|---|---|---|---|
| Stock/history/reconciliation | Yes | Yes | Read only | No |
| Create/revise ordinary drafts | Yes | Yes | No | No |
| Post ordinary production | Yes | Yes | No | No |
| Post ordinary consumption | Yes | Yes | No | No |
| Record counts/request adjustment | Yes | Yes | No | No |
| Request inverse correction | Yes | Yes | No | No |
| Approve/reject adjustment or correction | Yes, justified | No | No | No |
| Post approved adjustment/correction | Yes | No | No | No |
| Accept policy/authorize genuinely new item | Yes, explicit | No | No | No |

Thirteen new permission keys are frozen in the new migration and declared in inventory/catalog.js. Ordinary posting does not call generic business approval validation. Sensitive posting requires both current administrator role and specific permission, plus current valid P2.2 approval. Every request uses live session/account/role validation; successful replay also requires current authorization.

All management mutations retain Origin and CSRF checks. Durable command keys bind actor, operation and canonical payload. Actual SQL tests cover department API boundaries, anonymous and CSRF rejection, restricted runtime DDL/DELETE/immutable UPDATE denial, staff approval rejection and justified administrator self-approval. The exact six inventory table grants are applied to the recovered main runtime account; its total 42-table allowlist is verified.
