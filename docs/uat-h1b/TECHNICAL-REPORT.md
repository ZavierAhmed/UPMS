# UAT-H1B technical report

Base branch `feature/upms-uath1-startup-403-fix`, local and remote SHA verified as `5a883e022cefa8c75a4e7f3f76d88c3a1541a2ff`. Work is on `feature/upms-uath1b-production-ux`. No production access or deployment.

## Implemented behavior

Production editors and draft reviews now query an authenticated, read-only `GET /api/v1/management/simple-v1/stock-readiness?items=...&date=...`. The existing administrator/operator/password-rotation boundary applies. Strict date, numeric-ID, filter and count validation precedes database reads. The response compares actual active items, stock verification and posted opening journals against the selected production date; it reports every READY, MISSING, LATER, INACTIVE, UNKNOWN or inconsistent item. No stock is verified by this endpoint.

Missing items show **Stock opening required** and **Set Up Stock Opening**. Later openings show their actual date and explain why a duplicate opening is not a remedy. Opening setup carries a bounded date and an internal production return path. Existing saved production payload/version remain unchanged; unsaved employee, item, quantities, rates, date and reference remain in the existing signed-in draft cache through SPA navigation. Editing the opening retains the return context too. Unsaved cache does not claim durability across logout/tab closure; saved drafts remain database records.

An opening quantity of zero requires an explicit UI confirmation that there genuinely was no prior stock, followed by the existing posting confirmation. No opening or zero quantity is created automatically. The existing PHP opening/duplicate/date checks and posting transaction remain authoritative. Item-specific production errors now include item identity and useful instructions; the request reference is retained separately from the business message. No accounting rule was weakened.

Finalization requires a fresh item/date/employee-snapshot review. Guidance for a previous selection cannot enable a changed date; the hook invalidates it immediately and rechecks again immediately before the existing post command. The backend still checks active/versioned items and locks stock inside `BusinessCommand`. Concurrent/stale requests do not gain permission through the UI check.

The employee field, Add Employee, clear and unallocated controls now have contained responsive sizing. The item grid uses an explicit `production-labor-layout` class and matching six-column desktop header. Small layouts expose real labels; monetary amounts align right and use PKR formatting. The fragile `:has(laborRate)` rules that hid the header were removed. Purchase, Challan, Opening and Correction do not acquire labor columns.

Production summaries show quantity, allocation, estimated/earned labor and document status. Drafts say **Estimated labor — not yet earned**. Posted totals and rows read the immutable `labor_earnings` evidence; no generic zero-money card is substituted for wages. Production-only print content uses these terms and retains the approved logo, item information and signatures. Other financial templates are unchanged.

## Actual validation

| Validation | Result |
|---|---|
| Full PHP/security | 166 tests / 1,906 assertions passed |
| PHP unit subset | 112 tests / 1,434 assertions passed |
| React | 277 tests / 39 files passed |
| ESLint / management build / changed PHP formatting | Passed |
| Prior foundation, documents, expenses, refunds | All four financial harnesses passed |
| Pricing/security differential | 83 HTTP comparisons / 4 snapshots passed |
| Full stock/labor integration | 34 independent checkpoints + 13 labor/security groups passed |
| Broad encrypted recovery | 34 tables / 88 guards / 656 rows restored |
| Required production Chrome scenario | Eight groups passed; 200 bottles / PKR 2,000.00, zero money/party movement, idempotent post |
| Final responsive checks | 390, 768, 1024, 1440, 1920; no page overflow, aligned desktop inputs, usable controls |
| Prior Employee Hafta browser | 157 PHP requests, five PDFs and four exports passed in separate fixtures |
| Prior startup browser | Seven groups / 236 HTTP requests passed on isolated port 5191 |
| Acceptance-fixture encrypted backup/recovery | Authenticated roundtrip, corrupt/wrong-key rejection, genuine 34/88 restore of 147 rows passed |
| Production PDFs | Two real Chrome PDFs, two pages visually/numerically inspected; no clipped characters or blank pages |

Results and request statuses are in `evidence/`; negative 400/401/409 responses are asserted security/business tests, not hidden failures. Development attempts with an incomplete login wait or missing test-helper document version failed and were corrected in the harness; those attempts were not counted as passes. Existing transaction checks were not changed to accommodate them.

## Preservation and limits

Both owner bindings and all business/identity/control tables were fingerprinted before/after; sessions/login attempts are excluded as normal transient authentication data. The four pre-existing changed UAT-H1 evidence files and unrelated assets are excluded from this commit. Neither owner administrator, password, draft, stock balance nor labor history was reset or recreated. Ports 5173 and 5180 remain operational against their original fixed bindings.

The model remains **34 tables / 88 guards**. No schema resource, guard definition, production setting, operational backup job, public website or cheque accounting changed. Backup tests here use isolated snapshots; the production backup job was not accessed or declared compatible with a new model.

Explicit labor opening/payable coverage remains independent of stock opening. The PKR 2,000 earning is not automatically a verified payable or cash payment. Existing no-advance, chronology, immutable history and residual CRUD-credential limitations remain as documented in UAT-H1. Local acceptance is not production readiness approval.

## Developer reproduction (fresh synthetic fixtures only)

From the repository root, after building the management client and with the verified local MariaDB engine running:

```powershell
node scripts/uath1b-fixture.mjs --no-before
node scripts/uath1b-browser.mjs
node scripts/uath1b-final-checks.mjs
node scripts/uath1b-opening-return.mjs
node scripts/uath1b-regressions.mjs
node scripts/uath1b-full-integration.mjs
node scripts/uath1b-browser-regressions.mjs
```

Run these sequentially: acceptance uses test port 5189, prior startup tests use 5191, and neither uses owner ports 5173/5180. The fixture command intentionally creates a new synthetic database; it never reinitializes a fixed owner binding. `--no-before` preserves the genuine baseline comparison images. See the PDF verification/render scripts for artifact QA.
