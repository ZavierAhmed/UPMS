# PHP-6 independent differential evidence

Starting SHA: `bb1cce051f7bef253f826c37e3a51584ee32df8c`.
Authority: unchanged Express Simple V1 service, register, reconcile, exact utilities,
validators, transactions and SQL acceptance tests. Reviewed PHP-5 evidence and retained
its reversal review and column-grant limitations without changing policy.

## Method and exact comparisons

`scripts/php-6-differential.mjs` verifies MariaDB 10.11.19 on private loopback port
3330, creates two new synthetic schemas and applies only unchanged original migrations
there. Express and Laravel use independent schemas. PHP has a dedicated column-scoped
runtime account; fixture admin credentials never enter application configuration.

Express requests execute the actual management router through Supertest. PHP executes
the real Laravel HTTP kernel/middleware in a fresh process per request, including
cookie/CSRF authentication. The CLI bridge is not a public route. Browser fixtures
separately exercise actual Apache HTTPS and PHP FastCGI for both supported versions.

Each of PHP 8.3.36 and 8.4.27 passes **250 PHP-6 HTTP comparisons and 11 full state
comparisons**. Retained PHP-2/3/4/5 runners pass 144/223/265/270 HTTP comparisons and
13/12/14/13 state comparisons respectively, using fresh independent schemas per run.
Combined totals are **1,152 HTTP and 63 SQL-state comparisons per runtime**.

The prior obsolete EXPENSE pending-boundary probes are replaced by nine real
Express/PHP expense lifecycle comparisons via php-6-scope-regression.mjs. Existing
accepted master/opening/challan/return/payment/correction scenarios remain intact;
counts were not preserved by weakening security or skipping assertions.

Complete status/JSON values and scalar types compare exactly. Only generated error
correlation UUID values and created_at timestamps are normalized. Money, quantities,
IDs, official references, fingerprints, command results, journals and SQL payload
strings are unchanged. Full state snapshots cover v1_control, v1_items, v1_stock,
v1_parties, v1_documents, v1_lines, v1_stock_journal, v1_party_journal, v1_audit and
v1_commands. Hashes identify each successful complete-state comparison.

Only the winning command key in simultaneous same-document double-click tests gets a
winner marker, as in prior evidence; its fingerprint/result and all IDs remain exact.
Other overlaps deliberately observe the lead transaction inside a synthetic delay
before starting the second request, so no identity remapping is necessary.

## Expense, report and reconciliation cases

Cash/Bank Transfer expenses, multiple categories/payees, source-permitted duplicate
references, large exact amounts, strict schema/default/max-length errors, absent paid
metadata/method, cheque/party/line rejection, nonpositive/malformed/excess amounts,
future dates, edits/versions, justified cancellation and immutable posted/cancelled
expenses are covered. All expense-only effects leave stock, both journals, lines and
counters unchanged.

The all-thirteen-kind historical fixture verifies exact combined totals, unrelated
advances, unverified parties, date boundaries, filtered events versus as-of balances,
original identities and references, running brought-forward ledgers, stock movements,
overview and original return history. Read snapshots prove these endpoints mutate no
business tables. [Report acceptance](PHP-6-REPORT-ACCEPTANCE.md) lists expected values.

Thirty-three corruption probes compare full responses and unchanged before/after
state: all thirteen kinds' total/identity/paid-only evidence plus immutable lines,
stock source/projection, journals, audit and command receipts. Original rows are restored
after each probe. Exact mismatch categories and source errors match; four observed
source blind spots are retained and proposed for separate review in
[findings](PHP-6-RECONCILIATION-FINDINGS.md). Final reconciliation is matched and performs
no repair.

## Atomicity, security and commit uncertainty

Audit/command insertion faults roll back expense status/total, audit and receipt, with
unchanged stock, ledgers and counters. Original-key retry succeeds after trigger removal.
Same-document different-key posting commits once. Post-versus-cancel races test both
lead orders: either posting wins and cancellation fails, or cancellation wins and
posting fails; exact state matches both engines.

Discarded successful HTTP responses replay in new PHP processes. For actual unknown
database commit results, two private TCP proxies forward COMMIT, observe success,
then drop the acknowledgements. Both APIs return 503 while evidence is already durable.
Original-key replay returns the saved result with no extra effect. The test-only
php-test-commit-proxy.mjs frames MySQL packets, handling fragmented/coalesced TCP
chunks and PDO COM_STMT_CLOSE followed by COMMIT. The same robust helper is used by
the retained PHP-5 runner; authoritative Node business code is unchanged.

Server-side connection termination before commit separately proves rollback and safe
original-key retry. UUID, canonical conflict, actor binding, CSRF/origin, operator and
READY/replay ordering remain tested. Seventeen SQL denials preserve immutable evidence,
protected fields and absence of DDL/global access. Existing allowed document/counter
columns remain subject to application predicates, not row-level SQL ACLs; no wider
privileges are claimed or granted.

## Reproduction and artifacts

Use supported Node 22.23.4. Set private synthetic PHP_TEST_ADMIN_USER/PHP_TEST_ADMIN_PASSWORD,
explicit PHP6_BINARY and optional JSON-array PHP6_ARGS; run
`node scripts/php-6-differential.mjs`. This machine's PHP 8.4 requires
`["-d","extension=sodium"]`. The runner reads no owner environment and drops no schema.
Run retained milestones with their respective binary variables. New PHPUnit fixtures
are provisioned separately on the private port-3328 engine.

php-6-input-fixtures.mjs captures thirty Node-derived input/default/filter vectors.
php-6-browser-setup.mjs provisions another fresh schema/private Apache config; use
ephemeral localhost TLS, FastCGI on 9084, HTTPS on 9444 and the private env path in
UPMS_PHP2_ENV. Set PHP_BROWSER_VERSION and run php-6-browser.mjs. Both versions pass
26 checks including native XLSX downloads and actual A4 rendering, with zero JS errors.
Installed PHP/Apache settings remain unchanged.

php-6-evidence.mjs asserts all counts and assembles [machine evidence](PHP-6-EVIDENCE.json)
from ignored local reports. It retains case statuses, synthetic schema identifiers,
state hashes, fault/commit/corruption checks and print/export hashes; passwords, APP_KEY,
session tokens and private fixtures are excluded. [Public hashes](PHP-6-PUBLIC-ASSETS.json)
retain all 111 files from PHP-5. **The owner database was never accessed or modified.**
