# PHP-4 — Delivery Challan Returns

Starting branch: `feature/upms-php-3-stock-challans`.
Fetched/verified baseline: `7f3004b312b852d0b35b5406f000e1939778dda0`.
Delivery branch: `feature/upms-php-4-challan-returns`.
The final SHA is reported in the handoff; it is the branch commit containing this
report rather than a self-referential hash embedded in its contents.

## Newly supported operations

CHALLAN_RETURN now shares the existing document create/edit/post/cancel lifecycle:

- `POST /api/v1/management/simple-v1/documents`
- `PATCH /api/v1/management/simple-v1/documents/{id}`
- `POST /api/v1/management/simple-v1/documents/{id}/post`
- `POST /api/v1/management/simple-v1/documents/{id}/cancel`
- `GET /api/v1/management/simple-v1/documents/{id}` retains exact return detail and
  original challan context: history, original snapshots, returned/remaining units
  and total credit. The existing PHP read implementation required no change.

The new ChallanReturns service follows the authoritative Express module. It locks
the original posted challan, validates original client/date/reason/line/rate and
cumulative quantities, and recomputes historical credits at posting. Current item
prices, descriptions, active flags and party versions do not revalue historical
returns. It retains original line/challan identities and snapshots.

Exact Brick Math integers allocate original net cents across immutable line order,
then allocate each line budget across cumulative returned units by floor differences.
There is no average-unit or floating-point valuation. Complete returns telescope to
the original net debit. DCR numbers use the saved global document ID with minimum
four-digit padding and unsigned-64-bit bounds; no return sequence or DC reset exists.

Stock restoration locks rows in numeric item order, verifies openings and journal
reconciliation, and appends positive stock movements and immutable lines. The
original client's ledger receives an exact credit, including after an existing
partial payment. No payment, cash refund or original-sale rewrite is generated.
Status/payload, lines, stock, journals, audit and saved command response commit in the
existing BusinessCommand transaction. Runtime business grants are unchanged from PHP-3.

## Acceptance results

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | ---: | ---: |
| PHPUnit tests / assertions | 71 / 1,199 | 71 / 1,199 |
| PHP-4 equivalent HTTP comparisons | 256 | 256 |
| PHP-4 full business-state comparisons | 14 | 14 |
| Retained PHP-2 HTTP / state comparisons | 135 / 13 | 135 / 13 |
| Retained PHP-3 HTTP / state comparisons | 214 / 12 | 214 / 12 |
| Combined HTTP / state comparisons | 605 / 39 | 605 / 39 |
| Actual Apache HTTPS/FastCGI browser checks | 16 | 16 |
| Browser JavaScript errors | 0 | 0 |

All differential runs used independent newly created synthetic Express/PHP schemas
on verified MariaDB **10.11.19**. PHPUnit fixtures were freshly generated in another
synthetic schema. Each browser runtime used its own fresh synthetic schema.

Node-generated math fixtures contain **346 credit vectors**, covering all **96 small
partition/order/net-value combinations**, zero/one-cent boundaries, invalid requests,
leading-zero normalization and large amounts/quantities. Ten numbering vectors
include IDs beyond JavaScript's safe integer and both unsigned-64-bit boundaries.
The two new math tests alone pass 708 assertions on each PHP version.

The PHP-4 differential suite verifies full/partial/multi-line/fixed/percentage returns,
successive partitions, original snapshot preservation, strict validation errors,
editing/cancellation, replay/conflicts, READY/actor/operator/CSRF/origin gates, and
missing/unverified/unreconciled stock projections. It compares original challan
context, client ledgers, register, movements and final reconciliation.
Return drafts posted out of creation order recompute their rounded credits correctly.
Adjacent original line IDs above PHP's signed-integer limit remain distinct and exact.

Concurrency tests overlap two transactions competing for final remaining units:
exactly one posts; the other receives RETURN_QUANTITY_EXCEEDED. Concurrent returns
for different original lines both post correctly. Same-document double finalization
produces one post and one immutable-document conflict. Failure after stock journals,
after the client journal, and before the command receipt rolls back every business
effect. Real server-side connection termination before commit also rolls back;
same-key retry succeeds. Discarded-response replay through a new PHP process causes
no duplicate stock restoration, credit or journal entry.

Seventeen SQL-level denial checks pass: immutable journal/line/audit/command rewrites,
identity/operator changes, runtime DDL and global reads remain denied. Six future
document kinds remain blocked, including stored drafts and saved command replay.

Browser acceptance uses the unchanged compiled React UI through actual Apache TLS,
PHP FastCGI and MariaDB. It creates an item/opening and client/opening, posts a
discounted challan, posts successive partial returns, checks stock and client credit,
rejects an excessive stale draft with the exact remaining-quantity error, edits and
cancels drafts, completes the return, checks original history/identity and navigates
the ledger/reconciliation. The PKR 100.09 original sale returns as PKR 30.02, 20.02
and 50.05, restoring all ten bottles and a zero receivable. Both the original delivery
note and return acknowledgment print actions and actual Chrome A4 PDF rendering pass.
Private screenshots/PDFs remain ignored; hashes and sizes are retained in evidence.

Express regression: **290 passed**. React: **188 passed in 25 files**. React build
and lint pass; build retains its existing bundle-size warning. Pint and Composer
platform requirements pass on both supported PHP runtimes. All **111 public files
remain SHA256-identical** to PHP-3 after rebuilding. Express, React and migrations
are unchanged. Owner-supplied untracked assets were preserved and excluded.

## Runtime prerequisites and review boundary

The installed PHP 8.4 configuration still has sodium disabled by default. Ordinary
development CLI commands on this installation must explicitly enable it, for example
`C:\php84\php.exe -d extension=sodium vendor/bin/phpunit` from `upms.php`.
The same flag was used for Composer checks and FastCGI. No installed php.ini was
changed. Both runtime preflights confirm sodium/Argon2id, required extensions and
writable application storage. The private FastCGI test process uses
`PHP_FCGI_MAX_REQUESTS=0` during the long browser rehearsal. Installed Apache/PHP
configuration and hosting remain unchanged.

CLIENT_PAYMENT, VENDOR_PAYMENT, EXPENSE, STOCK_CORRECTION, OPENING_CORRECTION and
PAYMENT_REVERSAL remain disabled. PHP-5 payment/receipt/cheque/reversal/correction
work has not begun; expenses and public inquiry delivery retain their later milestones.
Existing legacy ERP routes remain profile-disabled.

**No owner database was accessed or modified.** No owner credentials, administrator,
balances or live stock were used. No production migration, bootstrap, schema reset,
GoDaddy ZIP, deployment, DNS change or publication occurred. Stop for review before PHP-5.

Artifacts: [differential evidence](PHP-4-DIFFERENTIAL-EVIDENCE.md),
[machine evidence](PHP-4-EVIDENCE.json), [public hashes](PHP-4-PUBLIC-ASSETS.json),
[exact file manifest](PHP-4-FILES-CHANGED.txt), [API matrix](API-PARITY-MATRIX.md),
[remaining plan](BUSINESS-MIGRATION-PLAN.md).
