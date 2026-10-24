# Duplicate and stock safeguards

Each new bottle document rejects repeated item IDs rather than consolidating quantities. Applies to production, purchases, openings, corrections and challans. Other colour/quality variants remain distinct. The shared selector marks already-selected options Already included and gives the explicit warning: This bottle is already included. Update its quantity in the existing row. Other rows and quantities remain unchanged.

Backend validation repeats the check during draft save and posting, including bypassed browsers. Quantity validation uses whole-bottle BigInt arithmetic; corrections preserve their signed semantics and required reason.

Challan availability comes from the authorized item/stock read model, per selected item, with unverified openings identified explicitly. It is not a dashboard aggregate. Quantity uses native step/min/max and explicit React validation.600 against500 shows Only500 bottles are available and prevents ordinary submission; values remain available for correction. A draft submitted directly may preserve proposed demand, but cannot post without stock.

Posting re-reads and locks stock records in stable item-ID order inside the existing transaction guard, reconciles the stock projection against its source journal, revalidates demand and atomically rejects negative stock. A409 conflict includes a safe per-line message and latest available quantity. No stock, journal, number or idempotency result commits on failure. The UI retains that latest quantity for review. No stock opening is assumed implicitly: new bottles still require explicit opening confirmation.
