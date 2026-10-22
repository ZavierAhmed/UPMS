# Inventory schema

New migration: `202610220003_inventory_operations.js`. The two historical migrations are unchanged. Applied to recovered main upms on port 3309 after verified backup/restore and to isolated fresh acceptance schemas. Main has 44 tables; restricted runtime sees 42.

| Table | Purpose | Runtime rights |
|---|---|---|
| inventory_tracking | Per-item starting-state authorization and provenance | SELECT, INSERT, UPDATE |
| inventory_balances | Unique item/condition quantity, version and last movement | SELECT, INSERT, UPDATE |
| inventory_documents | Extension of business_documents: kind, original link, matching-count closure | SELECT, INSERT, UPDATE |
| inventory_lines | Immutable versioned production/consumption/count/correction lines | SELECT, INSERT |
| inventory_movements | Immutable signed delta, before/after, actor, reason, batch/effect/source links | SELECT, INSERT |
| inventory_policy_acceptances | Explicit administrator acceptance linked to policy version | SELECT, INSERT |

One physical factory/warehouse; no location dimension. AVAILABLE, QUARANTINED and DAMAGED are independent condition buckets. Composite item/unit foreign keys preserve canonical unit identity. Unique item/condition balances and batch/effect and source-line constraints prevent duplicate effects. Database checks reject negative balances and inconsistent movement arithmetic. Runtime cannot DELETE any inventory table or UPDATE immutable evidence.

Quantities use DECIMAL(20,6); application calculations use BigInt scaled by 1,000,000. Maximum magnitude is 99,999,999,999,999.999999. Inputs are strings; exponent notation, JS numbers, excess unit precision, nonpositive ordinary quantities and overflow fail without rounding. Zero counts are legitimate observations; zero discrepancies create no movement.

Existing/new masters begin UNVERIFIED with absent quantities. Absence is displayed as unverified, never historical zero. Administrator-only NEW_ITEM_ZERO requires explicit no-history attestation and reason, and creates three authorized zero rows. HISTORY follows committed movement. OPENING_VERIFIED is reserved for a later reviewed opening milestone; no import/activation API implements it here.
