# PHP-5 — payments, reversals and financial corrections

Starting branch: `feature/upms-php-4-challan-returns`.
Fetched and verified baseline: `ee70789a7240d5cf076ad110d8d599bb2e55155d`.
Delivery branch: `feature/upms-php-5-payments-corrections`.
The exact final SHA is reported in the handoff; it identifies the commit containing
this report instead of embedding a self-referential hash in its contents.

## Converted operations

CLIENT_PAYMENT, VENDOR_PAYMENT, PAYMENT_REVERSAL, STOCK_CORRECTION and
OPENING_CORRECTION now share the existing lifecycle:

- `POST /api/v1/management/simple-v1/documents`
- `PATCH /api/v1/management/simple-v1/documents/{id}`
- `POST /api/v1/management/simple-v1/documents/{id}/post`
- `POST /api/v1/management/simple-v1/documents/{id}/cancel`

Existing detail, ledger, register, overview, movement and reconciliation reads retain
their contracts. The twelve supported document kinds use the same BusinessCommand,
actor-bound canonical fingerprints, identity guard, READY gate and transactions.
No alternate idempotency implementation or schema change was added.

Client payments append credits; vendor payments append debits. Cash/Bank Transfer,
client Cheque Received, per-kind/per-party normalized duplicate references, verified
opening/date gates and account-level advances match Express. No challan allocation,
cash/bank balance or automatic refund is introduced. CR/VP references derive from
the shared document ID with exact uint64 validation; no counter is added or reset.

Client reversals require an original Cheque Received payment; the separate vendor
reversal path permits eligible vendor payments. Party and amount derive from the
original. Duplicate reversal drafts fail on the existing UNIQUE(corrects_id) and roll
back their provisional journals. See [the separate source review](PHP-5-REVERSAL-REVIEW.md)
for exact eligibility, concurrent repeats and a preserved raw-snapshot source caveat.

Stock corrections require justification, allowed posted source/item identities and
signed nonzero whole-bottle deltas. Existing numeric locks, active/snapshot checks,
verified openings, journal reconciliation, date gates and negative-stock protection
are preserved. Sources and historical journals remain unchanged.

Opening corrections derive the current signed balance from all prior party journals,
compute target minus current balance, and append only the necessary debit/credit.
Document total preserves the source's target magnitude, not the journal delta. Source
link, direction, reason, date and no-subsequent-business-activity rules match Express.
Opposite-direction, zero and large exact targets pass without replacing old openings.

## Verified results

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | ---: | ---: |
| PHPUnit tests / assertions | 72 / 1,244 | 72 / 1,244 |
| PHP-5 equivalent HTTP comparisons | 261 | 261 |
| PHP-5 full business-state comparisons | 13 | 13 |
| Retained PHP-2 HTTP / state comparisons | 135 / 13 | 135 / 13 |
| Retained PHP-3 HTTP / state comparisons | 214 / 12 | 214 / 12 |
| Retained PHP-4 HTTP / state comparisons | 256 / 14 | 256 / 14 |
| Combined HTTP / state comparisons | 866 / 52 | 866 / 52 |
| Actual HTTPS Apache/FastCGI browser checks | 20 | 20 |
| Browser JavaScript errors | 0 | 0 |

All automated business writes use newly provisioned synthetic schemas on verified
MariaDB **10.11.19**, independent for Express and PHP. PHPUnit fixtures and each
browser runtime have separate fresh schemas. No owner database was accessed.

The suite verifies client partial/full/advance payments, vendor payable/advance,
all methods/reference errors, payment after a return, immediate purchase coexistence,
party snapshots, reversals, signed corrections, source/item/date/reconciliation failures,
opening target differences, activity rejection, versions, cancellation and security.
Compound invalid input preserves Zod's refinement ordering and complete fieldErrors:
continuable format errors include justification errors; type failures abort refinements.

Node-generated **33 payment-number vectors** cover CR/VP padding, source-permitted
leading-zero normalization, invalid kinds/IDs, unsafe-integer-range IDs and uint64 bounds.
All prior exact-money and partial-return vectors remain passing.

