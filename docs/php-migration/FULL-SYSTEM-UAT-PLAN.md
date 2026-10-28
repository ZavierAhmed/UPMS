# PHP-7.5 — separate owner-operated full-system acceptance plan

## PHP-7.6 correction addendum

Manual CHALLAN rates are approved. The item price initializes the line and remains
a reference; a different positive chosen rate is valid. Check per-line Use default
price, persisted custom draft rates and explicit stale-item review that preserves
custom rates. Rejection solely for differing from the master is superseded.
Keep the original default-rate worksheet numbers below unchanged. Add a separate
item at default 50.00 and separate clients: 100 at 45.00 = 4,500.00 and 100 at
55.00 = 5,500.00. Verify unchanged master price/version and quantity-based stock.
Test discounts, original-rate partial/full/final-cent returns after a master change,
print output and exact ledger/reconciliation. Address acceptance now requires
F-260/A; map/coordinates/identity stay unchanged. Revised UAT uses 9453/9454/9184;
the existing owner's 9443/9444 services and posted entries must be preserved.
See PHP-7-6-UAT-CORRECTIONS.md. Manual sign-off remains PENDING OWNER.

**Prepared by PHP-7; not executed as PHP-7.5 and not production approval.** Stop after
reviewing PHP-7. PHP-7.1 source findings need separate review before deciding whether
PHP-7.5 can proceed. The owner records the tested Git SHA, browser/runtime versions,
actual versus expected results, artifacts and go/no-go decision. Never use the owner's
`upms` schema, production admin, hosting credentials, mailboxes or live web roots.

## Preconditions and isolation

Use a private local Windows workspace and the installed Node 22.23.4, PHP 8.3.36 or
8.4.27, MariaDB 10.11.19, Apache, OpenSSL and Chrome. PHP 8.4 on this machine needs
`-d extension=sodium`; do not change the installed php.ini. Both the CGI and matching
CLI must have the required extensions. Verify process creation/termination and private
local flock/atomic-rename support before SMTP testing. No Node server runs in the
browser-serving path. Node scripts are offline fixture/build/test tools only.

The existing **isolated** engine is bound to 127.0.0.1:3330, with its private settings
in `tmp/php-runtime/php2-engine.json`. Check that its port is 3330 and its data directory
is the synthetic test engine. Start it in a dedicated terminal using the bundled
`mariadbd.exe --defaults-file=<private data directory>/my.ini --bind-address=127.0.0.1
--skip-log-bin --console`. Do not use a saved remote/production connection profile.
The fixture scripts assert the engine/version and create a new schema on every run;
they never reset an existing one. Schema names are `upms_test_php_6_browser_<timestamp>`
(the historical PHP-6 helper name is retained). This is a new UAT database, separate
from all PHP-7 automated test databases and from the owner database. Runtime grants
remain the restricted PHP-3/6 grants; no application migration or schema bootstrap
occurs during an HTTP request.

After the separately authorized UAT starts, run:

```powershell
# From the repository, with its bundled Node 22 directory on PATH:
node C:/nvm4w/nodejs/node_modules/npm/bin/npm-cli.js run build --prefix upms.client
node scripts/php-7-uat-prepare.mjs
$uat = Get-Content tmp/php-runtime/php7-uat-latest.json -Raw | ConvertFrom-Json
```

The preparation script generates a new random synthetic administrator password and
saves it **only** in `$uat.directory/credentials.json`. Read it locally when signing
in as `php-admin`; do not paste it into chat, commit it or reuse a known automated
fixture password. `php.env`, credentials, cert/key, DB details, inquiry journal/outbox
and generated artifacts are all private ignored files. On Windows, verify with
`icacls` that only the owner and intended local service identities can read them;
correct inherited ACLs before continuing. Unix equivalents must use 0700 directories
and 0600 private files. Do not share the prepared directory as an artifact.

The script prepares configuration, assets and a one-day self-signed local certificate;
it starts no services and does not carry out acceptance scenarios. Syntax is checked
in PHP-7; its owner-only random-credential provisioning path is reserved for PHP-7.5.
The underlying fixture/browser preparation paths are exercised by PHP-7 automation.

## HTTPS startup and shutdown

Check ports 9443, 9444 and 9084 are free. In terminal A:

