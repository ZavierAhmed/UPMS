# Physical receipt and cumulative allowance

A return must reference the exact current posted CHALLAN revision, customer, classification, sales line, immutable variant and unit. Validate its real dispatch movement. Active finished item and active unit are mandatory; unrelated variants/units cannot be substituted. Only source quantities are exposed to Inventory, never selling rates, GST amounts or financial payloads.

Sales request posting issues its explicit accepted number and creates no stock. Inventory receipt requires a posted matching request and source. Each line is limited by both remaining request-line quantity and original dispatched-line quantity minus all earlier physical receipts, across every request. Requests reserve no physical allowance; racing receipts serialize through the shared coordinator and locked allowance projection.

In one transaction: authenticate/current authority, guards/replay, source and policy/date checks, ordered allowance locks, immutable physical receipt rows, per-receipt quarantine projection, shared posting batch/effect claims, CUSTOMER_RETURN_RECEIVED movement, authoritative QUARANTINED balance update, number, audit and durable result. AVAILABLE/DAMAGED and every financial source/projection remain unchanged.

No implicit opening: a missing inventory condition balance is unverified and blocks posting. Existing genuine-new/no-history activation remains separately controlled. Backdates, historical imports and reference-less returns remain unsupported.

## Stored source contract

| Table | Authoritative fields and links |
|---|---|
| return_policies | id; business_policy_id; immutable contract/hash; actor/time |
| return_documents | document_id PK to shared business_documents; kind; challan_id/customer_id/ledger_type; nullable request_id/receipt_id; original source_version/source_hash |
| return_lines | id; document_id/document_version/line_index; sales_line_id; item_id/unit_id; request_line_id/receipt_line_id; expected_version; quantity/reusable/damaged/remaining; frozen description/variant; actor/time |
| return_allowances | sales_line_id PK; immutable-dispatch quantity projection; cumulative received/version |
| return_receipts | line_id PK to return_lines; document_id/request_line_id/sales_line_id; physical quantity; policy/batch/actor/time |
| return_receipt_balances | receipt line_id PK; received/remaining/version |
| return_dispositions | inspection line_id PK; unique document_id; physical receipt_line_id; under_disposition/reusable/damaged/remaining; policy/approval/batch/actor/time |
| return_stock_movements | id; document/line/batch; item/unit; movement code/condition; delta/before_quantity/after_quantity/balance_version; unique batch/effect key; actor/reason/time |

Quantities are DECIMAL(20,6), projection versions unsigned BIGINT, document revisions unsigned INT, source/payload hashes64 hexadecimal characters, timestamps DATETIME(6). Shared document headers own business date, creator, status, payload hash and lifecycle; shared number/approval/audit tables retain original infrastructure. Composite item/unit FKs and services enforce original identity; source/effect uniqueness prevents duplicate claims. All source tables are append-only at runtime; only the two current quantity projections permit UPDATE. No financial amount/rate/currency field is stored here.
