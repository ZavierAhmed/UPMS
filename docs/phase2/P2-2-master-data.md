# Master-data functionality

The private Master data navigation uses the existing React management app and graphite/orange/warm-white design. Backend resource manifests and every list/write API enforce current permissions; hiding navigation is not the security boundary. Public pages and inquiry behavior are unchanged.

| Area | Behavior |
| --- | --- |
| Categories | Four confirmed records only; rename/deactivate, fixed codes |
| Units | Configurable code/name/scale 0–6; whole pieces use scale 0; no conversion |
| Bottle types/sizes/qualities/colours | Configurable canonical codes/names, status and history |
| Items | Fixed base unit/category; finished items require all four dimensions; composite duplicates rejected |
| Customers/vendors | Separate tables/codes, contact/address/remarks and status; no automatic merging or historical import |
| Customer classifications | GST and NON_GST references created atomically, without any balances |
| Money accounts | CASH/BANK/CASH_HOLDER/CHEQUE_HOLDING/CHEQUE_CLEARING and configurable metadata; no amounts |
| Expense categories | Configurable codes/names/status; no expenses posted |
| Document types | Configurable proposed prefix with explicit administrative approval; no number issuance UI |

Search is bounded to 100 records per response. Reference selectors use code/name labels rather than raw database IDs. Create/edit forms show required reasons, active status and clear validation feedback. Edits require the current record version. Codes remain immutable; item unit/category/variant identity remains fixed even before movements, a conservative protection against silent reclassification. A referenced unit cannot change precision or meaning; deactivation preserves references. New items cannot reference inactive masters. Existing records can still be deactivated after a referenced master is inactive.

Write endpoints require a durable Idempotency-Key and synchronizer CSRF token. The UI retains the same key for the same failed intent so uncertain retries can resolve durable results. SQL uniqueness protects both normalized codes and variant identity. Conflicts, stale edits and inactive references return controlled errors, not SQL text.

Quantity validation accepts exact nonnegative decimal strings up to fourteen integral places and the selected scale, rejecting excess precision rather than rounding. This validator is for future commands; P2.2 has no quantity/money posting form. SMALL F/SMALL R/BIG F/BIG R remain unmapped. No source workbook/PDF/contact/account name was imported or hardcoded.

Bottle dimension names also receive guarded case/spacing duplicate checks, preventing a new code from silently duplicating the same canonical label. Spelling synonyms are not inferred or merged. The database composite variant key uses the selected canonical dimension IDs.
