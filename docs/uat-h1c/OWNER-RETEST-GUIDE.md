# Owner retest guide — UAT-H1C

Branch: `feature/upms-uath1c-hafta-deductions` from `eb68d5a2fba8bda9ca56122a81be2fa773c72251`.

Both existing owner UAT workspaces (5173 and 5180), their administrators, fixed bindings and business records are preserved. The existing Ahmed expense was inspected read-only; it has a retained employee snapshot and one canonical cash batch. It has NOT been applied automatically. This delivery does not deploy migrations or enable the 38-table extension on those existing databases.

## Reproduce isolated acceptance

Run as the owning Windows identity from `C:\Users\zasah\source\repos\UPMS`. No passwords belong on command lines or in source. These scripts use protected local engine credentials and generate independent synthetic administrator passwords in memory.

```powershell
node scripts/uath1c-integration.mjs
node scripts/uath1c-negative.mjs
node scripts/uath1c-browser.mjs
node scripts/uath1c-recovery.mjs
node scripts/uath1c-artifacts.mjs
```

Run them in order, without a long pause that expires the synthetic session. The browser runner uses a separate temporary loopback port 5191 and closes it afterward. It does not replace 5173/5180. Automated Chrome uses its own synthetic authenticated session; it does not copy owner administrator password hashes.

The browser flow reviews a new production draft, explicitly confirms initial zero stock and selects an opening date, then finalizes 200 bottles at PKR 10 labor. It separately reviews a posted 1,200 employee expense, selects the effective date, supplies evidence and checks authorization before applying. Refresh must show 800 payable, 0 direct cash payments and 1,200 existing payments applied. Open original expense/production sources; inspect desktop/mobile, date filters, Print/PDF and Excel. Ordinary transport remains outside wage deductions.

A separately reviewed UAT migration/release is needed before using these controls on preserved owner records. For any eventual manual retest: verify labor opening coverage explicitly before attempting Ahmed's existing payment; never invent a zero opening or rewrite an immutable later opening.

## Regression commands

```powershell
node scripts/uath1c-regressions.mjs
node scripts/uath1c-full-regression.mjs
node scripts/uath1c-browser-regressions.mjs
node upms.client/node_modules/vitest/vitest.mjs run --root upms.client
```

Expected evidence locations: `docs/uat-h1c/evidence/`, with actual acceptance PDFs in `output/pdf/uath1c-*.pdf`. Review test JSON/logs rather than assuming a running server means acceptance passed.

## Resolution matrix

| Owner issue | Correction | Evidence |
| --- | --- | --- |
| New item requires leaving production to open zero stock | Explicit inline checkbox/date; atomic separate opening + production | integration, negative integration, Chrome |
| Existing employee expense cannot reduce Hafta | Approved full-source immutable allocation; no second cash debit | integration, source hashes, Chrome |
| Expense association confused with wages/advance | Separate actions; authoritative direct settlement; unsupported advances blocked | negative integration, UI/React |
| Opening history silently assumed zero | Explicit coverage required; unverified remains unverified | negative integration, reports |
| Repeated allocation/first production risks duplicates | Command idempotency, native uniqueness, serialized stock/identity locks | concurrent/retry/fault checks |
| Concurrent classification detail read timed out | Remove repeated base verification and per-candidate schema/data reloads; retain readiness checks | refreshed Chrome acceptance |
| Technical payment classification unclear in reports | Separate direct/applied totals; signed effective-date expense adjustment and source links | PDF/Excel validation |
