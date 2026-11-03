# UAT-1A — delivery challan display identity

Starting commit: `bff3158e341fc34df8768bab024d60053c2dcb74` on `feature/upms-uat1-ui-reports-workflows`.
Candidate branch: `feature/upms-uat1a-challan-display-number`.

An explicit normalized challan number is now the single customer-facing identity. A record with internal `DC-0002` and explicit `CH-001` prints exactly **Delivery Challan No: CH-001** once. Without an explicit number, its generated DC number is displayed. An unnumbered draft has a Draft label; supplier/payment/external references are never substituted as its challan identity.

PHP `ChallanNumbers::display()` and read-only presentation aliases, mirrored by the shared client helper, separate presentation from stored evidence. Details, delivery notes, challan search results, sales/return reports, company register, party ledger and stock-movement report/export use this policy. Returns resolve the original source by immutable document ID and expose a read-only source display alias; `originalId`, `originalReference`, generated numbers and all stored relationships remain unchanged. Administrative API responses retain canonical raw reference fields alongside display aliases for audit/reconciliation and internal-number lookup. This is a display correction, not renumbering.

The form label is **Delivery Challan Number (optional)** and explains automatic fallback. The duplicate custom heading and the Custom/Official dual-number print line are removed. Money-allocation and historical reconciliation notices remain in the authenticated view but the entire challan money-effect container is excluded from the customer print. Approved logo/contact, customer, lines, rates, discounts/totals and signatures remain.

Normalization, company-wide duplicate rejection and serialization under the existing identity-guard posting transaction are retained. The posting check also compares custom claims with existing generated numbers. Existing reserved DC/CR/VP/RF prefixes prevent new custom numbers from occupying current or future internal generated namespaces. Outer whitespace/case variants normalize identically; invalid/confusable Unicode and repeated separators remain rejected. O/0 and I/1 remain distinct literal characters. No native SQL unique index was introduced; broad-CRUD compromise remains outside application-mediated uniqueness guarantees.

No migrations, historical rewrites, reimports, administrator/password changes, sequence changes, financial posting/math changes, 29-table schema changes, 72-guard changes, backup modifications or production setting changes were made. Cheques and Hafta code/business requirements are unchanged; Hafta clarification remains with Haris.

## Acceptance evidence

- PHP: 99 tests, 1,399 assertions; scoped Pint check passed.
- React: 264 tests in 37 files; ESLint and management build passed.
- Fresh isolated consolidated integration: 21 independent integer-oracle checkpoints. Duplicate normalized concurrent postings return one 200 and one 409. Both generated/custom register and ledger lookups work. Posted canonical bytes are compared before/after read-only display requests and after the linked return; they remain identical.
- A custom linked return posts its existing financial behavior: one bottle restored, 7.13 client credit; final stock 119 bottles, client balance 13.27, net sales 35.65. Money movement balances remain unchanged by this display correction. Synthetic fixtures only.
- Genuine isolated encrypted recovery: 29 tables, 72 triggers, 270 rows. Source relationships and reconciliation pass.
- Existing foundation/document/expense/refund suites plus HTTP/security differential results are in `evidence/`.
- Actual built UI → real PHP HTTP kernel → local MariaDB: 133 GET requests, 12 screenshots, eight Chrome PDFs and five downloaded Excel exports. All requests returned 200; no business writes occur during browser acceptance. Both UI lookup terms show the custom identity, and the return link reaches the original immutable source ID.
- Eight PDFs (ten pages) were rendered and visually inspected. Source identity exclusion, single-number heading, essential contents, bounds, blank pages and repeated headings were checked. Excel sales 57.04, return credits 21.39, final customer balance 13.27 and stock movements 119 match the independent scenario.
- Owner records/administrators/control state are fingerprinted read-only before and after using a fixed owner database binding. Automated fixtures never replace that binding. See `evidence/owner-preservation.json`.

## Commands and local retest

Run from the repository root with the owning Windows identity for DPAPI/ACL-bound local fixture credentials:

```powershell
node scripts/uat1a-regressions.mjs
node scripts/uat1a-integration.mjs
# From upms.client: node node_modules/vitest/vitest.mjs run --maxWorkers=4
# From upms.client: node node_modules/eslint/bin/eslint.js .
# From upms.client: node node_modules/vite/bin/vite.js build --config vite.management.config.js
node scripts/uat1a-browser.mjs
# Bundled Python: scripts/uat1a-print-verify.py
# Bundled Python: scripts/uat1a-render-review.py
node scripts/uat1a-owner-preservation.mjs
```

PHP units run from `upms.php` with `../tmp/php-runtime/bin/php.exe vendor/bin/phpunit --testsuite Unit --no-progress`. Source style is checked with `vendor/bin/pint --test app/Upms/ChallanNumbers.php app/Upms/SimpleV1.php tests/Unit/ChallanDisplayTest.php`.

Refresh the existing local dashboard at `http://127.0.0.1:5173/management` using the same credentials. Open an existing posted challan; do not edit/repost it. Compare the screen and Print Preview, search by either stored number, then inspect a linked return. No production deployment is performed or authorized by this correction.
