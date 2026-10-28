# PHP-7.5 full-system UAT results

Executed 28–29 October 2026 (Asia/Karachi). Starting SHA:
`49f680f9c97e03fb38f7ac30fcf43b8a789a756e`, verified PHP-7.1 baseline.
Branch: `feature/upms-php-7-5-full-system-uat`. The delivery message reports the
final commit; a commit cannot contain its own hash.

The complete synthetic application is available for owner review. Automated
financial workflows and separate-clone recovery passed. **Production remains
BLOCKED. Owner acceptance is PENDING OWNER.**

| Area | Status | Evidence |
| --- | --- | --- |
| Database isolation | PASS | MariaDB 10.11.19, loopback 3330, exact private data directory and binding positively verified |
| PHP 8.3/8.4 management/inquiry matrix | PASS | Newly executed counts in AUTOMATED-EVIDENCE and JSON manifest |
| Fixed thirteen-kind worksheet | PASS | 16 posted documents, every posting checkpoint verified |
| Four XLSX / six print artifacts | PASS | ZIP CRC, worksheet XML and values; seven PDF pages visually reviewed |
| Public site | PASS | Desktop/mobile routes; one DevelopmentFile message/replay; 111 approved hashes unchanged |
| Disaster recovery | PASS | All rows of 19 tables equal before clone use; original preserved |
| Management security headers | FAIL | CSP and X-Frame-Options absent |
| Composer dependency audit | FAIL | New medium Symfony Mime advisory |
| Full-tree Pint / strict Composer validation | FAIL | Existing formatting findings / exact-pin warnings |
| Manual workflow, native Excel, Windows printing | PENDING OWNER | No owner-generated evidence or sign-off |
| Actual cPanel and production deployment | BLOCKED | Hosting verification, failed gates and owner decisions outstanding |

## Accepted worksheet

Schema: `upms_test_php_6_browser_1793216012369`. Item X is item 1; A is party 1;
V is party 2; B is party 3. All business entries used actual React controls over
Apache HTTPS/FastCGI. GET checks independently verified each posting; no SQL
shortcut seeded these business rows. Party forms created their verified openings.

| Checkpoint | X bottles | A receivable | B receivable | V signed balance | Expenses | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A opening | - | 100.00 | - | - | 0.00 | PASS |
| V opening | - | 100.00 | - | -200.00 | 0.00 | PASS |
| Stock opening 100 | 100 | 100.00 | - | -200.00 | 0.00 | PASS |
| Production 20 | 120 | 100.00 | - | -200.00 | 0.00 | PASS |
| Credit purchase 30 at 2.00 | 150 | 100.00 | - | -260.00 | 0.00 | PASS |
| Challan 40 at 5.00, NONE discount | 110 | 300.00 | - | -260.00 | 0.00 | PASS |
| Return 10 | 120 | 250.00 | - | -260.00 | 0.00 | PASS |
| Cash receipt 50 | 120 | 200.00 | - | -260.00 | 0.00 | PASS |
| Vendor bank payment 75 | 120 | 200.00 | - | -185.00 | 0.00 | PASS |
| Cheque receipt 20 | 120 | 180.00 | - | -185.00 | 0.00 | PASS |
| Cheque reversal | 120 | 200.00 | - | -185.00 | 0.00 | PASS |
| Stock correction +3 | 123 | 200.00 | - | -185.00 | 0.00 | PASS |
| B opening 100 | 123 | 200.00 | 100.00 | -185.00 | 0.00 | PASS |
| B opening correction target 80 | 123 | 200.00 | 80.00 | -185.00 | 0.00 | PASS |
| Cash expense 12.34 | 123 | 200.00 | 80.00 | -185.00 | 12.34 | PASS |
| Bank expense 5.66 | 123 | 200.00 | 80.00 | -185.00 | 18.00 | PASS |

The seventeenth checkpoint was a read-only final-state verification. Vendor
payable is 185.00, represented by signed balance -185.00. Cheque source document
10 retained its posted payload, lines and total; reversal 11 restored A to 200.00.
B opening 13 remained unchanged; correction 14 targets 80.00, a credit delta of
20.00. Expenses 15/16 leave stock/party balances unchanged. Challan 6 is DC-0001;
return 7 is DCR-0007; receipt 8 is CR-0008; vendor payment 9 is VP-0009.

All checkpoint reconciliation reads returned matched=true, reviewRequired=false,
no integrity findings and authenticityVerified=false. The last field is the
documented verification limit, never proof of original command authenticity.
Fault/corruption and negative tests used separate disposable schemas. Clone-only
draft 17 was cancelled without posting; the original retains 16 posted documents.

## Retained environment

Public: https://127.0.0.1:9443
Management: https://127.0.0.1:9444/management/

Actual HTTP 200 and random-credential browser login were verified after restarting
the original configuration. PHP 8.4.27 services are left running on loopback only.
The short-lived local certificate is self-signed; SMTP verification was never
disabled. The last health timestamp and browser version are in the manifest.

Username: `php-admin`. Password is local only in
`tmp/php-runtime/php6-browser-1793216012369/credentials.json`.
Directory ACLs allow only the owner, SYSTEM and Administrators. Do not publish
this folder. Raw evidence remains ignored; PHP-7-5-EVIDENCE.json contains sanitized
counts, hashes and 33 raw-evidence SHA-256 digests.

See OWNER-CHECKLIST, AUTOMATED-EVIDENCE, RESTORE-RESULTS, DEFECTS and
RELEASE-READINESS. No owner DB, real administrator reset, live SMTP, production
profile, deployment, DNS change or release package was used. Express, business
implementation, schema, grant definitions, lockfiles and approved assets remain
unchanged. Stop for owner feedback before PHP-8.
