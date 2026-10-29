# PHP-7.5 owner acceptance checklist

PHP-7.7 design preview is separate again: public 9463, management 9464 (CGI 9284).
See PHP-7-7-DESIGN-REVIEW.md for private credentials and safe lifecycle commands.
Use a separate browser profile. The 7.5/7.6 services, credentials and records stay
available. Review the removed company number, centered responsive cards/media,
management navigation/forms and exact date-covered dashboard charts. New design
acceptance, native Excel/Windows printing and all production decisions remain
PENDING OWNER. No local automated design check is owner sign-off.

PHP-7.6 follow-up: use PHP-7-6-UAT-CORRECTIONS.md for the revised address/custom-rate
acceptance on separate URLs 9453/9454. At PHP-7.6 start the owner had already added
entries to the original fixture (18 documents, 23 bottles); those are retained,
not reset to the historical baseline below. Its running wrappers now use a private
frozen PHP-7.5 backend. Full baseline health assertions are inappropriate after
intentional owner postings; use health --basic for connectivity. Do not stop the
original services to test the revised fixture. All new owner acceptance remains
PENDING OWNER; the old worksheet remains historical evidence, not current live totals.

**All manual items are PENDING OWNER.** Record your name, date/time (Asia/Karachi),
tested Git SHA, runtime/browser, expected/actual result, evidence path and decision.
Automation is review evidence, not your sign-off.

## Open the retained application

Public: https://127.0.0.1:9443
Management: https://127.0.0.1:9444/management/

Services are left running with PHP 8.4.27 and private MariaDB 3330. Username:
`php-admin`. Open the following file locally for its new random password:

`C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php6-browser-1793216012369/credentials.json`

Do not paste it into chat, print it in a terminal, email it or commit it. It is
synthetic, unrelated to the real administrator. Use a disposable browser profile
with an exception only for this isolated loopback self-signed certificate. The
certificate is short-lived; renewal instructions are below. SMTP verification
must remain enabled.

The retained original contains the completed automated worksheet. Inspect its
16 posted entries without adding transactions to this reference. Item X = item 1;
A = party 1; V = party 2; B = party 3. worksheet-results.json in the same private
directory holds every document ID and intermediate result.

## Personally post all kinds on a NEW blank fixture

| Workflow | Expected cumulative result | Owner status |
| --- | --- | --- |
| CLIENT_OPENING A 100 owed to company | A +100.00 | PENDING OWNER |
| VENDOR_OPENING V 200 owed by company | V -200.00 | PENDING OWNER |
| Item X approved selling price 5.00; STOCK_OPENING 100 | X 100 | PENDING OWNER |
| PRODUCTION 20 | X 120 | PENDING OWNER |
| PURCHASE credit V 30 at 2.00 | X 150; V -260.00 | PENDING OWNER |
| CHALLAN A 40 at 5.00, NONE discount | X 110; A 300.00 | PENDING OWNER |
| CHALLAN_RETURN 10 against original line | X 120; A 250.00 | PENDING OWNER |
| CLIENT_PAYMENT Cash 50 | A 200.00 | PENDING OWNER |
| VENDOR_PAYMENT Bank 75 | V -185.00 | PENDING OWNER |
| CLIENT_PAYMENT Cheque 20; PAYMENT_REVERSAL | A 180.00 then 200.00; original immutable | PENDING OWNER |
| STOCK_CORRECTION +3 against stock opening | X 123 | PENDING OWNER |
| B CLIENT_OPENING 100; before activity OPENING_CORRECTION target 80 | B 80.00; original unchanged; credit delta 20.00 | PENDING OWNER |
| Paid EXPENSE Cash 12.34 and Bank 5.66 | Expenses 18.00; stock/parties unchanged | PENDING OWNER |

For every applicable kind, inspect creation, edit, validation, permitted draft
cancellation, posting confirmation, history, source linkage and print output.
Check each intermediate result. Keep rejected operations and allowed vendor
Cash/Bank reversals on separate disposable fixtures. Confirm zero unintended
effects for every negative case in AUTOMATED-EVIDENCE. Never inject corruption
into the reference worksheet.

## Reports, public site and recovery