```powershell
$uat = Get-Content tmp/php-runtime/php7-uat-latest.json -Raw | ConvertFrom-Json
$env:UPMS_PHP2_ENV = $uat.env
$env:PHP_FCGI_MAX_REQUESTS = '0' # local test process only
& C:/php84/php-cgi.exe -d extension=sodium -b 127.0.0.1:9084
```

In terminal B:

```powershell
$uat = Get-Content tmp/php-runtime/php7-uat-latest.json -Raw | ConvertFrom-Json
& C:/xampp/apache/bin/httpd.exe -f $uat.config
```

Repeat later with `tmp/php-runtime/bin/php-cgi.exe` for PHP 8.3. Use a new prepared
schema for a clean second-runtime run. Do not start two CGI processes on the same port.
The custom Apache configuration binds only loopback; it does not replace the installed
Apache service or its configuration. No hosts-file or DNS edit is required.

Open `https://127.0.0.1:9443` (public) and `https://127.0.0.1:9444/management/` (private).
Use separate disposable browser profiles when checking the no-cookie public path:
cookies are host-scoped and localhost ports alone do not isolate cookie storage.
The inquiry handler ignores private cookies if supplied. Eventual public and private
hosting must use the separately reviewed public/management hostnames, not port-based
cookie isolation assumptions.
Trust only the freshly generated local certificate for this isolated test or use a
disposable test-browser profile with the local certificate exception. Never disable
SMTP certificate validation. Verify the private page displays Simple V1.2B, its
requests reach `/api/v1/management/simple-v1`, and no legacy ERP route is activated.

To stop: sign out; close the disposable browser; stop the foreground Apache process
with Ctrl+C in B, then CGI in A. Stop the synthetic MariaDB only after all DB work is
complete, using its dedicated foreground terminal/clean shutdown. Do not issue a
service-wide Apache stop. Verify loopback listeners are gone. Keep the database and
private evidence until the acceptance decision; do not recursively delete guessed paths.

## Browser worksheet: all thirteen active kinds

Use today's Karachi date, unique synthetic references and whole-bottle quantities.
Record each document ID/version, before/after stock, ledger balance, history and
official reference. Saving/editing/cancelling a draft must have zero posted business
effect. Finalize only after checking the review screen. Refresh and sign out/in to
verify persisted results. Run this sequence on an initially empty UAT schema:

| Step / kind | Owner action | Expected incremental and cumulative result |
| --- | --- | --- |
| 1 CLIENT_OPENING | Create client A, verified opening 100.00 OWED_TO_COMPANY | A ledger +100.00; no stock |
| 2 VENDOR_OPENING | Create vendor V, verified opening 200.00 OWED_BY_COMPANY | V signed ledger -200.00; no stock |
| 3 STOCK_OPENING | Create bottle X with explicit opening 100 | X = 100; no party ledger |
| 4 PRODUCTION | Stock In, Production, X quantity 20 | X = 120; no party ledger |
| 5 PURCHASE | Credit purchase from V, X quantity 30 at 2.00 | Total 60.00; X = 150; V = -260.00 |
| 6 CHALLAN | A, X quantity 40 at 5.00, no discount | Total 200.00; X = 110; A = +300.00; official DC reference |
| 7 CHALLAN_RETURN | Open that posted challan, Create Return, accept 10 bottles | Credit 50.00; X = 120; A = +250.00; original/history preserved |
| 8 CLIENT_PAYMENT | A, Cash 50.00 with unique reference | A = +200.00; official CR reference; stock 120 |
| 9 VENDOR_PAYMENT | V, Bank Transfer 75.00 with unique reference | V = -185.00; official VP reference; stock 120 |
| 10 PAYMENT_REVERSAL | First record A cheque received 20.00 with cheque reference; then reverse it with justification | A temporarily +180.00 then +200.00; original receipt stays posted with reversal link |
| 11 STOCK_CORRECTION | Stock In correction against X's allowed opening source, delta +3 and justification | X = 123; party ledgers unchanged |
| 12 OPENING_CORRECTION | Create separate correction-only client B opening +100.00; before business activity, target +80.00 OWED_TO_COMPANY | B = +80.00; correction journal credit 20.00; original opening untouched; document target total 80.00 |
| 13 EXPENSE | Paid Cash 12.34 Utilities and paid Bank Transfer 5.66 Rent, payee/description/reference required | Expenses total 18.00; X = 123; A +200.00, B +80.00, V -185.00 unchanged; no cash/bank balance is invented |

