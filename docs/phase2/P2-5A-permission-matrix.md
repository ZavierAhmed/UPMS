# Classified authority and privacy

| Action | Administrator | Sales/Dispatch | Accounts | Inventory |
|---|---|---|---|---|
| Ordinary challan draft/direct post | Yes | Yes | No | No |
| Manual GST entry | Yes | Yes, synthetic policy only | No | No |
| View both classified ledgers | Yes | Yes | Yes | No |
| Request correction | Yes | Yes | No | No |
| Exact correction approve/reject | Yes, explicit permission and role | No | No | No |
| Policy/scoped opening authorization | Yes | No | No | No |
| Correction posting effects | Blocked | Blocked | Blocked | Blocked |

New explicit permission: `sales.gst.enter`. Ordinary dispatch retains P2.5 permissions. All endpoints inherit session, rotation, Origin, CSRF, live authorization, no-store and noindex controls. Accounts view authority grants no posting rights. Inventory cannot obtain classified financial APIs; shared stock history contains only stock evidence and a neutral dispatch reason, with no customer/rate/GST/amount fields.

Runtime grants are exact table scopes: classified snapshots/journals/outstanding/policies SELECT/INSERT; scoped tracking and balance projections SELECT/INSERT/UPDATE. Four old financial tables become SELECT-only. New permission seeds change no users, passwords or sessions. Durable replay checks current base and GST authority before returning results.
