# Receipt authority and privacy

| Action | Accounts | Administrator | Sales/Dispatch | Inventory |
|---|---|---|---|---|
| Receipt read/create/direct post | Yes, explicit permissions | Yes | No | No |
| Allocation read/create and unapplied read | Yes | Yes | Sanitized status through existing ledger only | No |
| Customer ledger/status | Existing authority, both classes | Yes | Existing permitted class history/outstanding | No |
| Receipt reconciliation | Yes | Yes | Customer-only reconciliation through Sales | No |
| Correction request | Yes | Yes | No | No |
| Exact correction decision | No, including own request | Yes, role plus explicit permission | No | No |
| Receipt policy configuration | No | Yes, synthetic only | No | No |
| Correction financial posting | Blocked | Blocked | Blocked | Blocked |

Eleven additive receipt/allocation/configuration/correction keys are frozen in migration007. Existing `customers.ledger.read` and `money.transactions.post` are reused. Ordinary receipt posting also checks allocation-create and money authority. APPLICATION checks allocation-create without granting a second money credit. Backend session/Origin/CSRF/rotation/no-store/noindex controls remain mandatory; navigation hiding is supplementary.

Action-specific permissions are resolved inside P2.2's guarded retrying transaction before durable replay. The new optional permission resolver does not alter existing callers' permissions or lock order. It closes the receipt intent-read timeout gap and ensures revoked money/posting authority cannot retrieve an old successful financial response.

New sources/credits/allocations/policies/claims are SELECT/INSERT-only; only outstanding/remaining/totals projections gain UPDATE. Runtime receives no new DELETE/global/DDL/delegation rights. No user/department assignment, administrator credential or signing-secret rotation occurs.
