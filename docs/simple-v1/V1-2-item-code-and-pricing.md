# Item codes and default selling prices

The additive202610240002_entry_fixes.js extension adds nullable DECIMAL(18,2) selling_price, entry_version2 and next_item_code to V1 control. Previously applied migrations remain unchanged. Existing item codes and posted payloads are not rewritten; legacy prices remain NULL and display Price not set.

For entry_version2, creation rejects a supplied code. The server issues ITM-0001, ITM-0002, etc., widening beyond four digits when needed. The sequence is separate from delivery numbers. Existing/inactive matching codes are skipped by a database lookup, including case-insensitive unique-index compatibility. The identity transaction guard serializes issuance, and sequence advancement/item/stock projection/audit/idempotency outcome commit together. Retries return the same saved ID/code; failed transactions do not consume committed codes. Runtime has no item DELETE permission; the retained sequence never rewinds.

Add Item shows Item Code — Generated automatically. Saved codes are readonly and cannot be changed by a forged update. Existing codes such as0022 remain intact. Exact positive configured prices are strings converted with BigInt cents; negative/zero/overprecision prices are rejected. Empty/NULL means unconfigured, not free stock or a zero-priced sale.

New challan selection copies the saved default price into a readonly rate. The service independently checks the current approved item price and records the actual rate in immutable lines. Editing a default cannot alter a posted challan. Saved draft rates remain frozen; changed item versions/prices block posting until Edit draft, explicit Refresh current item prices confirmation, review and save. No rate-override feature is introduced.

Old V1/V1.1 demos stay on the pre-extension contract and frozen matching UIs. Compatibility fixtures retain original zero-price historical checks without relaxing the entry_version2 gates.
