# PHP-5 independent differential evidence

Reference SHA: `ee70789a7240d5cf076ad110d8d599bb2e55155d`.
Authority: unchanged Express Simple V1 service, input/error validators, exact utilities,
identity/business transactions, migration constraints, register and reconciliation.
Reviewed preceding PHP-4 evidence and original Simple V1 payment/correction SQL tests.

## Method

`scripts/php-5-differential.mjs` verifies loopback MariaDB 10.11.19 on private port
3330 and provisions independent new `upms_test_php_5_*` Express/PHP schemas. It applies
only original migrations there, creates synthetic identities/control state and grants
a dedicated PHP runtime account the same column-scoped business privileges as PHP-3.
Fixture administration never enters the PHP runtime environment.

Express requests use its real management router through Supertest. PHP uses the real
Laravel HTTP kernel and middleware through the private CLI-only HTTP bridge, with a
fresh PHP process per request. Cookie/CSRF login and authorization are exercised.
Separate actual HTTPS Apache/FastCGI browser runs verify transport and unchanged React.

Both PHP 8.3.36 and 8.4.27 pass **261 PHP-5 HTTP comparisons and 13 complete SQL-state
comparisons**. Independent fresh PHP-2/3/4 runs add **605 HTTP and 39 state comparisons
per runtime**. Only future-kind fixtures changed in old runners: EXPENSE remains
blocked, while newly converted kinds are no longer asserted to be pending.

Complete response status, JSON values and types match. Only generated error reference
UUID values and created_at timestamps are normalized. Money, signed quantities,
official identities, document/line/journal IDs, command fingerprints/results, ledger
values and payload JSON remain exact. State comparisons cover v1_control, v1_items,
v1_stock, v1_parties, v1_documents, v1_lines, v1_stock_journal, v1_party_journal,
v1_audit and v1_commands, with snapshot hashes retained in machine evidence.

For a simultaneous different-key same-document double click, only the winning key
gets a winner marker; fingerprint/result/IDs remain unchanged. Other overlaps start
A, observe A inside an isolated journal-insert delay, then start B while A is in
flight. Exact complete state can therefore be compared without ID remapping.

## Financial and correction cases

- Cash/Bank Transfer client partial/full receipts and advances; vendor payable
  reduction and advances; client Cheque Received; missing/invalid amounts and methods;
  external/cheque normalized duplicates; per-kind scope; optional references.
- Verified opening/date/party-kind gates, stale party snapshot review, multiple account
  payments, return plus receipts, immediate paid purchase coexistence and exact ledger
  signs. No automatic allocation, refund, purchase repost or cash/bank balance.
- Client cheque reversal and eligible vendor reversal, exact original amount/party,
  untouched original evidence, invalid original/method/date, reversal-of-reversal,
  repeated reversal and concurrent competing reversals. Existing UNIQUE(corrects_id)
  supplies the observed duplicate guard; see [review](PHP-5-REVERSAL-REVIEW.md).
- Positive/negative stock correction chains, allowed opening/production/correction
  sources, invalid purchase/challan sources and item membership, zero/excessive deltas,
  numeric 2-before-10 journal order and projection/journal reconciliation failure.
- Client/vendor opening correction chains with opposite direction, zero target and
  large exact target; prior journals retained, current balance-derived difference,
  wrong source/party/date/direction/amount rejection and activity restrictions.
- All five new kinds support versioned draft editing, required correction reasons,
  justified cancellation and immutable cancelled/posted entries. Compound format/type
  errors preserve original Zod refinement behavior and complete fieldErrors.
- UUID/canonical input conflict, actor-bound replay, CSRF/origin, designated operator
  and READY gates. Saved results preserve the source's replay-before-READY behavior.

## Faults, overlap and unknown commits

BEFORE INSERT failures on audit/commands/lines occur after the corresponding party
or stock journal effects, and after audit before receipt. Each of the five kinds is
tested for full rollback; removing the trigger allows original-key retry. Same-document
double finalization yields one payment and one immutable conflict. Distinct overlapping
payments both post; distinct overlapping reversals of one source produce one financial
reversal and one unique-constraint error. Full state matches both engines.

An administrator observes a synthetic command-insert delay, then kills only the two
identified transaction connections in the fresh known schemas. Both APIs return 503,
all business state equals its before snapshot, and same-key retry posts once.
Discarding a successful HTTP response and replaying in a fresh PHP process likewise
adds no financial effects.

For a genuinely unknown commit result, private loopback TCP proxies forward database
traffic and arm on v1_commands insertion (COM_QUERY for Node; prepared-statement SQL
for PDO). They forward COMMIT, observe the server's success acknowledgement, then
drop it. Both APIs return 503 even though POSTED status, journal, audit and command
are durable. Both proxies assert that the successful COMMIT acknowledgement was
actually dropped. Original-key replay through the regular API returns the saved
result; complete SQL state is unchanged and identical between Express and PHP.
Proxy listeners/sockets are closed; private environments remain with ignored local
fixtures. No production service or owner connection is involved.

Seventeen SQL denials verify immutable evidence, forbidden deletion/identity/control
changes, absence of DDL/global reads and protected role fields. Existing granted
document/counter columns are not row-level protected by column grants; the application
enforces their business predicates. No broader database protection is claimed.
EXPENSE create/stored-draft/edit/post/cancel and saved receipt replay return 501 without
effects. Final document, ledger, register/filter, overview, movement and reconciliation
responses match; reconciliation is matched and performs no repair.

## Reproduction and artifacts

Set private synthetic PHP_TEST_ADMIN_USER/PHP_TEST_ADMIN_PASSWORD, explicit PHP5_BINARY
and optional JSON-array PHP5_ARGS; run `node scripts/php-5-differential.mjs` using
Node 22.23.4. PHP 8.4 requires `["-d","extension=sodium"]` on this installation.
The runner reads no owner env/profile and never drops/reset schemas. Run retained
PHP-2/3/4 runners with their corresponding binary variables for regression evidence.
`php-5-number-fixtures.mjs` captures 33 authoritative paymentNumber vectors.

`php-5-browser-setup.mjs` provisions a separate new schema and private Apache config.
Use its env path in UPMS_PHP2_ENV, an ephemeral localhost certificate, FastCGI on 9084
and TLS on 9444. Set PHP_BROWSER_VERSION and run `php-5-browser.mjs`. Twenty checks
pass on each runtime with zero JavaScript errors, including errors, immutable original
evidence, print action/A4 PDF rendering and stock/financial reconciliation.

`php-5-evidence.mjs` verifies counts and assembles [machine evidence](PHP-5-EVIDENCE.json):
scenario statuses, command keys, state hashes, synthetic schema identifiers, fault/
overlap/COMMIT-drop checks, browser results and payment PDF hashes. It excludes database
passwords, APP_KEY, session tokens, private env files, PDFs and screenshots.
[Public hashes](PHP-5-PUBLIC-ASSETS.json) preserve all 111 files from PHP-4.
**No owner database was contacted or modified.**
