# PHP-7.6 pricing policy and parity

The approved policy changes ONLY active entry-version-2 CHALLAN pricing. A positive
string lines[].rate may differ from v1_items.selling_price. Existing monetary
syntax (up to two decimal places), range, overflow, quantity, item and zero-net
rules remain. No client amount/subtotal/discount result is trusted. PURCHASE and
the other twelve document kinds retain their accepted behavior.

| Context | Source / behavior |
| --- | --- |
| Effective rate | Operator's string lines[].rate; normalized exact cents in immutable posted lines |
| Initial/default reference | Current item master selling_price; never written by an override |
| Reviewed item version | Optional positive integer reviewedItemVersion sent by the editor; mismatch rejects save with PRICE_CHANGED |
| Stored pricingVersion / expectedVersion | Derived from current SQL item by both servers; posting still rejects stale item metadata |
| Stored defaultRateSnapshot | Current SQL default at explicit draft save; not retroactively added to historical records |
| Stored rateSource | ITEM_DEFAULT if amounts match, CUSTOM if different; numerical classification, not cryptographic provenance |
| UI stale review | Explicit Review current item details preserves rates; explicit per-line Use default price resets rate/version |
| Legacy caller without review field | Explicit save derives current context; never silently changes the submitted rate |
| Legacy saved draft | Existing current pricing/item version remains usable; stale version requires explicit resave |

The servers do not accept caller-provided pricingVersion/defaultRateSnapshot/
rateSource as authoritative. New context uses existing payload JSON; no schema
change. Idempotency fingerprints still bind the original request. An override
does not alter item code/classification/version, other drafts or posted documents.
No client-specific remembered rate or permanent price list is introduced.

## Contract expectations deliberately changed

- Master-rate inequality no longer produces PRICE_CHANGED by itself.
- The React read-only price assertion becomes an editable initial-default assertion.
- The old PHP-3 "bad saved rate" vector is now an accepted manual-rate draft; its
  differential and state checks remain. No unrelated rejected input is weakened.
- The isolated Simple V1.2 reference integration assertion now accepts a custom
  draft and verifies the item master remains unchanged; its historical dedicated
  database harness is not activated against an unrelated local engine.
- Prior address tests banning F-260 now require the approved complete F-260/A
  address, while preserving the other identity/prerender/map/link assertions.
- Public hash equality uses an explicit revised manifest only for this authorized
  address change; the historical PHP-7 manifest is not overwritten.

The added PHP-6 extension compares exact HTTP bodies and all ten business tables,
including payloads, immutable lines, journals, audit and command receipts. New
vectors cover default/below/above/multi-item/per-client rates, draft/edit/reset,
stale item review, discounts, invalid string/type/overflow, stock rejection,
same-key replay/conflict, concurrent custom posting, legacy context, ledger effects
and cumulative historical returns. Existing rollback/concurrency/fault probes
remain. A second real lost-COMMIT proxy test now posts a custom-rate challan and
replays its durable result once, in both Express and PHP.

Full return of 100 at 45.00 credits 4,500.00 even after the item master changes to
60.00. A three-bottle custom sale at 0.02 with fixed discount 0.01 returns exactly
0.05 across three partial returns. The existing allocation algorithm is unchanged.
Reconciliation is observational, uses original posted financial evidence and does
not compare historical rates against today's master. Its original authenticity
and SQL trust-boundary limitations remain explicitly unresolved.
