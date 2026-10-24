# V1.2A owner UAT guide

Open http://127.0.0.1:3113/management. Username: `v1_operator`.
From the repository root, run `.\server\tools\Get-UPMSSimpleV12AAccess.ps1` yourself to copy the generated private password locally, then clear your clipboard after signing in. Do not send the password in chat.

Ports3110,3111 and3112 retain their previous builds and data. Your ITM-0003 record on3112 remains unchanged: production500 is DRAFT and opening is unverified. Do not assume saved stock drafts have posted inventory effects.

The new3113 demo contains labeled synthetic data only: item1 has opening0 +production500 −challan200 =300 stock; item2 has verified0. The synthetic client owes4500 after a10% discounted sale. This is not imported company data.

1. Create a new test bottle with a positive selling price. In a challan select its exact ITM code: Stock opening required must appear with Set Up Stock Opening.
2. Follow that action. Explicitly enter0 only if your intended synthetic opening is zero; Save draft, then Finalize entry. Verify status POSTED. Saving alone has no stock effect.
3. Create production500 for that same code. Save, review and Finalize entry. Confirm POSTED.
4. Navigate to a new challan and select the same code. Expect Available: 500 bottles without signing out. Confirm the code beside stock.
5. Test200 and500; test501 for Only500 bottles are available; test zero, negative, fraction and empty. Enter200 and10% discount and verify the exact subtotal/discount/final amount for your configured price.
6. Save and review the draft: it shows current stock and explicitly says no movement has posted. Finalize the valid challan. Expect300 remaining and the correct discounted client debit. A stock opening other than0 changes this expected total and must be included explicitly.
7. Check forms at1920,1440,1024,768,390. Item, stock, purchase, challan, client/vendor payment, expense and opening forms should fill the workspace without clipped controls. Verify Back/Forward preserves selected IDs and reloads availability.
8. Check client/vendor ledger and Company Transactions XLSX exports. Print Delivery Note: no prices/discount/GST; normal register print remains landscape.

Rollback: use preserved3112 to review previous UAT data. To stop only the new3113 Node service, run `.\server\tools\Stop-UPMSSimpleV12ADemo.ps1`; it validates its recorded PID/port/command first. Retain its database, profiles and evidence. No database rollback or main-profile change is needed because this milestone did not migrate main or change the original demos. Review the branch before any future merge/deployment.
