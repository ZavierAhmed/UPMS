# Inventory design

Business rules R-03–R-07/R-13/R-14 are **CONFIRMED**. Tables, bucket design, precision and error behavior are **PROPOSED** and require review before implementation.

## Masters and units

Inventory categories are FINISHED_GOODS, RAW_MATERIAL, COMPONENT and PACKING_MATERIAL. Examples of pieces, kilograms, rolls and bundles illustrate appropriate units; they do not dictate every item. Each item references one base unit. A unit has a proposed allowed fractional scale from 0 to 6: pieces normally 0, suitable measurement units may allow fractions. Store quantity as DECIMAL(20,6); API values are decimal strings, reject excess scale rather than silently rounding. Rate/money precision is in [architecture](P2-0-architecture.md) and remains an owner decision.

Finished items reference canonical bottle_type, size, quality and colour masters with a unique four-key combination. Normalize master codes/spacing/case under an explicit canonical key before insertion; do not merge spelling variants automatically. A size is a named/coded dimension, not a unit-conversion formula. The four spreadsheet abbreviations and quality taxonomy remain unmapped pending owner confirmation.

Packing description/packing counts are dispatch presentation on challan lines. They neither distinguish stock variants nor convert stock units. Separate packing-material items are consumed through material consumption, not automatically from descriptive packing. Whether a bottle sold complete with caps/seals requires a separate entered component-consumption document is Q-19; there is no implicit BOM.

Item/master inactivation hides it from new ordinary drafts; history retains IDs and posting-time labels. Proposed controlled return/adjustment to an inactive item is allowed only through an explicit permitted workflow, not by creating a near-duplicate. No hard deletion after references. After stock transactions, do not change the base unit or identity dimensions in place: create a replacement item and approve a measured reconciliation/migration plan. No automatic unit conversion is supplied.

## Balance authority and absolute invariant

For each `(item_id, stock_bucket)` maintain a lockable balance row, created with the item before postings. Proposed buckets AVAILABLE, QUARANTINE and DAMAGED distinguish usable and unavailable goods; every bucket stays nonnegative. Multiple physical locations are unresolved; V1 must not silently claim multi-location balances. All inventory, including raw/components/packing, obeys:

`current quantity = signed sum of immutable stock movements, including approved opening entries`

The balance row is a transactionally maintained cache of that journal, not a second editable authority. Every stock movement links a posting batch and unique effect key; zero adjustments are not journal movements. Reconcile caches to journals on demand or an authorized bounded task. Mismatch blocks affected posting until investigated; never repair by silently changing totals.

For one document aggregate repeated lines by item/bucket before checking stock. Lock all affected balance rows in deterministic item/bucket order; compute the full delta vector with exact decimals. Every result must be ≥ 0 before writing; protect with conditional updates and database CHECK constraints supported by the verified engine. Never check then decrement outside a transaction, rely on frontend stock, use an unlocked sum, or grant an administrator bypass. Draft excess is allowed; posting fails with the deficient item(s), not partial effects.

Example **synthetic only**: two users each dispatch seven pieces from ten. One transaction may commit; the other must see three and fail. A duplicate line pair of six plus five from ten must fail as eleven, even though each line alone fits. No transient negative balance is permitted for variant swaps, return disposition, opening correction or stock-taking.

## Permitted stock effects

| Source | Effect | Required safeguard |
| --- | --- | --- |
| Finished production | AVAILABLE + finished quantity | Finished category, fixed unit, own document reference/creator/date |
| Received purchase | AVAILABLE + received item quantities | Supplier/receipt evidence, correct categories and atomic vendor payable/payment |
| Material consumption | AVAILABLE − eligible raw/component/packing quantities | Operational reason, sufficient stock; no finished output side effect |
| Challan | AVAILABLE − dispatched finished quantity | Atomic sale/customer-ledger debit; no inferred caps/packing consumption |
| Posted linked return-receipt document | QUARANTINE + physically received quantity | Own number/batch, no customer credit/availability yet; unique receipt event and dispatch entitlement lock |
| Authorized final return disposition | QUARANTINE − total; AVAILABLE + reusable; DAMAGED + damaged | Reusable + damaged = received quantity and unresolved = 0; partial inspections remain wholly quarantined until final approval |
| Approved correction/stock-taking | Evidence-backed signed delta | Exact-version approval, measured provenance, no synthetic undo of actual dispatch and no negatives |

Damaged-stock disposal is unresolved. Its eventual approved document would reduce DAMAGED without granting available stock or automatic valuation. It cannot be deleted from history. Return financial valuation is independent of reusable quantity.

The [sales design](P2-0-sales-challans.md) constrains clerical stock corrections. Opening and stock-taking deltas also need source evidence and approval. Cutoff/period locks and durable idempotency apply to every row above. Future tests INV-01–INV-09 in [verification](P2-0-verification.md) cover concurrency, precision, category/unit identity, quarantine and cache reconciliation.
