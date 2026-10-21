# Delivery challans, sales, adjustments and returns

R-08–R-14 are **CONFIRMED**. Data structures, transaction mechanics and proposed validation below are designs, not implemented policy. Printed layout and tax/legal matters remain owner/accountant decisions.

## Document fields and arithmetic

Challan header: temporary ID; official posting number; business date/time; customer; selected GST or NON_GST customer-ledger ID; delivery address; vehicle; driver details; dispatch time; remarks; manual GST amount; creator/poster/timestamps; version and policy/approval references. Transport fields may record a reasoned not-applicable value where delivery method permits, subject to owner confirmation. Store restricted contact/transport details privately and snapshot labels/addresses at posting; later customer-master changes do not rewrite history.

Lines: line identity/position, finished item ID and bottle type/size/quality/colour snapshots, packing description, quantity in item's base unit, selling rate, exact-calculation basis and rounded line amount. Rates are entered by staff and retained internally even if the customer copy omits them. Proposed rate/quantity must be positive; zero-rate/free issue needs an explicit owner decision, never an implicit rounding side effect.

Subtotal is the sum of quantity × entered rate amounts using the versioned proposed rounding rule. GST classification does not select a tax rate: the GST amount is manually entered, exact fixed-decimal, ≥ 0 proposed, with entered-by and reason/evidence. A GST debit is subtotal + approved manual GST. NON_GST rejects a nonzero GST amount. An authorized ordinary challan can directly post; 'approved manual GST' means validated entered value under applicable company permission/policy, not an invented universal secondary approval requirement. Tax exceptions/adjustments may require a separate sensitive approval once confirmed. No legal tax rate, withholding or compliant invoice claim is made.

## Atomic posting

```mermaid
sequenceDiagram
  participant Sales as Authorized Sales or Dispatch
  participant API as Private management API
  participant Tx as Posting coordinator
  participant DB as MySQL
  Sales->>API: Post document version plus durable request key
  API->>Tx: Authenticated actor and validated intent
  Tx->>DB: Begin; lock policy, period, document and ledger guards
  Tx->>DB: Claim idempotency; lock all item balances in order
  Tx->>DB: Recheck permissions, quantities, unit scales and exact amounts
  alt Invalid or insufficient stock
    Tx->>DB: Roll back all changes, no issued number
  else Valid
    Tx->>DB: Deduct stock and append unique stock effects
    Tx->>DB: Insert sale debit in exactly the chosen customer ledger
    Tx->>DB: Allocate annual number; audit; POSTED; durable result
    Tx->>DB: Commit
  end
  Tx-->>Sales: Committed document or safe failure
```

No financial information is committed without dispatch stock effects, or vice versa. Duplicate request keys, repeated post of the same document and concurrent clicks cannot create another batch/number/ledger debit. A client timeout after commit is recovered by looking up the durable result; do not generate a new intent/key to guess whether posting happened. Different keys against an already POSTED document return its existing result or a conflict, never repeat effects.

The photograph supplies a field-grid/signature reference only. Unique Plastic Industry must be the sole identity on the eventual print; no unrelated source header/address/logo is copied. Customer copy rate, amount and GST visibility is **UNRESOLVED**. Internal price storage remains mandatory. Print/export permission must be checked independently of public website access.

## Immutable linked adjustments

Every adjustment has an original challan FK, affected line/field references, before/effective-after values, signed incremental effects, mandatory reason, evidence references, exact-version approval and its own posting number/batch. Preserve original values. Lock the original document/lines and compare an effective revision counter; editing/another concurrent correction invalidates stale approval. Original + all committed deltas defines the effective recorded position; replaying a delta cannot apply twice.

| Correction | Permitted proposed treatment | Not permitted |
| --- | --- | --- |
| Rate or financial amount | Ledger delta only, based on effective quantity/rate and explicit manual GST delta; retain calculation snapshots | Rewrite original debit or credit receipt again |
| Metadata | Immutable correction overlay; no stock/party/money effects unless separately justified | Reprint original as if it always had new content |
| Quantity | Reconcile original recording against verified actual dispatch/physical stock; stock delta only for demonstrated prior recording error, plus necessary sale delta | Stock-in merely because customer wants fewer units after actual dispatch |
| Recorded variant | If evidence proves actual goods sent were B but recorded A, a justified +A/−B stock correction plus actual price/tax delta, checking B availability | Claim an actually shipped A is back in stock without return receipt |
| Actual additional delivery / physical wrong shipment | New dispatch/physical return workflow as appropriate | Hide a new physical event inside a clerical correction |

Physical evidence standards and approving authority are Q-03/Q-20, not silently finalized. If evidence is absent or current stock would go negative, block the stock correction and require investigation; administrator approval alone cannot bypass stock protection. Track dispatch entitlement separately from financial effective values so a price/metadata change cannot increase returnable physical units.

A correction reducing eligible document value below existing allocations must include an explicitly authorized deallocation plan in the same transaction or fail. Deallocating changes invoice matching, not the receipt's existing ledger credit. Cross-GST-class/customer corrections are not automatic transfers; their linked correction policy must be explicitly approved (Q-21).

## Sales return lifecycle

REQUESTED stores intent. A linked return-receipt document posts verified physical quantity into QUARANTINE only and reserves it against the referenced dispatch line; it has its own annual number/batch and POSTED lifecycle. The financial return's RECEIVED state is an operational projection of that child, not stock posted by a draft. INSPECTED records reusable/damaged/unresolved quantities, inspector/date and evidence. Partial inspections retain the received goods in quarantine; proposed V1 final disposition is all-or-nothing for one return document, with unresolved = 0. Separate return documents may handle separate physical batches. AUTHORIZED binds complete disposition and **separate approved customer credit valuation**. Final POSTED disposition atomically removes the received total from quarantine, adds only reusable to AVAILABLE, adds damaged to DAMAGED and creates the approved credit in the original selected customer ledger. No later inspection mutates a posted return; use an approved linked correction if justified. Lines referenced by posted receipt facts cannot change their item/unit identity in place.

Credit may include approved value for damaged items; it is not automatically quantity-reusable × original rate. Explicit line/base/tax valuation and authority are retained. Credits, tax treatment and refund settlement are distinct: no automatic cash refund. Reference-less returns, above-dispatch exceptions, post-clearance price disputes and disposal remain blocked until owner policy is supplied.

Under the original line lock, `received/reserved + finally posted returns` must not double-count the same receipt; use one cumulative received claim counter and decrement/release it only through an audited authorized event. Total claimed physical returns cannot exceed verified dispatch entitlement minus earlier claims. Separate claims from disposition/financial effects: inspection and posting never claim the same units again. Returning under two concurrent requests must compete for one remaining entitlement. An exception needs explicit approved provenance and cannot create stock from an unverified physical receipt.

See [ledgers](P2-0-ledgers-payments.md), [model](P2-0-mysql-data-model.md) and tests SAL-01–SAL-08/RET-01–RET-05 in [verification](P2-0-verification.md).
