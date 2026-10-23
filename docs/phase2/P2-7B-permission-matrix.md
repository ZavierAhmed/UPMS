# Credit permissions

| Role | Read financial notes | Create/submit | Approve/reject | Post | Reconcile | Configure |
|---|---|---|---|---|---|---|
| Administrator | Yes | Yes | Yes | Yes | Yes | Yes |
| Accounts | Yes | Yes | No | No | Yes | No |
| Sales/Dispatch | Yes | Yes | No | No | No | No |
| Inventory | No | No | No | No | No | No |

The seven credits.* permission codes are enforced in services and HTTP routes. Current-session permissions are checked before durable result replay. Shared business approval additionally requires current administrator authority. Inventory physical evidence APIs remain sanitized. CSRF and management-origin enforcement apply to every mutation. Runtime receives SELECT, INSERT only on all five new tables; it cannot rewrite policies, typed sources, duplicate claims, posted values or financial journals. Dedicated migration/owner profiles are never exposed to runtime/browser processes.
