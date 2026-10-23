# Atomicity and independent reconciliation

Lock order remains identity guard -> business guard -> durable command -> source/allowance and receipt projections -> deterministic item/condition balances -> shared sequence. Global coordination conservatively serializes exposed writes. A physical receipt locks the source-line cumulative claim; request-line and original dispatch limits are both checked inside the same transaction. Inspection snapshots receipt remainder/version; approval does not bypass that check at posting.

Durable actor/operation/key plus canonical payload hash prevents duplicate effects and changed-input replay. Three bounded whole-transaction retries handle real deadlock/lock timeout. A lost COMMIT acknowledgement never triggers blind posting; retrieve the durable result with the same key. Process restart uses persisted evidence.

Independent returnReconciliation verifies posted challan/class/customer/version/hash, exact dispatched line and snapshot, request/receipt links and bounds, receipt movements/remainder, cumulative source allowance, approved disposition and paired condition movement arithmetic, original payload/line snapshots, number/audit/batch/effect claims and absence of return-origin customer/cheque/vendor/money effects. Shared stock reconciliation includes all modules. No repair operation.

Database constraints add positive/nonnegative quantities, upper bounds, exact disposition sums, before/after movement arithmetic, source FKs and unique effect/source claims. Projections are mutable under locks; sources, policy contracts, inspections, movements and receipt/disposition evidence have append-only runtime grants. Administrator-level DB tampering is outside runtime immutability; reconciliation detects inconsistencies rather than silently rebuilding caches.

Posting additionally verifies cached cumulative allowance against immutable physical receipt totals, and receipt remainder against immutable posted dispositions. A discrepancy blocks posting instead of trusting or repairing a corrupted projection.
