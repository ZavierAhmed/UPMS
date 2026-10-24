# Owner UAT

Open http://127.0.0.1:3111/management. Fresh isolated upms_test_simplev11_demo_20261024_01 on recovered3309; existing V1 demo3110 remains preserved. Synthetic data only. In your own PowerShell run .\server\tools\Get-UPMSSimpleV11Access.ps1 to copy the private operator password; username v1_operator. Never paste it in chat; clear clipboard after use. New V1.1 cookie is separate from V1 and legacy ERP.

1. Add bottle DEMO-UAT-NEW with description/quality/colour/packing and optional remarks; no Reason requested. Save. Enter an explicit0 stock opening only for this synthetic new bottle.
2. Add a synthetic client and vendor without Reason; explicitly confirm0 openings and directions.
3. Stock In: search bottle by code/colour; choose exact variant, enter100 production bottles, save draft then finalize. Verified stock becomes100.
4. New Challan: search new client and same bottle, enter10 at20, save/review/finalize. Stock becomes90; client receivable200. Seeded DC-0001 exists, so next isDC-0002.
5. Receive50 from new client with unique synthetic reference; receivable150. Pay vendor only against a deliberately reviewed synthetic opening or advance; payment direction remains explicit.
6. Record paid expense Utilities, description/payee/reference,123.45,Cash. Draft has no effects; finalize adds one expense row and both recorded/paid summaries, no party/stock entries.
7. Company Transactions: filter dates/type/party/reference, inspect details, export Excel and print. Distinct event totals match displayed filtered rows; balance coverage remains explicitly as-of/all parties.
8. Client/vendor ledgers retain debit/credit/running signed balances. Seeded ClientA19000 and VendorA Closing Payable12000 remain until your own synthetic actions change them.
9. Check1440/768/390 widths, autocomplete keyboard/clear/no-result, Back/Forward and saved-draft selection stability. Settings reconciliation must match.

Initial fixture:3items,2clients,2vendors,1300bottles,sales4000,purchases5000,receipts5000,vendor payments3000,expense123.45,client receivable19000,vendor payable12000. No tax or cash/bank balance. Do not reset this populated fixture. Stop after owner review; no live activation.

Rollback: run .\server\tools\Stop-UPMSSimpleV11Demo.ps1 to stop only the verified3111 Node process. Keep the populated schema/profiles/evidence. The baseline V1 branch remains435eee; use a separate checkout/build for code comparison. Do not drop schemas, reverse journal signs, restore into main or replace3306 files. Start-UPMSSimpleV11Demo.ps1 can restart only after the stop helper archives its exact server receipt.