Same-document different-key finalization posts once. Deliberately overlapping distinct
payments both post; competing reversals of the same source yield one success and one
constraint conflict with complete SQL parity. Injected failures after party/stock
journals, after audit and before command persistence restore the entire business
snapshot. Real server-side connection termination before commit rolls back; original
key retry posts once. Discarded-response/new-process replay adds no effects.

The additional real lost-COMMIT-acknowledgement test uses two private TCP proxies.
Each forwards COMMIT, observes the database's successful acknowledgement, then drops
that response before the API receives it. Both APIs return 503 while the document,
journal, audit and command are already durable. New-process replay with the original
key returns the saved result without another debit/credit. Both proxies confirm the
actual acknowledgement drop; full SQL state matches before and after replay.

Twenty browser checks per runtime use actual Apache TLS → PHP FastCGI → Laravel →
MariaDB with unchanged React. They cover verified parties/item stock, challan, partial
receipt, return, cheque receipt/reversal, credit purchase/vendor payment, stock and
opening corrections, unchanged original evidence, blocked corrections after activity,
missing cheque/duplicate-reference errors, cancellation, ledger/register navigation,
payment print action and actual Chrome A4 PDF rendering, and reconciliation.

Express: **290 tests passed**. React: **188 tests passed in 25 files**. Build and lint
pass; build retains its existing bundle-size warning. All **111 public files remain
SHA256-identical** to PHP-4 after rebuilding. No Express, React, migration or installed
production deployment configuration changed. Owner source assets remain untracked,
preserved and excluded from the commit.

Pint, Composer platform requirements and runtime preflights pass on both PHP versions.
Composer metadata validates, while strict validation reports the existing intentional
exact pins for Laravel 13.39.0 and Brick Math 1.0.0; those accepted pins were preserved.
PHP 8.4 sodium remains disabled in installed php.ini: use `-d extension=sodium` for
ordinary local CLI/Composer/FastCGI execution on this installation. Tests explicitly
enable it; both preflights report no missing extensions and writable storage. Installed
global PHP/Apache settings were not modified. Private long-running FastCGI uses
`PHP_FCGI_MAX_REQUESTS=0` only for the browser fixture.

## Runtime privileges and remaining work

Runtime grants need no expansion beyond PHP-3. Seventeen denial checks cover immutable
party/stock journals, lines, audit, command receipts, document deletion, protected
document identity/control/role fields, runtime DDL and global reads.

MariaDB column grants do not distinguish DRAFT from POSTED rows. Required document
columns (including status, payload and total) remain SQL-writable by the runtime
account; posted-document immutability is enforced by the authenticated application,
while journal/audit/command evidence has no UPDATE/DELETE rights. Existing next_dc
and next_item_code grants remain necessary for earlier approved workflows; protected
control fields are denied and payment numbering never updates those counters. These
checks do not claim SQL row-level protection for already-granted mutable columns.
Adding stored procedures/triggers or a different privilege architecture would require
separate schema/cutover review and is outside this no-schema-change milestone.

EXPENSE remains blocked at creation, stored draft edit/post/cancel and saved-result
replay. PHP-6 expense posting and reconciliation hardening have not begun. Public
inquiry delivery and hosted packaging/cutover retain their later milestones; legacy
ERP routes remain disabled.

**The owner database was never contacted or modified.** No administrator credentials,
live stock or ledgers changed. No owner migration/bootstrap/reset, GoDaddy ZIP, hosting
or DNS change, deployment or publication occurred. Stop for review before PHP-6.

Artifacts: [differential methodology](PHP-5-DIFFERENTIAL-EVIDENCE.md),
[machine evidence](PHP-5-EVIDENCE.json), [reversal review](PHP-5-REVERSAL-REVIEW.md),
[public hashes](PHP-5-PUBLIC-ASSETS.json), [exact manifest](PHP-5-FILES-CHANGED.txt),
[API matrix](API-PARITY-MATRIX.md), [remaining plan](BUSINESS-MIGRATION-PLAN.md).
