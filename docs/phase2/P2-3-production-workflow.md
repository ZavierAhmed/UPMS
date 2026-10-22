# Finished production

Inventory staff create a draft containing active finished bottle variants, exact quantities in each base unit, Pakistan business date, optional reference/remarks and mandatory reason. Save retains immutable line evidence for that version and does not change stock. Review precedes direct posting; ordinary production requires inventory.production.post and no approval.

Posting revalidates active item/unit/category, authorized initial state, quantities, owner inventory policy acceptance, current Pakistan date, approved prefix and open period. It credits AVAILABLE only. Materials, caps, seals and packing are not consumed automatically. No BOM, yield, costing or financial entry exists.

```mermaid
flowchart TD
 A[Authenticated posting request and durable command key] --> B[Lock identity guard then business guard]
 B --> C[Live permission and idempotency validation]
 C --> D[Validate exact document version and policy]
 D --> E[Lock item and condition balances in deterministic order]
 E --> F[Validate all aggregate deltas and nonnegative results]
 F --> G[Insert batch, effects and immutable movements]
 G --> H[Conditional balance updates and posted document]
 H --> I[Official number, audit and durable result]
 I --> J[Commit once]
 D -->|Any failure| R[Roll back all effects]
 E -->|Any failure| R
 G -->|Any failure| R
 I -->|Any failure| R
```

Lost COMMIT acknowledgement returns uncertain outcome; retrying the unchanged command retrieves its durable result. A new key cannot post a posted document again. The main migration is applied. Actual owner posting remains gated by explicit owner configuration and authorized item starting states.
