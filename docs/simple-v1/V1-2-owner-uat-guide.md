# Owner testing — use V1.2 on3112

Open http://127.0.0.1:3112/management. The header must say Simple V1.2.3110 is the preserved original V1 demo;3111 is the preserved V1.1 demo. Do not use those for V1.2 acceptance.

From repository PowerShell run .\server\tools\Get-UPMSSimpleV12Access.ps1. It copies the privately encrypted password locally; username v1_operator. Never send the password in chat and clear clipboard after pasting. Synthetic database: upms_test_simplev12_demo_20261024_01 on recovered3309. Main remains unchanged.

Initial synthetic fixture: ITM-0001 black bottle25PKR, ITM-0002 white bottle30PKR; explicit zero openings;500 black bottles produced; posted DC-0001 dispatched200 with10percent discount. Black stock300, client receivable4500, vendor opening/payable0. Current item prices, old sale and its source journal are retained.

1. Add Item: Test Bottle, Recycle, black, DT2, selling price25, Active. No code/reason entry. Save and note the generated immutable ITM code.
2. On item details explicitly confirm stock opening0 for this new synthetic bottle. This preserves the existing verified-opening rule; do not silently assume zero.
3. Add a new synthetic client with explicitly confirmed0 opening (or use the seeded client, noting its4500 prior balance).
4. Production Stock In: choose your new bottle,500. Add another line and try the same bottle. Expect the duplicate warning and unchanged first quantity. Select a different variant if needed. Save draft/finalize; your new bottle has500.
5. New Challan: select client and new bottle. Available500 and readonly rate25 appear. Enter600: expect Only500 bottles are available and blocked ordinary save. Restore200.
6. Choose percentage10. Expect subtotal5000, discount500, final4500. Save/review/finalize. Stock300; new client receivable4500 (or seeded client9000 if used). Next seeded sequence is DC-0002, then follows the approved existing numbering.
7. Print Delivery Note: quantities/packing/signatures only, no prices/discount. Internal screen/ledger/register show4500. Run Settings reconciliation: matched, no repair.
8. Save another challan draft, change the item's default price in Item Management, then reopen/edit the draft. Its old rate remains visible; explicitly refresh prices, review totals and save. A posted old challan remains unchanged.
9. Check1440/768/390 widths, keyboard/mobile selectors, Back/Forward and retry after a field error. Export client/vendor ledger and Company Transactions.

Zero selling prices, free/zero-total posted challans and manual rate overrides are blocked. Unpaid expenses remain unsupported. No tax/ERP workflow is enabled. All actions here are synthetic; do not enter real owner records.

Rollback: Stop-UPMSSimpleV12Demo.ps1 verifies exact process/port before stopping only the3112 Node service and archiving its receipt/logs. Preserve the populated schema/profiles/evidence. Start-UPMSSimpleV12Demo.ps1 restarts it; it refuses occupied3112 or an existing receipt. Baseline branch16dbac8 remains available in Git. Do not drop/reset schemas, reverse posted evidence, restore over main or touch3306.
