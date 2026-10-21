# Permission matrix

Every endpoint inherits P2.1A live database-backed sessions, first-login rotation, Origin checks, CSRF for mutations, no-store responses and controlled errors. There is no public business API. Every master read/write checks its explicit action permission and every write checks it again under the transaction guard.

| Permission group | Administrator | Inventory | Sales/Dispatch | Accounts |
| --- | --- | --- | --- | --- |
| Inventory masters read | Yes | Yes | Yes | Yes |
| Inventory masters write | Yes | Yes | No | No |
| Customer contacts read | Yes | No | Yes | Yes |
| Customer/vendor write | Yes | No | No | Yes |
| Vendor information read | Yes | No | No | Yes |
| Money-account/expense masters read/write | Yes | No | No | Yes |
| Document-type, period and policy configuration | Yes | No | No | No |
| Approval authority | Separate explicit permission | No default | No default | No default |
| Business audit history | Yes | No | No | No |

Authoritative definitions: `server/src/business/catalog.js`; additive migration seeds these exact role-permission links. Existing identity roles and user assignments are unchanged. No balance fields exist, and Inventory/Sales cannot access money-account metadata or vendor details. Resource manifest filtering is supplementary; direct API denial is tested.

Master APIs are GET/POST/PATCH under `/api/v1/management/business/masters/:resource`. There is no DELETE. Settings, period creation/closure, cutoff proposals, read-only approvals and restricted audit are separate authenticated routes. No stock, payment, sale, purchase, document-posting or number-issuance API exists.

Runtime has exact per-table rights: 9 existing identity application tables plus 27 business tables. No new DELETE privilege, schema-wide/global grant, DDL, FILE or delegation is added. Audit/history/number issues/policy history/links/events/batches/effects/classifications are append-only for runtime. Migration tracking remains operator-only. Existing broad wildcard accounts were fingerprinted and preserved rather than reused as the application identity.
