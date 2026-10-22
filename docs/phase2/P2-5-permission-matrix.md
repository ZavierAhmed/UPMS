# Sales backend authority and privacy

| Explicit permission | Administrator | Sales/Dispatch | Accounts | Inventory |
|---|---|---|---|---|
| sales.challans.read | Yes | Yes | Yes | No |
| sales.challans.create / post | Yes | Yes; direct ordinary posting | No | No |
| sales.challans.correct.request | Yes | Yes | No | No |
| sales.challans.correct.approve / post | Yes, plus Administrator role for sensitive action | No | No | No |
| customers.ledger.read / balances.read | Yes | Yes | Yes | No |
| sales.reconcile.read | Yes | Yes | Yes | No |
| sales.configure / customers.activate | Yes, plus Administrator role | No | No | No |

The new migration freezes eleven permission keys and these role grants. It does not alter old seeds, user assignments, passwords or sessions. Ordinary Sales posting has no generic approval check. Correction decisions require the distinct explicit permission and role, then shared approval binding/current authority checks. Durable posting replay still checks current posting authority before returning its result.

All APIs inherit live SQL sessions, first-login rotation, verified Origin, CSRF, no-store, noindex and controlled errors. Navigation hiding supplements backend enforcement. Inventory direct document/item/customer/ledger requests are denied; common stock history contains quantities/condition/source number and a stock-only explanation, no customer/rate/amount fields. Accounts can inspect financial evidence without posting merely because it belongs to Accounts.

Nine exact table scopes are added. Lines, journals, challan outstanding, policies, typed document identities and proposal claims are SELECT/INSERT only; only customer tracking/balance projections are updateable. No new global, DDL, DELETE or delegation privilege. Technical movement-catalogue access remains SELECT-only for runtime; migration tracking remains operator-only.