- [ ] PENDING OWNER: inventory, stock movements, dashboard overview, client/vendor ledgers, challan/return histories and register; exact signs, brought-forward balances, advances, discounts, partial returns, paid purchases, Cash/Bank labels and date/type/reference filters.
- [ ] PENDING OWNER: separately review matched, reviewRequired, integrityFindings and authenticityVerified; the last remains false and requires a risk decision.
- [ ] PENDING OWNER: open all four actual XLSX files in Microsoft Excel; verify numbers, signs, totals and filters. They are in `tmp/php-runtime/php6-browser-1793216012369/worksheet-downloads-1793216169200`.
- [ ] PENDING OWNER: use actual Windows Print or a Windows PDF printer for challan, return acknowledgement, receipt, vendor payment, expense and register. Check page breaks, all rows and signatures. Headless references are `worksheet-<label>.pdf` in the UAT folder; expense must show Expense <id>, not Draft.
- [ ] PENDING OWNER: public ten routes on desktop/mobile, menu, images/alt text, approved company identity, WhatsApp/maps/category preselection and synthetic inquiry. DevelopmentFile saves a private test file; it is not email delivery. No real customer text or SMTP.
- [ ] PENDING OWNER: read RESTORE-RESULTS and inspect counts/hashes and clone application evidence. Personal recovery acceptance is unsigned.
- [ ] PENDING OWNER: review every FAIL in DEFECTS and personally decide every risk in RELEASE-READINESS.

## Startup, health, restart and shutdown

Run PowerShell from `C:/Users/zasah/source/repos/UPMS`. No global runtime change:

```powershell
# Actual HTTPS, random-credential login and accepted worksheet health:
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs
# Stop only recorded UAT Apache/CGI, verifying process identity/custom config:
& ./scripts/php-7-5-services.ps1 -Action Stop
# Restart the retained ORIGINAL; use -Php 83 only for intentional runtime review:
& ./scripts/php-7-5-services.ps1 -Php 84
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs
```

The helper refuses occupied ports, unexpected schemas, environment host/port/schema
mismatches and wrong engine identity. It never stops the installed Apache service.
It leaves MariaDB running. For complete shutdown, first stop HTTP writers, then
cleanly shut down only the verified private database through its private client
settings. Never stop an unrelated database service. To start the exact engine if
it is stopped, in a separate terminal:

```powershell
$engine = Get-Content tmp/php-runtime/php2-engine.json -Raw | ConvertFrom-Json
if ($engine.port -ne 3330 -or $engine.data -ne (Join-Path $PWD 'tmp/php-runtime/php2-engine-1793148736638')) { throw 'Unexpected engine' }
& ./tmp/production-readiness/remote-mariadb/mariadb-10.11.19-winx64/bin/mariadbd.exe ('--defaults-file=' + $engine.data + '/my.ini') --bind-address=127.0.0.1 --skip-log-bin --console
```

Keep that terminal open, or use an explicitly hidden owned process. Start the
HTTP services in another terminal and run health. Investigate health failures;
a URL alone is not evidence of availability. No service-wide Apache stop command.

For optional complete shutdown after stopping the UAT HTTP writers, verify the
engine again and use only the retained private recovery client file:

```powershell
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe --input-type=module -e "import {verifyUatEngine} from './scripts/php-7-5-engine-guard.mjs'; await verifyUatEngine();"
if ($LASTEXITCODE -ne 0) { throw 'Engine identity failed; shutdown refused' }
$recovery = Get-Content tmp/php-runtime/php75-restore-latest.json -Raw | ConvertFrom-Json
& ./tmp/production-readiness/remote-mariadb/mariadb-10.11.19-winx64/bin/mariadb-admin.exe ('--defaults-extra-file='+$recovery.directory+'/client-private.ini') shutdown
```

The private options file explicitly selects loopback 3330. This is not a command
to run while another owner review or local test is active.

For expired local certificate renewal: stop UAT HTTP services, read the current
private setup pointer, and run OpenSSL against its existing server.key/server.crt:

```powershell
$uat = Get-Content tmp/php-runtime/php7-uat-latest.json -Raw | ConvertFrom-Json
& C:/xampp/apache/bin/openssl.exe req -x509 -newkey rsa:2048 -sha256 -nodes -keyout ($uat.directory+'/server.key') -out ($uat.directory+'/server.crt') -days 1 -subj /CN=127.0.0.1 -addext subjectAltName=IP:127.0.0.1 -config C:/xampp/apache/conf/openssl.cnf
& ./scripts/php-7-5-services.ps1 -Php 84
```

Renewing the local certificate does not create/reset a database. Do not rerun the
public preparation helper against an already prepared config: it appends listeners.

