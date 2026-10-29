# PHP-7.8 test results

Baseline SHA: `c769239b0ec4e92bf7e4540693758cc222d31314`. Branch: `feature/upms-php-7-8-security-remediation`. Executed 29 October 2026 (Asia/Karachi; machine timestamps UTC). PHP 8.3.36 / 8.4.27; Composer 2.10.3; MariaDB 10.11.19 on verified loopback port 3330; Chrome 156.0.8078.48.

| Executed verification | Actual outcome |
| --- | --- |
| Full accepted management matrix, PHP 8.3 and 8.4 | Ten suites pass; 2,670 HTTP comparisons / 132 SQL snapshots |
| Independent PHP-7.6 pricing runtime suites | Both pass: 83 HTTP / four SQL snapshots each; combined management/pricing 2,836 HTTP / 140 SQL |
| PHP-7.1 integrity and privilege probes inside PHP-6 | 126 corruption probes, 26 denied privilege checks and four allowed rolled-back no-ops per runtime |
| PHPUnit | 75 tests / 1,355 assertions on each PHP runtime; includes new MIME rejection and management error-header tests |
| Inquiry SMTP differential fixtures | 66 comparisons / 78 checks on each runtime; strict TLS, rejection/unknown outcomes, deduplication/concurrency; no live mail |
| Express reference | 290 passed, zero failed/skipped |
| React | 201 tests / 29 files passed |
| Production public/private build and ESLint | Passed; existing private >500 kB chunk warning remains |
| Composer platform requirements | Passed on both PHP versions |
| Composer normal / strict validation | Both exit 0; baseline strict exit 1 |
| Composer locked audit | Exit 0 / no advisories; baseline exit 1 with one Mime advisory |
| Full PHP Pint | Exit 0; baseline seven failed files |
| Public responsive browser | 80 views at eight widths across ten routes; no overflow or JavaScript errors; local measured CLS 0 |
| Dashboard browser | Eight widths, three ranges, thirteen routes; exact posted sales/returns/net, no dashboard financial writes, drafts/cancelled/unverified stock excluded |
| Mobile management forms | 27 views, labels/no overflow; no unexpected CSP or JavaScript errors; no form posting |
| HTTPS security | 14 checks / 44 captured responses; both PHP versions and final individual frame controls pass; success/rejection/error/static/auth policy, actual secure cookie, logout, server expiry, iframe positive/negative controls; response inventory in EVIDENCE.json |
| Public contact form / replay | 28 checks pass; final DevelopmentFile journal has exactly one message after replay; approved address/contact and all 111 public asset hashes verified |
| Canonical worksheet through browser controls | Sixteen posted checkpoints / thirteen kinds; four XLSX and six financial print PDFs |
| Editable-rate browser acceptance | Nine checks pass: chosen rates, master unchanged, stale draft review, historical partial/full returns and final-cent allocation, custom exports/PDF, baseline preserved |
| Financial artifacts | Seven PDFs / eight rendered pages inspected; six XLSX CRC/XML checks; no dashboard/navigation in financial printouts |
| Original UAT preservation | All ten business-table row counts/hashes match for each of the three earlier schemas; all six original HTTPS pages return 200 |
| Final isolated preview health | Actual public/private HTTP 200, real browser login and positive engine identity verified |

A later diagnostic Pint invocation from the repository root used the default preset; its log is retained as pint-wrong-cwd.json. The full accepted command run from upms.php uses the committed PSR-12 configuration and exits 0 (pint-final.json), as does the collector.

The automated collector has 15 passing exit-code entries, including both runtime unit/inquiry/platform checks, reconciliation contracts, fixtures, audit/validation/Pint, React/build/lint. The independent matrix also covers concurrent/idempotent writes, rollback, lost-COMMIT recovery, immutable-document behavior, reconciliation and restricted SQL privileges. Existing assertions were not lowered. No schema/business-rule change was needed.

## Corrected harness attempts and limitations

Initial worktree setup encountered sandbox filesystem/socket restrictions; approved local operations were rerun with access to the same verified loopback engine. The sandboxed Express run stalled waiting for its local SMTP connection and was stopped; the complete unchanged suite then passed with loopback access. PHP-7.8's isolated worktree required canonical-path resolution in the existing exact-directory guard, not a weaker engine check.

Security harness corrections included the actual Stock Movement report URL, a visible desktop viewport for logout, reloading the login form before a second login, collecting Chrome security logs through CDP, and separating each iframe target from the controlled parent frame. An intercepted parent still had Unknown IP address space in Chrome and masked private CSP behind Local Network Access. The final harness instead uses an actual temporary HTTPS loopback parent; it rejects network/certificate/connection failures as substitutes for CSP evidence. Final negative checks require a real denial for each target, alongside positive controls; no production policy exception is installed.

A clean Windows worktree initially converted two approved text SVGs to CRLF during checkout, changing generated names despite unchanged rendering. Their original byte content was restored before the final build; all 111 public artifacts now exactly match PHP-7.7. An initial public inquiry check had already retained a DevelopmentFile journal; the final check uses a fresh separate journal while preserving the earlier evidence. No old UAT evidence or database was reset. The actual custom-rate, worksheet and PDF/XLSX tests passed on the isolated preview with enforced CSP.

Native Excel and a real Windows print destination remain **PENDING OWNER**. Synthetic/headless checks do not approve real data provenance or production operations. Existing command-authenticity, SQL posted-row/self-user limits, unknown SMTP procedure, hosting, backup/recovery and owner UAT risks remain open. Production remains **NO-GO**.

## Owner preview and safe service commands

Use a disposable browser profile, because cookies are host scoped across ports:

- Public: https://127.0.0.1:9473
- Management: https://127.0.0.1:9474/management/
- Username: php-admin. Random password: private file `C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php6-browser-1793237608109/credentials.json` (never committed).

Run from the isolated checkout `C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php78-workspace`:

```powershell
& ./scripts/php-7-8-services.ps1 -Action Stop
& ./scripts/php-7-8-services.ps1 -Php 84
$env:PHP_UAT_SETUP='tmp/php-runtime/php78-uat-latest.json'
$env:PHP_UAT_ORIGIN='https://127.0.0.1:9474'
$env:PHP_PUBLIC_ORIGIN='https://127.0.0.1:9473'
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs --basic
```

The helper checks its own PID/executable/creation time/config record, expected 9473/9474/9384 ports and positively identified loopback synthetic engine. Stop preserves the database; it does not stop installed Apache or any earlier owner service. `php-7-8-prepare.mjs` creates a new empty disposable fixture only after new ports are free; do not rerun preparation as a reset. Current synthetic schema: `upms_test_php_6_browser_1793237608109`.

Original groups remain 9443/9444, 9453/9454 and 9463/9464, with their original roots and credentials. The original source checkout remains on PHP-7.7 intentionally so those running services keep their accepted implementation. Review the new branch in the isolated checkout. Raw logs/screenshots/PDFs/workbooks stay private under `tmp/php-runtime/php78` and the new fixture directory; sanitized hashes and summaries are committed in EVIDENCE.json.

Owner sign-off: **PENDING OWNER**. No deployment, production ZIP, DNS change, live SMTP delivery, real owner database access or administrator reset. Stop for owner review before PHP-8.
