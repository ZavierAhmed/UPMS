# Immutable posted corrections

P2.3 supports partial/full inverse corrections to posted production or consumption movements. It does not implement arbitrary replacement variants, additional production, condition transfers or financial returns. Further correction semantics require business review.

```mermaid
flowchart LR
 A[Original posted document and journal remain immutable] --> B[New linked correction draft]
 B --> C[Select original movement and exact inverse quantity]
 C --> D[Submit reason and evidence]
 D --> E[Administrator approves exact version/hash]
 E --> F[Revalidate live authority, policy and current stock]
 F --> G[Cap cumulative inverse quantity against original movement]
 G --> H[Post compensating journal and new official number]
 F -->|Insufficient available stock| X[Reject without stock effect]
 G -->|Limit exceeded| X
```

The original number, payload, lines and movements never change. Corrections have their own document, number, batch, idempotency result, actor/reason and movement-to-original link. Concurrent corrections serialize under existing guards and cannot cumulatively exceed the original movement. Production inverse debits AVAILABLE and fails if insufficient; consumption inverse credits the same item/unit/condition. A correction cannot itself be the original of another correction in this implementation.
