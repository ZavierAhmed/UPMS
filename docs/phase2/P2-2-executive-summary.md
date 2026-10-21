# P2.2 executive summary

Implemented locally from exact P2.1A baseline `11675eb6fb631935b52d3d728c1a98fa36ea03fc` on `feature/upms-p2-2-business-foundation`. No merge, deployment or P2.3.

P2.2 adds secure master-data management and reusable transaction infrastructure. The original administrator, password hash, role assignments, sessions and audit rows were preserved. The original identity migration is unchanged. Before main mutation, an owner-approved consistent private backup was restored into a new verification schema and all eleven original table-content fingerprints matched.

One explicit additive migration adds 27 business tables and ten permission keys. The main database now has 38 tables. Normal runtime connects as `upms_runtime@localhost`, with exact table rights on 36 application tables; migration tracking tables remain inaccessible to runtime. Existing broad wildcard-host accounts were preserved unchanged, as requested.

The private management app supports four fixed categories, configurable units and four bottle dimensions, canonical items, separate customers/vendors, money-account and expense-category masters, document-type prefixes, administrative period management, cutoff proposals, approval visibility and audit history. Stock identity is fixed after item creation, referenced unit meaning is protected, updates require expected versions, and records deactivate rather than delete.

Shared internal services provide durable command ownership/replay, bounded transaction retries, annual numbering under sequence locks, approval version/hash binding, linked references and immutable-history protections. No stock or money journals, balances, financial calculations, real document posting or opening imports are implemented or exposed. Number issuance is internal only and requires a document marked POSTED within the same outer transaction; synthetic tests alone exercise it.

Current real-SQL acceptance includes actual legacy identity execution, restricted API permissions, concurrent numbering/idempotency, rollback, real deadlocks/timeouts and a network proxy that drops an actual COMMIT acknowledgement. Browser and public/package evidence is detailed in [test results](P2-2-test-results.md). Remaining policy decisions and independent review gates are in [open risks](P2-2-open-risks.md).
