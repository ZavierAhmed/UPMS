# Cheque state and custody

```mermaid
stateDiagram-v2
 [*] --> RECEIVED: atomic receipt credit + pending holding
 RECEIVED --> DEPOSITED: bank deposit evidence
 DEPOSITED --> CLEARED: holding debit + bank credit
 RECEIVED --> DISHONOUR_PENDING_APPROVAL: exact return request
 DEPOSITED --> DISHONOUR_PENDING_APPROVAL: exact return request
 DISHONOUR_PENDING_APPROVAL --> DISHONOUR_PENDING_APPROVAL: Administrator approves exact request
 DISHONOUR_PENDING_APPROVAL --> RECEIVED: rejection restores prior received state
 DISHONOUR_PENDING_APPROVAL --> DEPOSITED: rejection restores prior deposited state
 DISHONOUR_PENDING_APPROVAL --> DISHONOURED: approved compensation
```

Deposit is required for clearance. Receipt-to-clearance, partial clearance, post-clearance bank reversal, replacement and re-presentation are unsupported. Each transition appends hashed evidence with actor/document/state-version and audit. Only cheque_states is a mutable projection. Rejection changes no money/customer balances and retains the rejected request. Review freezes additional applications of the pending credit; approval binds the dependency snapshot.
