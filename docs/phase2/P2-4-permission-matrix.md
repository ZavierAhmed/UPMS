# Backend permission matrix

All private APIs retain live SQL sessions, first-login rotation, Origin/CSRF, no-store and controlled errors. Additive seeds do not modify old migrations, users, assignments or credentials.

| Explicit actions | Administrator | Accounts | Inventory | Sales/Dispatch |
|---|---|---|---|---|
| purchases.read/draft/receive/post | Yes | Yes | No | No |
| vendors.ledger.read, vendors.settlements.create | Yes | Yes | No | No |
| money.accounts.read, money.transactions.post, money.audit.read | Yes | Yes | No | No |
| purchases.correct.request | Yes | Yes | No | No |
| purchases.correct.approve | Yes; effects still blocked | No | No | No |
| purchases.configure, vendors.activate, money.activate | Yes, plus Administrator role check | No | No | No |
| money.deficit.approve | Yes, plus Administrator role check | No | No | No |
| Existing inventory production/consumption/adjustment | Existing P2.3 authority | No added authority | Existing P2.3 authority | Read-only stock |

Accounts stock receiving is confined to the reviewed purchase service, not generic production/count/adjustment APIs. Inventory/Sales can see price-free purchase stock movements through ordinary authorized stock history, without vendor ledgers/payment/account amounts. Financial record queries require financial permissions; hidden navigation is supplementary.

Purchase receive/invoice posting requires `purchases.post`; physical receipt additionally requires `purchases.receive`. An immediate payment requires both `vendors.settlements.create` and `money.transactions.post`. Deferred payment draft requires settlement authority and posting requires money authority. Posting replay rechecks current action authority before durable result retrieval. Approval authority is never inferred from department membership.

The authoritative runtime map is `server/src/purchases/catalog.js`: fifteen added table scopes, append-only journals/lines/approvals/policy/evidence, mutable balance/tracking caches. No new DELETE/global/DDL/FILE/delegation rights. The technical movement catalogue is SELECT-only. Migration tracking remains operator-only.
