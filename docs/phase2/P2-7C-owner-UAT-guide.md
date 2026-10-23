# Owner manual UAT — P2.7C

**Status: automated E2E and browser checks passed; owner manual UAT NOT YET EXECUTED.** Do not treat this guide or prefilled synthetic data as owner sign-off.

## Redesigned navigation before manual UAT

Owner visual review of the redesign is pending. Use the left sidebar: Operations contains Inventory, Purchases and accounts, Sales / Delivery Challans and Customer Returns; Accounts contains Customer Receipts, Cheque Management, Customer credit notes and Business expenses. Administration contains permitted Master data, Staff accounts, Identity history and My profile. At tablet/mobile widths choose Open navigation. Empty/unauthorized groups are hidden. Vendor accounts stay under Purchases; customer ledgers stay under Sales → Customer ledger. Actual module policy/approval/reconciliation controls remain in those modules; no fake global pages were added.

Quick cards open the relevant workspace and retain an existing draft. Expense/credit forms and detail panels have Back to expense documents / Back to credit notes. Before a financial post, review the explicit confirmation dialog, then Confirm posting or Back to review. Cancellation performs no financial mutation. Success appears only after the server confirms. The synthetic banner stays visible, including inside confirmation.

See P2-7C-UI-redesign-UAT-checklist.md for18 visual/navigation cases before the25 original business cases below. Keep all Actual/PASS/FAIL/sign-off fields blank until the owner performs them. No demo rebuild/reset is part of this UI milestone.

## Safe environment and access

Use **http://127.0.0.1:3108/management**. The page must display **DEMO / SYNTHETIC — P2.7C UAT — No real company data**, including before sign-in. This is isolated schema `upms_test_p27c_uat_20261023_02`, restricted account `upms_runtime_test_p27cu02`, four fictitious application users and an independent session cookie/secret. Main `http://127.0.0.1:3000/management` / `127.0.0.1:3309/upms` is protected and is NOT a test-run target. Do not enter actual customer, supplier, bank, cheque or financial-history data.

From your own PowerShell terminal in `C:\Users\zasah\source\repos\UPMS`, obtain one role at a time:

```powershell
.\server\tools\Get-UPMSDemoAccess.ps1 -RunId 02 -Role Admin
.\server\tools\Get-UPMSDemoAccess.ps1 -RunId 02 -Role Sales
.\server\tools\Get-UPMSDemoAccess.ps1 -RunId 02 -Role Inventory
.\server\tools\Get-UPMSDemoAccess.ps1 -RunId 02 -Role Accounts
```

Usernames are `demo_admin`, `demo_sales`, `demo_inventory`, `demo_accounts`. The selected generated password is copied locally to your clipboard and never printed. Paste it only into the demo password field. Clear it after sign-in with `Set-Clipboard -Value ''`. Passwords remain Windows-DPAPI encrypted in ignored `server/.local/p27c`; no real or demo password is in Git or this report. Sign out before changing role, or use separate browser profiles. Keep this loopback server private.

## Start, health, stop and fresh rebuild

The verified demo is already running while this desktop/database session remains available.

```powershell
.\server\tools\Invoke-UPMSUAT.ps1 -Action Health -RunId 02
.\server\tools\Start-UPMSUAT.ps1 -RunId 02
.\server\tools\Stop-UPMSUAT.ps1 -RunId 02
```

Health checks exact isolated schema/flags, restricted grants, four enabled users, all stock/vendor/customer/receipt/cheque/return/credit/expense/money reconciliation and the visible demo page. Start refuses to replace a running/unidentified process. Stop verifies PID, start time, launcher, command and port, preserves logs/process record, and stops only this demo Node process. It never stops MariaDB or touches main. After a clean stop, Start launches the same preserved demo data. After a host restart, Start archives a stale process record only when its PID and port are both absent. A reused PID or unexpected listener requires review; do not force-kill it.

For a **fresh reset/rebuild**, create the unused explicit generation03 instead of deleting/reusing02:

```powershell
.\server\tools\Invoke-UPMSUAT.ps1 -Action Setup -RunId 03
.\server\tools\Start-UPMSUAT.ps1 -RunId 03
.\server\tools\Invoke-UPMSUAT.ps1 -Action Health -RunId 03
.\server\tools\Get-UPMSDemoAccess.ps1 -RunId 03 -Role Admin
```

Generation03 uses `http://127.0.0.1:3109/management` and a new restricted account, encrypted credentials, secret, funding evidence and fresh E2E scenario. Generation02 remains preserved. Generation01 failed an early seeder session-column check and is retained, not reusable. Only exact generations01/02/03 with matching actual schema and explicit flag are enabled. Do not drop, truncate, reseed or overwrite any populated/failed target. If03 is used or setup fails, preserve it and request review of a new target. Do not loosen guards or repurpose main. Scripts live only in tools and are excluded from deployment packages.

