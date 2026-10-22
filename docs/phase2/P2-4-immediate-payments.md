# Immediate and deferred payments

```mermaid
sequenceDiagram
  participant User as Authorized Accounts
  participant Tx as P2.2 coordinator
  participant Stock as Shared stock service
  participant SQL as MariaDB transaction
  User->>Tx: Exact draft version, payment intent, durable key
  Tx->>SQL: Identity/business guards, claim command, validate policy
  Tx->>SQL: Invoice gross payable and outstanding
  Tx->>Stock: Validate tracking; lock and receive quantity
  Stock->>SQL: Immutable receiving journal and balance projection
  Tx->>SQL: Linked payment document/batch; explicit allocation
  Tx->>SQL: Vendor debit and authorized money debit
  Tx->>SQL: Numbers, source state, audit, durable result
  alt Every effect succeeds
    Tx->>SQL: COMMIT once
    Tx-->>User: Durable committed references
  else Any effect fails
    Tx->>SQL: ROLLBACK all effects and number candidates
  end
```

Immediate payment creates a first-class linked PAYMENT document (`IMMEDIATE_PAYMENT` relation), its own unique source batch, official number, allocation, vendor debit and money outflow in the same outer transaction as purchase stock and gross payable. No expense is created. A pending invoice cannot be paid. Payment cannot exceed confirmed gross. Synthetic example 50,000 gross / 20,000 paid produces exactly 30,000 outstanding and 20,000 account decrease.

Deferred payments use their own versioned document with one account/instrument reference and explicit invoice allocations. Full/partial/multiple payments use the same settlement service. Allocation amounts must be positive and sum exactly to payment; all targets must be eligible same-vendor invoices within outstanding. Money availability/exception, live permissions, period, cutoff and current policy are rechecked before committing. Surplus/unallocated advances are unavailable.

The coarse identity/business guards remain intact; invoice IDs and stock item/condition locks are deterministic. Immediate child creation occurs inside those global guards and the same transaction, never an independent payment transaction. COMMIT ambiguity returns `COMMAND_OUTCOME_UNKNOWN`; retry the unchanged key to retrieve the durable result, including after process restart. A different key cannot repost an already posted source. Any payload change under the same key conflicts. UI retains failed command keys for unchanged retries and source uniqueness remains authoritative across refreshes.
