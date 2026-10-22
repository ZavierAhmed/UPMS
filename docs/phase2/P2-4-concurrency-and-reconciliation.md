# Transaction consistency and reconciliation

Every exposed write uses the existing P2.2 coordinator. Identity guard → live authorization → business guard → durable command → document/resource locks → sequences remains the coarse safety protocol. No process mutex, lock weakening or independent nested business transaction is introduced. Same-vendor invoices are locked by ID; stock plans aggregate repeated lines and lock item/condition deterministically. Money balances have exact expected-version updates. Unique document/version/action batches and batch/effect and source-line keys supplement durable idempotency.

Real SQL acceptance covers competing debits to one account, concurrent settlement of one invoice, concurrent vendor credits, duplicate invoice-reference racing, receipt retry, immediate-payment/audit/stock-journal rollback, real lock timeout/deadlock, TCP-proxy COMMIT-ACK loss, changed key payload and independent child-process replay. The existing three-attempt whole-transaction retry is unchanged; ambiguous connection loss never triggers blind automatic replay.

The read-only reconciliation API operates within the identity read transaction/guard, so normal coordinated posting cannot change its dataset halfway through the report. It compares:

- Both immutable stock journals with shared item/condition balance projections; purchase source quantities against unique receiving effects.
- Invoice gross against exact rounded line totals, sole payable credit and invoice-source evidence.
- Invoice outstanding against original less allocations and invoice journal sum.
- Vendor balance against all signed vendor events.
- Payment allocations against money debits and vendor settlement source events.
- Money balance against immutable signed journal sum and account/source identity.
- Immediate payment links/amounts, posting batch/source and unique claimed effects.

Discrepancies are explicit and no cache/journal repair is performed. Negative stock is prohibited by shared service checks and SQL constraints. A negative money journal row requires an approval FK, with exact authorization additionally enforced by the service. SQL constraints are defense in depth, not a claim that a database administrator cannot tamper. Read reports currently scan journal history in-process; pagination/aggregate reporting and production workload capacity require later review.
