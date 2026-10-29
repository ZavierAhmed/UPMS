# PHP-7.9 test results

Baseline: `cc9452887213eb82ad884c713e99df54568066aa`. Branch: `feature/upms-php-7-9-product-and-ui-refresh`. Executed 29 October 2026, Asia/Karachi (machine timestamps UTC). PHP 8.3.36 / 8.4.27; Composer 2.10.3; verified MariaDB 10.11.19 on loopback 3330; Chrome 156.0.8078.48.

| Executed verification | Actual result |
| --- | --- |
| Management PHP-2 through PHP-6 on both runtimes | Ten suites pass; 2,670 HTTP comparisons / 132 SQL snapshots |
| Independent custom-rate runtime suites | Both pass, 83 HTTP / four SQL snapshots each; combined 2,836 HTTP / 140 SQL |
| PHP-7.1 probes inside PHP-6 | 126 corruption probes, 26 denied privilege checks and four allowed rolled-back no-ops per runtime |
| PHPUnit | 75 tests / 1,355 assertions on each runtime |
| Final PHP/Express inquiry parity | 68 comparisons / 80 checks on each runtime, including explicit success for new categories and strict local SMTP fixtures |
| Baseline-crossing legacy custom compatibility | Both PHP versions preserve original saved entry/fingerprint/reference/message; changed-category replay conflicts; Express normalized input/cache compatibility passes |
| Express reference | 291 passed, zero failed/skipped |
| Final React | 210 tests / 30 files passed |
| Final production public/private build / ESLint | Passed; existing private >500 kB chunk warning retained |
| Composer audit / normal and strict validation | All exit 0; no dependency/lockfile change; Mime remains patched 7.4.22 |
| Platform / full Pint | Both runtime platform checks pass; full Pint exits 0 |
| Public actual HTTPS responsive | Eleven routes × seven widths = 77 views; five categories, illustrations, metadata and no overflow/CSP/JavaScript errors |
| Catalog / sitemap / retired route | Eleven registered/prerendered routes, five categories; new routes present; custom absent from registry/sitemap and actual retired URL returns 404 |
| Actual new-category contact submissions | Stickers and Cartons accepted through React/PHP; two DevelopmentFile messages, exact category labels and idempotent replay without duplicates |
| New login actual HTTPS | Seven widths, stacked fields, orange submit, keyboard order, password visibility, incorrect-password/pending/success/logout states; actual expired-session refresh returns to a safe login message and fresh-CSRF reauthentication succeeds; no false record loading or CSP/JS errors |
| Selected color contrast | Login minimum 5.57:1, dashboard/KPI minimum 5.31:1; bounded checks, not full certification |
| PHP-7.8 HTTPS security acceptance | Fourteen checks / 44 response captures, including login/logout, server expiry, CSRF/origin rejection, malformed request/exception, static/error policy and positive/negative iframe controls |
| Dashboard | Eight widths, three ranges and thirteen routes; exact posted values, labels and authorized navigation preserved |
| Mobile business forms | 27 views, labels/no overflow/no unexpected CSP or JS errors; no financial submissions |
| Canonical worksheet via UI | Sixteen posted checkpoints / thirteen kinds, stock 123, A 200.00, B 80.00, vendor -185.00, expenses 18.00; four Excel exports / six print PDFs |
| Custom-rate UI | Nine checks: chosen rates, unchanged master, stale review, historical partial/full returns, discounted final-cent allocation, custom PDF/XLSX, preserved baseline worksheet |
| Financial artifact inspection | Seven PDFs / eight rendered pages inspected; six XLSX CRC/XML checks; no dashboard/navigation leaked into financial prints |
| Earlier UAT preservation | Ten business-table counts/hashes identical across each of four older schemas; eight original HTTPS pages still return 200 |
| Final new-preview health / served assets | Public and management 200, actual staff login, exact engine identity; actual HTTPS JS/CSS bytes match the final build |

The management matrix retains concurrency/idempotency, rollback, lost-COMMIT recovery, reconciliation, immutable-document and restricted SQL checks. Existing financial algorithms, dashboard aggregation, authentication backend, queries, schema, grants and counters are unchanged. The inquiry whitelist additions are the sole backend behavior change. Public original photos/fonts remain byte-identical; ASSET-MANIFEST records authorized HTML/bundle changes and both original illustrations.

## Intermediate results and corrections

The initial collector retained a failing React entry for intentionally changed category/image/route expectations. Those assertions were updated to five categories/eleven routes and explicit real illustrations; the complete final React run passed 210 tests. Tests were not removed or weakened. Initial Express sitemap count expected ten routes; updated eleven-route and new/retired-route assertions pass in the complete 291-test rerun.

The first worksheet attempt stopped on the unchanged harness's exact Sign in selector because a decorative text arrow had been added to the button. The arrow was removed; the still-empty fresh fixture then passed the entire worksheet. Actual screenshot inspection also caught generic inherited form/button CSS overriding parts of the intended login. Scoped selectors fixed stacked fields/orange submit, and the strengthened actual-browser test verifies those properties and recaptures final screenshots. A private-build diagnostic used the wrong working directory; the proper full final build passed. Baseline journal testing needed approved local filesystem access; its complete final rerun passed on both runtimes. Partial logs/evidence remain private and are not represented as green final runs.

No native Excel or physical Windows printer acceptance is claimed. These and owner visual/business acceptance remain **PENDING OWNER**. Production remains **NO-GO** for original command-authenticity, SQL posted-row/self-user scope, historical provenance, unknown SMTP handling, actual GoDaddy capabilities, backup/recovery and owner decisions. No risk is accepted automatically.

## Isolated owner preview

- Public: https://127.0.0.1:9483
- Management: https://127.0.0.1:9484/management/
- Use a separate disposable browser profile: cookies are host scoped across ports.
- Username php-admin; random password is only in the private local file `C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php6-browser-1793242918635/credentials.json`.
- Fresh synthetic schema: `upms_test_php_6_browser_1793242918635`; CGI loopback 9485.

Operate from `C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php79-workspace`:

```powershell
& ./scripts/php-7-9-services.ps1 -Action Stop
& ./scripts/php-7-9-services.ps1 -Php 84
$env:PHP_UAT_SETUP='tmp/php-runtime/php79-uat-latest.json'
$env:PHP_UAT_ORIGIN='https://127.0.0.1:9484'
$env:PHP_PUBLIC_ORIGIN='https://127.0.0.1:9483'
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs --basic
```

Only the new helper-owned processes are stopped; PID/executable/creation/config identity and expected ports are checked. Startup verifies free loopback ports and the exact synthetic engine/datadir/environment. Stop preserves the database. Preparation creates a new disposable fixture; do not use it to reset an existing one. Self-signed loopback TLS is local-only; SMTP TLS verification is unchanged. No HSTS or production hosting policy changed.

Earlier 9443/9444, 9453/9454, 9463/9464 and 9473/9474 groups retain their roots, PHP source/vendor, credentials and owner business records. The original checkout and PHP-7.8 checkout intentionally remain on their accepted branches because their running wrappers load those files. Review PHP-7.9 in its separate checkout.

Raw screenshots/logs are private under tmp/php-runtime/php79; PDFs/workbooks are in the new fixture directory. Sanitized evidence and raw-file hashes are in EVIDENCE.json. No owner database access, live posting/SMTP, administrator reset, new schema migration, production package, deployment or DNS change. Stop for owner feedback before PHP-8.