## Synthetic baseline to inspect before adding cases

Two demo customers/suppliers, two bottle variants, raw/packing items, settled cash/bank/holder accounts, pending cheque holding, an explicitly unverified account and three administrator-approved demo expense categories are present. Initial funding100000 per cash/bank/holder is explicit, numbered, audited synthetic capital evidence, not an unexplained balance assignment. Brand-new fictitious masters were activated only with no-prior-history attestations.

| Seeded example | Expected baseline |
|---|---|
| Raw receipt / invoice |20kg received,2000 supplier invoice separately recognized;500+1500 paid; payable0 |
| Inventory | Raw AVAILABLE15; bottleA AVAILABLE80/DAMAGED1/QUARANTINED0; bottleB AVAILABLE50; packing is a new unstocked item |
| GST challans11/12 | Originals20000/10000; current outstanding10750/8000 after valid receipts/credits |
| NON_GST challan13 | Original5000;1000 receipt; outstanding4000 |
| Cleared cheque16 |8000 immediate receipt credit, deposited/cleared; only one customer credit |
| Dishonoured cheque19 |7000 receipt; initial and later allocations compensated; remaining credit removed |
| Return22/23/inspection24 |3 received into quarantine, then2 available/1 damaged; physical operation creates no financial credit |
| Credit notes25/26 | Price1000 and inspected-return250, explicit manual amounts |
| Paid challan27 / credit29 | Original4000 paid fully; credit300 leaves outstanding0 and retained surplus300 |
| Utility expense30 |12000 obligation;5000+7000 payments; payable0 |
| Transport expense33 |1500 recorded and paid atomically |
| Maintenance expense34 |25000 administrator-approved obligation; payable25000 |
| Expense dashboard | Recorded38501, paid13500, outstanding25001; the extra1 is the deliberate durable-idempotency example |
| GST customer position | Issued34000, credit notes1550, received17000, applied14000, unpaid18750, unapplied receipts3000, retained surplus300, total customer credit3300, net15450 |

IDs are generation02 examples only. Fresh03 will generate its own references. Creation responses in private E2E metadata may retain their original DRAFT marker; the live UI and timestamped health document-state snapshots are authoritative final states. Deliberate `DEMO-DENIED-*` drafts/approval examples remain as evidence; they are not recorded obligations or real transactions. Do not approve/post them accidentally. Automated fixtures are not substitutes for owner testing.

## Owner test sheet

Use unique `MANUAL-UAT-<case>-<sequence>` references and the current Pakistan business date. Test only fictitious values. Keep enough settled funds and AVAILABLE stock; do not assume pending cheques or customer surplus are cash. Above15000 requires exact Administrator approval in this synthetic policy. Every row starts unchecked; fill actual results yourself. Evidence may be a local screenshot or official document number.

