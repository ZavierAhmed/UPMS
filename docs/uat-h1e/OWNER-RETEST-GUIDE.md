# Owner retest guide

Open http://127.0.0.1:5180/management with the existing php-admin credentials. No password reset, setup initialization or database migration is needed. The existing 38-table/103-guard workspace is retained.

1. Open Employee Hafta, Ahmed, November 2-8, 2026. Expect PARTIAL coverage, unknown beginning payable, opening coverage starting November 3, earned 2000.00, direct payments 0.00, existing payments applied 1200.00 and closing 1800.00 explicitly qualified as of November 8.
2. Read the prominent recorded opening: PKR 1000.00 from November 3. Expand View Existing Opening: immutable ID 1, reference and reason must match retained evidence. It is not a payment and creates no cash movement.
3. Select Verify Labor Opening. It must say Employee labor opening already verified and show View Existing Opening. There must be no second-opening posting fields for Ahmed. Do not try to change the retained value/date through SQL or another administrator.
4. Change From to November 3, retaining To November 8. Expect FULL coverage, opening 1000.00 and closing 1800.00. Change to a later covered week: the balance carries forward with recorded period activity separate.
5. Inspect the applied 1200.00 row and Original Expense 3 link. Original expense and money source remain immutable; no second debit or duplicate allocation exists. Ordinary employee expenses remain separate.
6. Export Excel and Print / Save as PDF for full and partial selections and All Employees. State, dates, exact balances and limitations must agree. Any employee lacking valid coverage makes its balance and affected aggregate unverified; no missing opening becomes zero.
7. If a legitimate new employee's opening fails, retain the entered evidence, affected-field message and Diagnostic request reference. Correct only the input or reported rule. Do not repeatedly create openings to force a target balance. Duplicate/concurrency/rollback tests have already run on synthetic databases.

Opening 1 is already valid and immutable; the remaining owner action is to review the corrected presentation. No new financial posting is required to complete this retest. Hosted production, cheques, unsupported advances and public website remain outside this correction.
