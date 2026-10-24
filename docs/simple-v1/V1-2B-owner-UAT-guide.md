# V1.2B owner UAT guide

Open http://127.0.0.1:3114/management. Username: v1_operator.
Run `.\server\tools\Get-UPMSSimpleV12BAccess.ps1` yourself from the repository root to copy the generated private password locally, then clear your clipboard. Do not send passwords in chat.

This is a NEW synthetic demo. Ports3110–3113 keep their previous builds/data. Original Draft9 on3113 was inspected read-only and remains unposted; it was not migrated or silently finalized.

New3114 starting data: explicit client opening5000 +discounted challan4500 −posted cash receipt1000 =8500client receivable. Explicit vendor payable3000 −posted cash payment1000 =2000payable. Stock0opening +500production −200sale =300. Item2 has verified0. Posted examples are CR-0007 and VP-0008; new Draft9 is a1000 cash client receipt with optional external reference blank and no financial effect.

1. Open Client Payments, then Draft9 (or `/management/documents/9`). Check client, date, PKR1,000.00, Cash, blank external reference and DRAFT. The official receipt number must be unissued.
2. Finalize entry once and confirm. Expect Client payment posted successfully, POSTED and CR-0009. The client ledger should credit1000 once and close at7500 for this fixture. Refresh: no Edit/Finalize/Cancel actions and no second credit.
3. Create a separate cash vendor payment without an external reference. Verify its VP identity and a debit reducing the vendor payable. Test a bank payment separately; an external bank reference is optional and retained when supplied. Cheque receipt still requires cheque identification.
4. For an unverified synthetic party, confirm a clear opening requirement and Set Up Opening Balance link. Do not skip explicit opening verification. Saved-only drafts have no ledger effect; errors leave the draft available for review.
5. Open a new Delivery Challan for the exact bottle code. Native Time accepts10:30AM (stored10:30) or04:45PM (stored16:45), or optional blank. Save/edit/reopen and verify no time shift. Use an available quantity and the saved rate/discount rules; print the posted delivery note to check the chosen time and absence of prices/GST.
6. Inspect payment/challan forms and details at1920,1440,768,390. Status text and actions must stay readable; mobile actions stack. Check ledger/register XLSX, Back/Forward stock refresh and reconciliation.

CR/VP use shared document IDs, so gaps and posting-order differences are expected. They are documented synthetic conventions pending live cutover review, not replacements for any historical company numbering.

Rollback: return to preserved3113 for previous UAT records. To stop only the new Node demo, run `.\server\tools\Stop-UPMSSimpleV12BDemo.ps1`; it verifies PID/port/command and retains database/profiles/evidence. No main migration or main runtime-profile change needs rollback. Do not reset/drop test databases. Owner acceptance remains pending; review this branch before any merge or deployment.
