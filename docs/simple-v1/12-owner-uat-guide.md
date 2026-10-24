# Owner UAT — Simple V1

Owner approval and manual UAT: NOT YET EXECUTED. Review only the fresh synthetic demo at http://127.0.0.1:3110/management. Expect DEMO/SYNTHETIC and Unique Plastic Industry. Protected main3309/upms, original3306 and earlier UAT02/3108 are not this target.

From the repository root, run `./server/tools/Get-UPMSSimpleV1Access.ps1`. It prints `v1_operator` and copies the privately generated password to the local clipboard. Paste locally, then run `Set-Clipboard -Value ''`. Never paste passwords into chat, docs or Git. If not running, use `./server/tools/Start-UPMSSimpleV1Demo.ps1`; it refuses an occupied port or existing server evidence. Do not provision/seed/reset the populated demo again.

1. Sign in. Review six simple dashboard cards/stock list and quick actions.
2. Items: inspect three bottles, description/quality/colour/packing, stock and movement links. Verify no material hierarchy or arbitrary quantity editor.
3. Clients/Vendors: inspect explicit opening direction/date and ledger. Synthetic Client A starts20000 receivable; Vendor A starts10000 payable. B accounts explicitly start0.
4. Stock In: review production1000 and purchased500 at synthetic PKR10. Stock reaches1500 before the sample delivery.
5. Delivery Challans: inspect DC-0001,200 bottles at internal PKR20. Stock1300; client debit4000. Print Delivery Note: six non-priced columns, company identity, signatures, no rate/amount.
6. Client Payments:5000 receipt. Client closing19000. Vendor Payments:3000 payment. Vendor payable12000 (signed ledger−12000).
7. Ledgers: select an account, dates and reference. Inspect brought forward, each running balance and closing. Export Excel, open the actual file and compare totals. Open source/Back to Ledger.
8. Open all eight Reports and their print/Excel controls. Stock units and PKR must be distinct. Current Stock is present-time; use Movements for date filtering.
9. Review Settings, numbering-cutover evidence, explicit payment policy and Check reconciliation. Avoid changing the private password during automated evidence review.
10. Review mobile drawer/Escape, Back/Forward, deep refresh, unsaved draft retention and signed-out history. Record actual observations below.

| Review | Actual result / evidence | Owner sign-off |
|---|---|---|
| Visual/business usability |____|____|
| Stock/challan/payment workflow |____|____|
| Signed opening/ledger conventions |____|____|
| Print and Excel exports |____|____|
| Real-company cutover (separate approval) |BLOCKED pending reconciliation|____|

Do not add real company records or confirm historical figures from these synthetic fixtures. No merge/deploy/live activation is included.

To stop only this demo, run ./server/tools/Stop-UPMSSimpleV1Demo.ps1. It verifies the exact Node process/listener/schema and preserves the database, profiles and archived logs. Restart with Start-UPMSSimpleV1Demo.ps1; do not run Provision/Seed again.