Select item/party/source from the UI and record the displayed ID; do not assume ID
numbers. The correction routes are `/management/stock-in/new?kind=STOCK_CORRECTION&item=<X>`
and `/management/client-payments/new?kind=OPENING_CORRECTION&party=<B>`. Select the actual
posted source via `correctsId`. Reversal is under Client Payments, Record cheque
dishonour/payment reversal. The separate B party avoids the intentional prohibition
on opening correction after normal business activity.

Add negative cases without altering the worksheet totals: insufficient stock, excess
return, return of someone else's line, duplicate payment reference, client Cash/Bank
Transfer reversal through the cheque-dishonour path, second reversal, reversal of a
reversal, stale version and opening correction after A's
activity. Confirm rejected operations leave documents/journals/audit unchanged except
permitted draft history. Cancel reviewed drafts with a reason. For discounts, save a
separate 40×5.00 draft with FIXED 20.00 (review 180.00), then PERCENT 10 (review 180.00);
cancel it to preserve worksheet balances. Check boundary/rounding values using the
existing PHP-3 fixtures rather than mental floating-point calculations.

The reversal policy is explicit: eligible client Cheque Received reversal is allowed;
client Cash and Bank Transfer reversal through that path is rejected; eligible vendor
Cash and Bank Transfer reversal is allowed; reversing the same original twice or
reversing a reversal is rejected. Vendor reversal is not a vendor-cheque dishonour
feature. Use a separate side vendor with zero opening: pay 9.87, reverse 9.87 and
confirm its signed balance returns to zero, original payment stays posted, and the
reversal snapshot identifies that source vendor. Repeat with both permitted methods.
Attempt the duplicate and reversal-of-reversal cases and verify zero extra journal
effects. Check Cash/Bank client negatives on a separate throwaway worksheet/fixture
so additional test receipts do not alter the thirteen-kind worksheet above. Its X 123,
A +200.00, B +80.00, V -185.00 and 18.00 expenses remain the required outcomes.

Reconciliation now returns structured `integrityFindings` as well as legacy mismatch
strings. On separate synthetic copies exercise expense party/type corruption, all-kind
SQL/payload date disagreement, numeric money values, malformed command evidence and
contradictory reversal snapshots. Each must be visible and read-only. Test historical
dates and pre-entry-version challans separately. Consistent future posted dates and
missing post receipts raise provenance-review warnings without asserting that valid
historical/imported mathematics is corrupt. `matched: true` with `reviewRequired: true`
does not pass acceptance until provenance is reviewed. `authenticityVerified` is false:
no retained canonical operation/input exists to authenticate a command fingerprint.

## Reports, exports and printing

Inspect item X movements/opening/production/purchase/challan/return/correction and its
final 123 bottles. A's chronological running ledger ends +200.00; B ends +80.00; V
ends -185.00 (185.00 payable). Verify debit/credit signs and source links. Check
Company Transactions includes all kinds, correct type/date/reference filters, paid
expense methods/categories, 18.00 selected expenses and 185.00 vendor payable. These
are document/party-ledger reports, not a new cashbook, bank balance or profit model.

Download actual filtered Company Transactions, client/vendor ledger and stock XLSX
files. Open them in the owner's Excel/LibreOffice; compare exact amounts, dates,
references, row counts, Unicode names and totals with the browser. Print delivery note,
return acknowledgement, receipts/payments, register and expenses to A4 PDF and a real
printer if needed. A posted expense must say `Expense <id>`, never `Draft <id>`;
drafts must still say Draft. Confirm no report/export/print sends a financial write.

Check reconciliation returns matched for the clean worksheet, without modifying data.
An unexpected mismatch blocks approval. A matched result is not proof against the
known blind spots listed below.

## Public inquiries, security and concurrency

On desktop and mobile, review every public page/category, approved identity/images,
address/maps, WhatsApp links, navigation and product-specific category preselection.
Submit synthetic data with DevelopmentFile; confirm development_saved, a reference,
no-email wording and exactly one private outbox file with the entered details. It must
work with no management session/CSRF. Verify its response issues no management cookie.
Use only the isolated TLS SMTP fixture for accepted/rejected/unavailable/unknown tests;
never switch the test to a real customer mailbox. SMTP acceptance is not inbox receipt.

