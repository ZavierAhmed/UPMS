# PHP-4 independent differential evidence

Reference: unchanged `server/src/simple-v1/challan-returns.js`, `service.js`, input
validators, exact arithmetic, transaction helpers and return tests. Starting SHA:
`7f3004b312b852d0b35b5406f000e1939778dda0`.

## Method and comparison rules

`scripts/php-4-differential.mjs` verifies MariaDB 10.11.19 on private loopback port
3330, creates two new `upms_test_php_4_*` schemas and applies the unchanged original
migrations only there. Express uses its real management router through Supertest.
Laravel uses its actual HTTP kernel/middleware through the CLI-only test bridge,
starting a fresh PHP process per request. Both authenticate with cookies and CSRF.
PHP receives a narrowly granted runtime account separate from fixture administration.

On each of PHP 8.3.36 and 8.4.27, **256 HTTP comparisons and 14 complete business-state
comparisons pass**. Independent retained PHP-2 and PHP-3 runs add 349 HTTP and 25
state comparisons per runtime. All runs provision fresh schemas. Actual HTTPS
Apache/FastCGI browser runs separately check real transport and unchanged React.

Complete status/JSON structures and scalar types are compared. Only generated error
correlation UUIDs and `created_at` timestamps are normalized. Full business snapshots
compare v1_documents, v1_lines, v1_stock, v1_stock_journal, v1_party_journal, v1_audit,
v1_commands, v1_control, v1_items and v1_parties. Money, quantities, official references,
command fingerprints, saved results, IDs, ledger values and payload JSON are exact.
No journal, line, document or official identity is remapped.

For a different-key simultaneous double click, only the winning command key is mapped
to a winner marker, since scheduler choice may differ; its fingerprint/result remains
unchanged. The competing-return tests deliberately start A, observe A inside a
synthetic stock-update delay, then start B while A is in flight. A deterministic
overlap allows exact state comparisons across both engines without identity remapping.

## Covered scenarios

- Single-item full and successive 3/2/5 partial returns, multiple items, fixed and
  percentage bill discounts, one-cent last-unit allocation, and different complete
  return partitions with equal original net credit. Drafts finalized out of creation
  order recompute the older draft's credit from 0.00 to 0.01 after the newer return
  posts, normalize leading-zero units, and still telescope to the original net debit.
- Missing/nonexistent/unposted/wrong-kind originals; wrong client, original line,
  item or rate; duplicate original/item lines; missing lines/reasons; astral reason
  length; invalid/fractional/nonpositive/oversized quantities; earlier/future dates;
  excessive cumulative quantities and injection of client-controlled credit.
- Express strips unknown nested line fields. The runner verifies an injected
  snapshot is replaced by the original posted snapshot rather than inventing a
  stricter input policy. Current item price/activity and client details can change
  after sale without changing the historical return valuation or snapshot.
- Versioned draft edits, justified cancellation, no draft/cancel stock or ledger
  effects, immutable posted/cancelled entries, valid UUIDs, reordered canonical
  replay, mismatched-input/actor conflicts, non-operator denial, READY, CSRF and origin.
- A pre-existing partial client payment is seeded by authoritative Express in each
  synthetic schema. PHP's payment route stays disabled. The return still appends
  its full historical credit, decreases the ledger by the exact net value, and
  creates no new payment/refund or receipt rewrite.
- Numeric stock order for item IDs 2 and 10 with reverse input order. Missing,
  unverified and unreconciled stock all reject without effects. Adjacent original
  line IDs 9223372036854776808 and 9223372036854776809 remain distinct through
  draft preparation, posting, context reads and complete SQL comparisons; no
  floating-point identity normalization is used.
- Overlapping final-remaining-unit returns yield one post and one quantity error;
  overlapping returns for different original lines both post. Duplicate finalization
  posts once. Final original context and full SQL state match after each race.
- Synthetic BEFORE INSERT failures on lines (after stock journal), audit (after
  client journal), and command receipt restore the complete before snapshot. Removing
  the trigger allows same-key retry with one immutable posting.
- A command-receipt delay exposes uncommitted effects. The fixture administrator
  kills only the observed transaction connections in the two known synthetic schemas.
  Both APIs fail, complete state equals its before snapshot, and original-key retry
  succeeds. A discarded successful response also replays durably in a fresh PHP process.
- Seventeen prohibited SQL mutations/DDL/global reads fail under runtime grants.
  Six future kinds are blocked at create/edit/post/cancel and saved-result replay.
  Original challan detail, return history, ledgers, register, movements, overview and
  final reconciliation match Express.

## Math, browser and reproduction

`php-4-return-fixtures.mjs` calls Node's original returnCredits/returnNumber directly.
It checks complete-credit telescoping over every positive composition of 3 and 2
units, both return-line orders, and net amounts 0..5 cents: **96 combinations**.
The saved **346 credit vectors** additionally cover large exact amounts and units,
invalid inputs and normalization; **10 numbering vectors** cover padding and uint64.
PHPUnit reproduces these results and errors with Brick Math on both runtimes.

Set private synthetic admin variables `PHP_TEST_ADMIN_USER` and
`PHP_TEST_ADMIN_PASSWORD`, explicit `PHP4_BINARY`, and optional JSON-array `PHP4_ARGS`.
Use supported Node 22.23.4 and run `node scripts/php-4-differential.mjs`. Sodium must
be explicitly enabled for this machine's PHP 8.4 (`["-d","extension=sodium"]`).
The runner reads no owner env/profile and drops no schema. Existing fixture engines
are isolated test instances; all business writes target newly created schemas.

`php-4-browser-setup.mjs` creates another fresh schema and private Apache TLS/FastCGI
configuration. Start the generated listener on localhost 9444 and FastCGI on 9084
with its env path in the test-only `UPMS_PHP2_ENV`, then run `php-4-browser.mjs` with
`PHP_BROWSER_VERSION`. Sixteen checks pass on each runtime, including real excessive
return rejection after another draft posts, stock/ledger verification, history and
Chrome's A4 printing of both original and return. No JavaScript errors occurred.
Ephemeral certificates and wrappers are test-only; installed configs remain unchanged.

`php-4-evidence.mjs` assembles [machine evidence](PHP-4-EVIDENCE.json), asserting all
expected counts and successful runs. It retains scenario statuses, comparison hashes,
synthetic schema identifiers, concurrency/fault results, math counts, browser checks
and print PDF hashes. Credentials, APP_KEY, session tokens, private env files,
screenshots and PDFs are excluded from the commit. [Public hashes](PHP-4-PUBLIC-ASSETS.json)
verify the same 111 files as PHP-3. **No owner database was accessed or modified.**
