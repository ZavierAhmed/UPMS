# Shared transaction flow

```mermaid
flowchart TD
 A[Authenticated command + durable key] --> B[Identity guard and all current permissions]
 B --> C[Business guard and durable replay check]
 C --> D[Cheque state, policy, exact source and approval checks]
 D --> E[Lock scoped credit, challans and ordered money balances]
 E --> F[Shared batch, effect claims and immutable journals]
 F --> G[Update current projections]
 G --> H[Number + immutable event + audit + durable response]
 H --> I[Single COMMIT]
 I --> J[ACK loss: retrieve same durable command outcome]
```

Receipt uses existing customer-money-credit. Clearance uses cheque-holding-clearance and cheque-bank-clearance. Dishonour uses cheque-holding-dishonour; source customer and allocation compensations have distinct effect claims. All money_journal deltas/before/after/version arithmetic remains exact decimal/BigInt. No unrelated bank balance subsystem or general ledger is added.