## Make a fresh manual fixture

After inspecting retained evidence, stop HTTP services, preserve the pointer and
prepare a NEW timestamped schema with NEW random credentials:

```powershell
Copy-Item -LiteralPath tmp/php-runtime/php7-uat-latest.json -Destination tmp/php-runtime/php75-accepted-worksheet.json
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-uat-prepare.mjs
& ./scripts/php-7-5-services.ps1 -Php 84
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs --basic
```

Open the newly pointed directory's credentials.json locally. Perform the worksheet
yourself; running posting automation does not count as manual acceptance. Record
actuals and evidence. Neither old nor new schema may be reset/deleted.

To return later: stop HTTP services, copy the saved accepted pointer back to
php7-uat-latest.json, and start the original services. Directory ACLs must list
only the owner, SYSTEM and Administrators; verify using icacls. Keep raw dumps,
private environments and inquiry bodies outside Git.

Owner name/date/SHA: **PENDING OWNER**.
Workflow acceptance: **PENDING OWNER**.
Risk decisions: **PENDING OWNER**.
Production decision: **BLOCKED**. Send feedback before PHP-8.


## PHP-7.8 security owner review — PENDING OWNER

Review PHP-7-8-SECURITY-REVIEW, DEPENDENCY-AUDIT, HTTP-HEADERS, TEST-RESULTS and
RELEASE-GATES. The four technical failures have passing corrective evidence. This
is not production approval. Record name/date/tested final SHA and expected/actual
results for login/logout/expiry, dashboard/ranges, business forms, inquiries,
editable rates/returns, A4 printing and native Excel. All owner fields remain
PENDING OWNER.

Use the separate https://127.0.0.1:9473 public and
https://127.0.0.1:9474/management/ previews in a disposable browser profile.
Private credentials and guarded startup/shutdown commands are in PHP-7-8-TEST-RESULTS.
All three earlier UAT groups are preserved. Do not approve original command
authenticity, SQL posted/self-user restrictions, historical imports, unknown SMTP
outcomes, GoDaddy capability, backup/recovery or HSTS policy by implication.
Production remains NO-GO. Stop for owner review before PHP-8.


## PHP-7.9 product and interface review — PENDING OWNER

Review PHP-7-9-PRODUCT-CHANGES, LOGIN-DESIGN, COLOR-AND-UX, INQUIRY-PARITY,
VISUAL-ACCEPTANCE, ASSET-MANIFEST and TEST-RESULTS. Verify five catalog categories,
Stickers/Cartons illustrations and preselection, retired custom 404, the new staff
login states, dashboard palette, mobile workflows and financial printing/exports.
Record owner name/date/tested final SHA and actual results. All owner fields remain
PENDING OWNER; native Excel and Windows printing are still human acceptance items.

The separate preview is https://127.0.0.1:9483 and
https://127.0.0.1:9484/management/. Use a disposable browser profile. Credentials
location and guarded service commands are in PHP-7-9-TEST-RESULTS. All four earlier
UAT groups remain preserved, including PHP-7.8 on 9473/9474. PHP-7.8 security gates
remain green; original authenticity/SQL/provenance/SMTP/hosting/recovery decisions
are not approved by this UI milestone. Production remains NO-GO. Stop before PHP-8.


## PHP-8 Phase A — BLOCKED; deployment not approved

The owner authorized deployment preparation. Actual account preflight is required
first. Public HTTPS verifies, but app.unique-plastic.com has an untrusted self-signed
certificate and the configured remote DB greeting does not advertise TLS. No DB
credentials or SQL were sent. Need authenticated cPanel/SSH access and an approved
protected read-only DB transport before capability/data/account inventory.

Review PHP-8-HOSTING-PREFLIGHT and SECURITY-GATES. Two-admin provisioning/policy,
production profile, Linux package, backup/restore and host-matching staging are
NOT IMPLEMENTED/EXECUTED in this blocked Phase A change. All proposed procedures
are plans, not acceptance evidence. Preserve legitimate data and account IDs;
resolve conflicts before action. No cutover or residual risk is approved by this
checklist. Final Phase D approval must identify the concrete reviewed release,
identity plan, backup/rollback evidence and remaining risk decisions.

## PHP-8 manual hosting action

Follow deployment/manual/README.md and return sanitized capability results. Do not send passwords or session URLs. No live provisioning/deployment/record changes are authorized. Current local evidence is in PHP-8-TEST-RESULTS.md.
