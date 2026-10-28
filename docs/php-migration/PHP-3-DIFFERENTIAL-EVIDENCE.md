# PHP-3 independent differential evidence

The authoritative implementation is the unchanged Express Simple V1 service and
its input/exact-money/transaction helpers. `scripts/php-3-differential.mjs` provisions
two fresh schemas for every run on a separately verified loopback MariaDB 10.11.19
instance (port 3330). It applies the original migrations only to these synthetic
schemas and constructs equivalent identities, roles and initial control state.
The PHP runtime uses its own narrowly granted account, never the fixture admin.

Express is exercised through its real management router using Supertest. PHP executes
the actual Laravel HTTP kernel/middleware through the CLI-only HTTP bridge, including
real cookie/CSRF login. Each request starts a new PHP process. The bridge is not
registered as an application route. Actual Apache HTTPS/FastCGI browser acceptance
provides a separate transport check for both PHP versions.

## Comparison rules

Both PHP 8.3.36 and 8.4.27 completed **214 PHP-3 HTTP comparisons** and **12 full
business-state comparisons**. The retained PHP-2 runner separately completed **135
HTTP comparisons and 13 state comparisons per version** using fresh schemas.

Responses compare status and complete JSON values/types. Only generated correlation
UUID values and generated UTC `created_at` milliseconds are normalized. BIGINT and
DECIMAL strings, INT versions/flags, fieldErrors/details, payloads, arrays, monetary
values and official identifiers remain exact. Full state comparisons include:
v1_control, v1_items, v1_stock, v1_parties, v1_documents, v1_lines,
v1_stock_journal, v1_party_journal, v1_audit and v1_commands.

For a different-key concurrent double click, the sole successful command key is
normalized to a winner marker because scheduler choice may differ. No document,
journal, line or official sequence ID is remapped. The last-bottle race starts A,
waits until A is inside a synthetic stock-update delay, then starts B while A remains
in flight; A succeeds and B fails on both engines. Final state is compared exactly.

## Scenarios and failure evidence

- Multi-line production, reversed input order containing IDs 1, 2 and 10; exact
  numeric journal order, no party ledger effect, explicit stock-opening/date gates,
  missing/inactive/stale items, fractions, duplicate lines and empty lines.
- Credit and immediately paid Cash/Bank Transfer purchases, exact multi-rate totals,
  zero-rate source behavior, required/normalized duplicate references, invalid paid
  methods, party kind/opening and date rules. Stock and vendor journal parity.
- Multi-line challans, approved prices/pricingVersion, item snapshots, vehicle/driver/
  HH:mm metadata, stale-price refresh, no negative stock, NONE/FIXED/PERCENT discounts,
  net receivables, zero-total posting refusal, tampered discount snapshot refusal.
- Cancellation for all six kinds, exact version/reason/strict-body errors, canonical
  reordered replay, UUID/CSRF/origin errors, actor-bound conflicts, non-operator denial,
  and immutable posted/cancelled documents. Seven future kinds are rejected even
  when a stored draft or saved command receipt exists, with unchanged business state.
- Different-key double finalization produces one success and one immutable-document
  conflict; last-bottle contention produces one sale and one insufficient-stock
  failure, with the exact field error and available quantity.
- Test-only BEFORE INSERT failures on party journal, audit and command receipt
  roll back stock, lines, journals, status and challan counter. Removing each trigger
  allows same-key retry without a duplicate sale or consumed official number.
- A discarded successful response is retried through a fresh PHP process. Saved
  response and state match without fresh posting effects.
- A synthetic command-insert delay exposes an uncommitted post; fixture admin kills
  the identified connections in the two known synthetic schemas. Both requests fail,
  state including next_dc equals its before snapshot, and same-key retry succeeds.
- Isolated counter fixtures verify 999/1000/1001/1002/10999 boundaries and refusal
  beyond the existing range. This is fixture setup, never a production counter reset.
- SQL-level denials verify immutable-row protection and absence of DDL/global access.
  Reconciliation matches after successful, failed, cancelled and replayed commands.

The retained PHP-2 suite also verifies READY-gate ordering, saved results, actor
binding, role authorization, origin/CSRF enforcement, item/party immutability,
opening balances and rollback. Its pending-module fixture now uses EXPENSE because
PRODUCTION is supported in PHP-3; accepted PHP-2 scenarios remain intact.

## Reproduction and artifacts

Set private synthetic `PHP_TEST_ADMIN_USER` / `PHP_TEST_ADMIN_PASSWORD` and explicit
`PHP3_BINARY`, optionally `PHP3_ARGS` (JSON array). Run
`node scripts/php-3-differential.mjs` with supported Node 22.23.4. Never point fixture
admin variables at the owner instance. The runner verifies engine/port and creates
new `upms_test_php_3_*` schemas; it does not drop prior evidence or read owner env files.
Run the PHP-2 runner with equivalent PHP2 variables for retained contracts.

Generate exact math fixtures with `node scripts/php-3-pricing-fixtures.mjs`; run
PHPUnit on both PHP runtimes. Use `php-3-browser-setup.mjs` for a separate schema and
private Apache/PHP config, then `php-3-browser.mjs` over loopback HTTPS. Set
`PHP_BROWSER_VERSION` for reporting and explicitly enable sodium where required.
The wrapper's test-only variable is `UPMS_PHP2_ENV`; FastCGI recycling is disabled
for this lengthy test session. No installed configuration needs editing.

[PHP-3-EVIDENCE.json](PHP-3-EVIDENCE.json) contains per-request names/statuses/command
keys, state comparison hashes, synthetic schema identifiers, fault/race checks and
both browser runs. It excludes database passwords, session tokens and APP_KEY.
`php-3-evidence.mjs` assembles it from ignored local reports and asserts expected
counts. Private raw fixture environments, screenshots and print PDFs are not staged.
[PHP-3-PUBLIC-ASSETS.json](PHP-3-PUBLIC-ASSETS.json) verifies all 111 public hashes
against PHP-2. No owner database was contacted or modified.
