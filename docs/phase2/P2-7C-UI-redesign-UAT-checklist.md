# Redesigned management — owner UAT checklist

**Owner visual review and manual UAT: NOT YET EXECUTED.** Use only http://127.0.0.1:3108/management, exact isolated upms_test_p27c_uat_20261023_02. Main3000/upms is protected and not the target. Expect the sticky DEMO / SYNTHETIC banner and its repetition in posting review. Do not enter real company data.

From the repository root, run .\server\tools\Get-UPMSDemoAccess.ps1 -RunId 02 -Role Admin (or Accounts, Inventory, Sales). It prints the demo username and copies only that generated password to the local clipboard. Paste into the password field, then clear with Set-Clipboard -Value ''. No password is stored in this guide or Git. Existing Start/Stop/Health helpers and the original guide still apply; never rebuild/reset the populated demo for UI review.

Desktop uses the left sidebar. At768/390px choose Open navigation, select the group/entry, and the drawer closes. Escape closes it; keyboard Tab remains in the open drawer. The active entry is marked. Quick cards open a workspace without discarding its existing draft. Within a module choose its named action. Posting opens Final review; Back to review/Escape cancels without mutation. Confirm posting sends the existing request and success is shown only after server confirmation.

| Case | Role/navigation/action | Expected result | Actual / PASS-FAIL / evidence |
|---|---|---|---|
| UI01 | Admin → Overview,1440/768/390 | Rounded cards, readable headings, permitted summaries; no overflow | ____ [ ]PASS [ ]FAIL ____ |
| UI02 | Accounts → Overview | No unauthorized stock totals; scoped expense/cheque/purchase summaries | ____ [ ]PASS [ ]FAIL ____ |
| UI03 | Inventory → drawer/sidebar | No receipts/expense/credit financial controls; own profile available | ____ [ ]PASS [ ]FAIL ____ |
| UI04 | Admin → Master data | Search/edit/create only fictitious test masters; validation visible | ____ [ ]PASS [ ]FAIL ____ |
| UI05 | Inventory → Inventory | Review stock by unit/condition; inspect production/consumption controls | ____ [ ]PASS [ ]FAIL ____ |
| UI06 | Accounts → Purchases and accounts | Review separate receipt, invoice and settlement; vendor payable remains distinct | ____ [ ]PASS [ ]FAIL ____ |
| UI07 | Sales → Sales / Delivery Challans | Review customer/variant/classification; existing policy gates enforced | ____ [ ]PASS [ ]FAIL ____ |
| UI08 | Sales/Accounts → Sales → Customer ledger | Select GST then NON_GST rapidly; latest selection wins, no combined authority | ____ [ ]PASS [ ]FAIL ____ |
| UI09 | Accounts → Customer Receipts | Customer/classification/account/allocations clear; pending cheque funds unavailable | ____ [ ]PASS [ ]FAIL ____ |
| UI10 | Accounts → Cheque Management | Pending custody separate from settled bank; request/approval/posting distinct | ____ [ ]PASS [ ]FAIL ____ |
| UI11 | Inventory/Sales → Customer Returns | Quarantine/inspection/release readable; no automatic financial credit | ____ [ ]PASS [ ]FAIL ____ |
| UI12 | Sales/Accounts/Admin → Customer credit notes | Dedicated draft/detail, Back to credit notes; Admin approval required; no cash refund | ____ [ ]PASS [ ]FAIL ____ |
| UI13 | Accounts → Business expenses | Existing utility30 paid12000, transport33 paid1500, maintenance34 unpaid25000 | ____ [ ]PASS [ ]FAIL ____ |
| UI14 | Accounts → New business expense | Grouped required fields/lines; save draft only; switch to profile/back and input remains | ____ [ ]PASS [ ]FAIL ____ |
| UI15 | Authorized staff → posting review | Correct source/classification/amount/account/allocations/approval; cancel creates no effect | ____ [ ]PASS [ ]FAIL ____ |
| UI16 | Admin → module reconciliation/history | Readable immutable timeline; mismatches never trigger automatic repair | ____ [ ]PASS [ ]FAIL ____ |
| UI17 | Admin → Staff accounts / My profile | Department controls, validation and session/password actions remain explicit | ____ [ ]PASS [ ]FAIL ____ |
| UI18 | Keyboard/mobile → drawer, forms, dialog | Focus visible, controls touch-friendly, Escape works, no body overflow | ____ [ ]PASS [ ]FAIL ____ |

Follow the original25 business cases and expected seeded amounts in P2-7C-owner-UAT-guide.md for actual synthetic postings. Owner actions can change demo values; do not reset it to restore screenshot amounts. Health checks read actual state and never repair/reseed. Keep screenshot evidence locally; do not share passwords or encrypted credential files.

Owner/reviewer ____ Date ____ Source commit ____ Findings ____

[ ] Visual direction accepted [ ] Changes requested [ ] Manual business UAT accepted

Signature ____ Independent reviewer ____

No selection here authorizes production activation, merge, deployment or additional business milestones.


## Browser navigation corrective acceptance — owner must execute

Automated navigation17 and visual85 passed; these owner fields remain blank. See UI-navigation-routing.md and UI-navigation-test-results.md for exact scope and retained failure evidence.

| Case | Owner action | Expected | Actual / PASS-FAIL / evidence |
|---|---|---|---|
| NAV01 | Overview→Purchases→Sales; Back then Forward | Purchases then Sales; matching URL | ____ [ ]PASS [ ]FAIL ____ |
| NAV02 | Deep link /management/expenses/documents/30; refresh | Same authorized document; no duplicate effect | ____ [ ]PASS [ ]FAIL ____ |
| NAV03 | All documents; Back/Forward | Detail/list restored with real URLs | ____ [ ]PASS [ ]FAIL ____ |
| NAV04 | Filter Sales, review a challan, Back | Relevant filter value retained | ____ [ ]PASS [ ]FAIL ____ |
| NAV05 | Enter unsaved fictitious form; change section; Back | Draft retained; no save/post | ____ [ ]PASS [ ]FAIL ____ |
| NAV06 | Attempt full reload with unsaved form; Cancel | Native warning; current values retained | ____ [ ]PASS [ ]FAIL ____ |
| NAV07 | Sign out; Back; sign in as Inventory | No previous financial/draft content; Expenses denied | ____ [ ]PASS [ ]FAIL ____ |
| NAV08 | Open /management/unknown-page | Internal not-found; safe navigation available | ____ [ ]PASS [ ]FAIL ____ |
| NAV09 | Repeat active sidebar item | No duplicate history entry | ____ [ ]PASS [ ]FAIL ____ |
| NAV10 | At390px open drawer; choose Sales; Escape when reopened | Selection closes; Escape returns focus | ____ [ ]PASS [ ]FAIL ____ |
| NAV11 | Review new forms and inspection24 at1440/768/390 | Readable groups, mandatory fields, summaries, complete expandable evidence | ____ [ ]PASS [ ]FAIL ____ |

Owner visual decision: ____ Date: ____ Evidence: ____
Manual UAT sign-off: ____ Date: ____ Remaining issues: ____
