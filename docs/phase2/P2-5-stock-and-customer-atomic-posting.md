# One stock/customer posting transaction

```mermaid
sequenceDiagram
  participant Sales as Authorized Sales/Dispatch
  participant Tx as P2.2 coordinator
  participant Stock as Shared P2.3/P2.4 stock service
  participant DB as MariaDB
  Sales->>Tx: Draft version, justification and durable key
  Tx->>DB: Begin; identity/business guards; current authority; command claim
  Tx->>DB: Validate customer, independent policies, date and starting state
  Tx->>Stock: Aggregate repeated item requirements; lock AVAILABLE balances
  Stock->>DB: Check exact precision and nonnegative result
  Tx->>DB: Unique posting batch and source effects
  Tx->>Stock: Immutable dispatch journal and common balance projection
  Tx->>DB: One customer debit and challan outstanding
  Tx->>DB: Official number, POSTED, audit and durable result
  alt Every effect succeeds
    Tx->>DB: COMMIT once
  else Any validation or write fails
    Tx->>DB: ROLLBACK everything
  end
```

The existing coordinator retains identity → business → command → resources → sequence ordering and global guards. No second inventory/accounting engine or independent customer transaction is introduced. Customer balance is locked before deterministic item/condition locks. One batch binds document/version/action; effect claims bind each source line and the one receivable event. Number allocation remains inside the same successful transaction.

`inventory/stock.js` remains the shared lock/projection path for production, consumption, purchases and dispatch. The additive movement catalogue maps CHALLAN_DISPATCH to its immutable typed journal. No historical ENUM is modified. The common stock balance is the projection of all three journals. New external movement IDs never masquerade as old inventory IDs: history namespaces them and the old nullable last-movement FK is cleared for external effects; exact balance version/source evidence resides in the typed journal.

Only AVAILABLE finished stock is debited. Repeated lines are summed before checking availability. Quarantine/damaged quantities do not cover shortage, and Administrator has no stock deficit exemption. Purchases of finished goods and independently produced bottles use the same item/condition balance; no production/material consumption coupling is added.

Authoritative arithmetic imports P2.4 `purchases/amounts.js` and P2.3 `inventory/quantity.js`; no money parser or rounding algorithm is duplicated. Supported option: rate6, money2, positive exact quantities/rates and half-up per line, subtotal sum of rounded lines. Currency/precision/rounding remain explicit operational acceptance gates. Overflow/zero-rounded or excess-precision input fails before SQL rather than silently rounding.
