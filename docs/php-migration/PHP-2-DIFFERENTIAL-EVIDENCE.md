# Independent Express/Laravel parity evidence

The unchanged `server/src/simple-v1/service.js`, router, Zod validators and transaction
helpers are the reference. `scripts/php-2-differential.mjs` provisions independent fresh
schemas, runs equivalent HTTP requests, and compares responses and stored business
effects after each phase. It never uses the owner's `upms` database or remote env file.

## Isolation and execution

Each PHP version has its own new pair of `upms_test_php_2_ref_*` and
`upms_test_php_2_app_*` schemas on a newly initialized local MariaDB 10.11.19 instance,
port 3330. The script verifies version and port before any provisioning. It refuses
existing schema names through CREATE DATABASE without IF NOT EXISTS and performs no
drop/reset. Original migrations initialize only these synthetic schemas.

Express requests execute through the original management router and middleware.
Laravel differential requests execute through the real HTTP kernel, routes, middleware
and PDO adapter using CLI-only `tests/Support/http-bridge.php`. Each request is a fresh
PHP process, including retries and concurrent requests. The bridge is not a route and
is not deployed. Separate Apache HTTPS/PHP FastCGI browser acceptance verifies the
unchanged UI against a real web server. All data and credentials are synthetic.

## What was compared

**135 HTTP status/JSON comparisons per PHP version**, plus **13 full-state comparisons**
across v1_control, v1_items, v1_stock, v1_parties, v1_documents, v1_lines,
v1_stock_journal, v1_party_journal, v1_audit and v1_commands.

- Response scalar types, exact decimals, fieldErrors and public messages.
- Generated item identities and counter, stock verification and quantities.
- Party kind/contact/version fields and unchanged opening verification on edits.
- Draft payload strings, snapshots and versions; posted opening status/total.
- Stock/party journal entries and debit/credit directions, including zero openings.
- Audit actions, actors, references and reason text, including the literal reason `0`.
- Canonical fingerprints and saved result JSON; request key order does not change hashes.
- Read endpoints and final reconciliation after all accepted writes.

The JSON evidence records each comparison and phase hash. Correlation UUID values and
independently generated created_at values are normalized. For the two-key optimistic
race only, the winning key is normalized to `<concurrent-winner>`: either request may
win, but exactly one must commit and the loser must return STALE_RECORD. Actual winner
keys are retained in the recorded race evidence. All other command keys, fingerprints,
saved responses, IDs and numeric/string types are compared directly. No ID remapping
or float-tolerant money comparison is used.

## Failure, replay and concurrency acceptance

| Scenario | Verified behavior |
| --- | --- |
| Duplicate submission / reordered properties | Same key replays saved result; no duplicate master/audit/counter effect |
| Same key, different input | IDEMPOTENCY_CONFLICT; no business effects |
| Different authenticated operator | Cannot replay another actor's result |
| READY revoked | New command blocked; an already completed supported result still replays |
| Stale item/party/draft/post versions | Matching status/code/message; no partial business persistence |
| Duplicate openings | Verification permits one opening; duplicate posting rejected |
| Concurrent identical commands | Two equivalent success responses, one committed command |
| Concurrent different-key edits | One success and one stale conflict per engine |
| Failure after audit but before receipt | Temporary synthetic trigger rejects receipt insertion; item/stock/counter/audit changes all roll back |
| Failure after stock or party posting effects | Journals, verification flags, document status, audit and receipt all roll back; same key succeeds after fault removal |
| Server-side transaction interruption | Both synthetic connections are killed while paused before receipt insertion; both return 503, full business state rolls back, fresh-process retries succeed |
| Lost acknowledgement | Committed HTTP result intentionally discarded; retry in a fresh PHP process replays without duplicate effects |
| Unsupported scope | Ten other document kinds rejected; stored production draft posting/editing and saved receipt replay rejected without effects |

Fault-injection triggers and KILL CONNECTION operations apply only to explicitly
identified local synthetic schemas/connections. They are not migrations, runtime
features or production requirements. Failed exploratory runs are preserved separately;
the committed evidence contains the final complete passing runs.

## Runtime grants and immutability

`scripts/php-2-runtime-grants.mjs` creates a dedicated synthetic runtime account with
SELECT/INSERT on the necessary business tables and **column-scoped UPDATE** only.
There are no blanket business table UPDATE grants and no business DELETE grants.
Sessions/login attempts retain the existing auth-only mutation privileges.

**16 direct SQL attempts are denied**: journal/line/audit/command rewrites or deletion,
document actor/timestamp modification, challan-counter changes, item-code changes,
party-kind changes, user creation, role deletion and account enable/disable changes.
Posted document payload/status immutability is enforced by authorization/version/state
checks under identity_guard and DRAFT-qualified updates. Column grants do not provide
MariaDB row-level policies; no claim is made that they independently prevent every
possible direct SQL edit to an otherwise permitted document column. No trigger or schema
change was added to the existing application schema to imply such a guarantee.

## Deliberate milestone differences

Only the three opening kinds may use document write routes. Other kinds remain 501
even when a stored draft or completed Node receipt already exists. Cancellation remains
disabled. These restrictions are tested separately from reference parity because
Express intentionally implements later milestones already.

Two compatibility corrections were found by testing: business string limits follow
the installed Zod code-point behavior, and PHP boolean SQL bindings must remain 0/1
under strict SQL modes. Raw array input now reaches the business object validator so
UUID/error precedence matches Express; malformed JSON retains the transport-only error
shape. Existing authentication/session behavior remains covered by the regression suite.

See [test results](PHP-2-TEST-RESULTS.md) and the complete
[machine-readable differential evidence](PHP-2-DIFFERENTIAL-EVIDENCE.json).