Run `scripts/php-7-inquiries.mjs` with each explicit PHP7_BINARY (and sodium args for
8.4). Keep its private evidence pointer. It exercises bad origins/cross-site requests,
content/size/depth/field errors, rate/Retry-After, replay/conflict, eight separate worker
SMTP and outbox races, abandoned state, expiry/capacity/corruption and certificate
rejection. Compare response JSON and mail counts. Do not delete a pending journal to
force a retry; contact using its reference when delivery is uncertain.

From the public origin, private management UI/API must fail. From the private origin,
public inquiry submission must fail the public host check. In browser DevTools, reject
a missing/wrong Origin, missing/wrong management CSRF and stale version without writes;
confirm HttpOnly/Secure/SameSite Strict management cookie, sign out invalidation and
session expiry returning to login. For the 30-minute idle test, leave a separate session
without polling for over 30 minutes and try a protected read; retain the failure as
evidence. Automated PHPUnit also tests idle/absolute expiry without waiting eight hours.
Do not relax runtime session timers to make manual testing faster.

Use the PHP-2–6 differential runners for concurrent posting/lost-COMMIT acknowledgement
and complete business-state comparisons. They provision their own independent loopback
schemas; do not point them at this worksheet or the owner database. Record one committed
effect/receipt, not merely one success response.

## Backup/restore rehearsal (separate test clone)

Stop browser writes and inquiry delivery first. Record the exact UAT schema, engine,
table counts, all worksheet balances/stock, counters and representative history/command
receipts. Assert the schema matches `^upms_test_php_6_browser_[0-9]+$`, host is 127.0.0.1
and port is 3330 before each dump/import. Use a private 0600 client option file with
only the **synthetic** admin credential; never put a password on a command line.

Use the bundled `mariadb-dump.exe --defaults-extra-file=<private options> --single-transaction
--routines --triggers --result-file=<private UTF-8 dump> <exact UAT schema>`. The defaults
option must come first. Check exit status and nonempty output. Hash the dump and privately
back up the matching application configuration and inquiry journal/outbox. Do not commit
them. Create a new empty `upms_test_php_6_restore_<timestamp>` schema on the same isolated
engine, import using the MariaDB client/administration tool into that clone, and never
overwrite the worksheet schema. Verify table counts, X 123, A +200.00, B +80.00, V -185.00,
18.00 expenses, original posted rows, counters, receipt identities and reconciliation.

If exercising the restored app, provision a new restricted test-only runtime account
for the clone, a copied private environment and distinct browser session. Verify the
copied database name before startup. Do not reuse recent SMTP/outbox receipts from an
older backup without reconciling in-flight inquiry references. Record elapsed restore
time, hashes, differences and recovery decision. Backup creation alone is not a passed
restore rehearsal. This owner-run rehearsal is pending after PHP-7.

## Known findings and decision

PHP-7.1 dispositions are in PHP-7-1-INTEGRITY-REVIEW.md and PHP-7-1-RELEASE-RISKS.md.
New reversal drafts and posting derive party identity/snapshot from the source payment,
including an old contradictory draft. Historical posted rows are not rewritten;
contradictory retained evidence is reported for investigation. A legitimate historical
reversal without a snapshot remains compatible. The second-reversal UNIQUE conflict
is preserved; it must not duplicate journal effects.

PHP-6-RECONCILIATION-FINDINGS.md retains the original baseline evidence. PHP-7.1 now
detects expense party evidence, SQL/payload date discrepancies, malformed saved-command
fingerprints and invalid JSON money types in both backends. Valid-looking fingerprints
are not authenticated; id-only receipts cannot identify their original operation.
Do not inject these into the owner database or silently repair historical evidence.
The original 33 probes plus corrective cases are automated in independent synthetic schemas.
Review document/counter column grants as well: app-level posted immutability is not a
row-level database privilege guarantee.

Also review the documented inquiry persistence/expiry and conservative disconnect
differences, CLI/process hosting prerequisites, disk/outbox retention, ACLs and single-host
filesystem assumptions. Native Excel, physical printing, restore rehearsal and owner
acceptance remain pending; local automatic success does not approve shared hosting.

Go only when the owner has signed every worksheet/security/export/restore result,
findings have an explicit disposition, all rejected actions have zero unintended
effects, private credentials/ACLs are verified, and no production configuration or
owner database has been used. Any unexplained financial difference, duplicate mail,
insecure TLS, cross-origin private access or lost evidence is no-go. Record defects
and stop for review; no production deployment, DNS change or release ZIP is authorized.