| Case | Role | Action | Expected result | Actual result | Owner PASS/FAIL | Screenshot/evidence |
|---|---|---|---|---|---|---|
| U01 | All four | Sign in/out, inspect demo banner and allowed navigation | Correct role, visible synthetic banner; logout loses access | ____ | [ ] PASS [ ] FAIL | ____ |
| U02 | Administrator | Review masters, period, categories, approved policies and numbered funding | Fictitious, explicit synthetic configuration; no main data | ____ | [ ] PASS [ ] FAIL | ____ |
| U03 | Inventory | Consume1kg raw then independently produce5 bottleA | Raw decreases1; finished increases5; no automatic BOM | ____ | [ ] PASS [ ] FAIL | ____ |
| U04 | Inventory | Attempt consumption above available quantity | Rejected; no negative stock or partial journal | ____ | [ ] PASS [ ] FAIL | ____ |
| U05 | Accounts | Receive another demo raw purchase without invoice | AVAILABLE stock increases; invoice remains pending; no invented payable | ____ | [ ] PASS [ ] FAIL | ____ |
| U06 | Accounts | Record its invoice, pay partially then settle remainder | One payable; no second stock receipt; one money debit per payment | ____ | [ ] PASS [ ] FAIL | ____ |
| U07 | Sales | Create GST challan with explicit manual GST and confirm it | Correct AVAILABLE dispatch; GST debit and official number | ____ | [ ] PASS [ ] FAIL | ____ |
| U08 | Sales | Create NON_GST challan and inspect both ledgers | GST remains separate; NON_GST has no GST amount | ____ | [ ] PASS [ ] FAIL | ____ |
| U09 | Accounts | Receive partial GST payment across two GST challans | One money/customer credit; correct allocations and unpaid amounts | ____ | [ ] PASS [ ] FAIL | ____ |
| U10 | Accounts | Try wrong-customer or GST/NON_GST allocation | Rejected atomically | ____ | [ ] PASS [ ] FAIL | ____ |
| U11 | Accounts | Receive, deposit and clear a new DEMO cheque | Pending holding then bank movement; no second customer credit | ____ | [ ] PASS [ ] FAIL | ____ |
| U12 | Accounts/Admin | Allocate another DEMO cheque initially/later; request/approve/post dishonour | Exact compensation of its allocations/remaining credit only | ____ | [ ] PASS [ ] FAIL | ____ |
| U13 | Sales/Inventory | Request a valid return, receive to QUARANTINED | Available unchanged until inspection; no financial credit | ____ | [ ] PASS [ ] FAIL | ____ |
| U14 | Inventory/Admin | Inspect into reusable/damaged; approve exact disposition | Paired condition transfers; totals reconcile; no cash effects | ____ | [ ] PASS [ ] FAIL | ____ |
| U15 | Accounts/Admin | Request/approve/post price-only and eligible return credits | Manual valuation, original component/quantity caps, no stock/money event | ____ | [ ] PASS [ ] FAIL | ____ |
| U16 | Sales/Accounts | Inspect paid-source credit/surplus and unpaid balances | No negative challan outstanding; unapplied receipts and surplus distinct | ____ | [ ] PASS [ ] FAIL | ____ |
| U17 | Accounts | Record a new12000 utility expense without payment | One obligation/payable; no bank/cash decrease | ____ | [ ] PASS [ ] FAIL | ____ |
| U18 | Accounts | Pay5000 then7000 from eligible accounts | Payable7000 then0; partial then paid; exact one debit per payment | ____ | [ ] PASS [ ] FAIL | ____ |
| U19 | Accounts | Record-and-immediately-pay a small expense | Atomic obligation and full settlement; no vendor/customer/stock mutation | ____ | [ ] PASS [ ] FAIL | ____ |
| U20 | Accounts/Admin | Submit an expense above15000, approve exact version, record it | Staff cannot approve; Accounts can record after Administrator approval | ____ | [ ] PASS [ ] FAIL | ____ |
| U21 | Administrator | Edit/deactivate a demo category; try a new expense using it | New use denied; historical identity/payment history preserved | ____ | [ ] PASS [ ] FAIL | ____ |
| U22 | Accounts/Admin | Request a posted-expense correction and review it | Immutable linked proposal/approval; financial/reversal effects stay blocked | ____ | [ ] PASS [ ] FAIL | ____ |
| U23 | Accounts/Admin | Try overpayment, unverified account, duplicate source and insufficient funds | Reject before partial effects; threshold approval does not bypass deficit approval | ____ | [ ] PASS [ ] FAIL | ____ |
| U24 | Inventory/Sales/Accounts | Try forbidden financial/physical actions through each role | Inventory cannot see selling rates/GST/expense APIs; Sales cannot pay expenses; Accounts cannot change stock | ____ | [ ] PASS [ ] FAIL | ____ |
| U25 | All/Admin | Inspect mobile390px and desktop; run all reconciliation/health checks | Usable controls, no overflow/errors; every supported projection matches | ____ | [ ] PASS [ ] FAIL | ____ |

## Troubleshooting and evidence

Use `Invoke-UPMSUAT.ps1 -Action Health -RunId 02`. Read private `server/.local/p27c/uat-02-e2e.json`, timestamped health/browser records and `uat-02-server.stdout.log` / `.stderr.log`; screenshots are under `tmp/w06/p27c/uat-02/`. Do not share encrypted credential files or passwords. If a form reports stale category, money balance, payable, policy or approval, refresh evidence and save a new draft version; obtain approval again when needed. Do not manually change SQL balances to make a test pass.

Blocked real operations: live activation/opening imports, backdating, tax/withholding, payroll/advances, outgoing cheques/cards/gateways/FX, financial correction/reversal effects and real refunds. Demo policies do not approve any of these for the company. No external email, SMS or payment gateway is enabled.

## Owner sign-off — leave blank until you test

Owner/reviewer: ____  Date: ____  Demo generation: ____  Source commit: ____

Cases passed: ____  Cases failed/blocked: ____  Evidence folder: ____

Findings and required changes: ____

[ ] Manual UAT accepted  [ ] Changes required  [ ] Not yet executed

Owner signature: ____  Independent technical reviewer: ____

This sign-off does not authorize merge, deployment, real company activation or P2.8; each requires a separate instruction.
