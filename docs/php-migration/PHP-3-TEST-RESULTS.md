# PHP-3 — stock-in, challans and draft cancellation

Baseline: `feature/upms-php-2-master-data-openings` at
`dd43e65bd8e34d8e6e67218b7534cc5bf64120ed` (fetched and verified).
Review branch: `feature/upms-php-3-stock-challans`.
The final commit is the branch commit containing this report; its exact SHA is
reported in the handoff rather than embedding a self-referential commit hash.

## Implemented behavior

Under `/api/v1/management/simple-v1`:

- `POST /documents` and `PATCH /documents/:id`: add PRODUCTION, PURCHASE and
  CHALLAN to the three accepted opening kinds; save immutable item/party snapshots
  and approved challan pricing versions for subsequent review.
- `POST /documents/:id/post`: production stock increases; purchase stock and vendor
  journal effects (credit or balanced immediate Cash/Bank Transfer); challan stock
  deduction and net client receivable. Exact fixed/percentage discounts and existing
  DC numbering commit with stock, lines, journals, document, audit and command receipt.
- `POST /documents/:id/cancel`: justified, version-checked cancellation of supported
  drafts, retaining history without stock/ledger effects.

The shared PHP-2 BusinessCommand remains authoritative for UUID keys, canonical
fingerprints, actor-bound replay, identity/operator checks, READY state, transaction
serialization and rollback. Stock rows lock in numeric ID order, including IDs above
JavaScript's safe integer range. Posted lines use one bulk insert, matching Express's
auto-increment reservation behavior during rolled-back transactions.

## Verified results

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | ---: | ---: |
| PHPUnit tests / assertions | 69 / 491 | 69 / 491 |
| PHP-3 equivalent HTTP comparisons | 214 | 214 |
| PHP-3 full business-state comparisons | 12 | 12 |
| Preserved PHP-2 HTTP comparisons | 135 | 135 |
| Preserved PHP-2 business-state comparisons | 13 | 13 |
| Apache HTTPS/FastCGI Chrome acceptance checks | 19 | 19 |
| Browser JavaScript errors | 0 | 0 |

MariaDB **10.11.19** was verified before fixture provisioning. Each differential run
created independent new Express/PHP synthetic schemas, using original migrations.
Browser schemas are separate from differential schemas. No owner database was
contacted or modified; no owner credentials, records, schema or migrations were used.

Discount vectors are generated from the untouched Express `entry.js`: half-cent
rounding, one-cent totals, zero-total draft/post distinctions, large exact values,
invalid modes/rates, and limits. No PHP floating-point monetary calculations were added.

Both versions passed different-key double-finalization, overlapping last-bottle
contention, lost response/fresh-process replay, server-side connection termination,
and journal/audit/command failure injection. Failed posts leave stock, document,
journals, command receipt and `next_dc` unchanged. Retry succeeds once. Verified
DC-0999, DC-1000, DC-A0001, DC-A0002, DC-A9999 and refusal after the existing limit.
See [differential methodology](PHP-3-DIFFERENTIAL-EVIDENCE.md).

Column-scoped runtime grants add only `next_dc` and existing challan document fields
to PHP-2 privileges. Seventeen PHP-3 SQL mutation/DDL/privilege denials passed.
Immutable stock/party journals, posted lines, audit and command rows have no UPDATE
or DELETE grant. Counters for unimplemented modules remain unavailable.

Actual local Apache TLS → PHP FastCGI → Laravel → MariaDB tests use the unchanged
compiled React management application. The 19 checks cover sign-in, explicit openings,
multi-line production, credit/immediate purchases, all three challan discount modes,
draft editing/cancellation, stale price errors and explicit refresh, zero-total and
available-stock errors, client/vendor ledger navigation and reconciliation. The
existing Print Delivery Note action was exercised, followed by Chrome's actual A4 PDF
print renderer; printing changed no saved document. Private screenshots/PDFs remain
under ignored `tmp/php-runtime`; PDF hashes and byte counts are in the evidence JSON.

PHP 8.4.27's installed configuration has sodium disabled. Tests explicitly enabled
it with `-d extension=sodium`, including FastCGI; the installed php.ini was unchanged.
Both preflights report no missing extensions, Argon2id support and writable storage.
The isolated long-running FastCGI worker uses `PHP_FCGI_MAX_REQUESTS=0` to avoid its
default request-count exit during repeated browser fixtures. This is test setup,
not a change to installed hosting configuration. Pint passes.

Unchanged Express regression: **290 passed**. Unchanged React regression:
**188 passed in 25 files**. React build passes with the pre-existing bundle-size
warning. All **111 public build files remain SHA256-identical** to PHP-2 after rebuild;
see [public asset hashes](PHP-3-PUBLIC-ASSETS.json). No React, Express or migration
source changed. Owner-supplied untracked source assets were preserved and excluded.

## Review boundary

Seven document kinds remain blocked with `501 PHP_WRITE_MODULE_PENDING_REVIEW`:
CHALLAN_RETURN, CLIENT_PAYMENT, VENDOR_PAYMENT, EXPENSE, STOCK_CORRECTION,
OPENING_CORRECTION and PAYMENT_REVERSAL. This includes stored unsupported drafts,
edits/posts/cancellation and saved command replays. Public inquiry delivery remains
pending; legacy ERP routes remain disabled. Existing read routes remain available.

No GoDaddy deployment, production profile, schema change, migration, owner bootstrap,
release ZIP or publication occurred. Stop for review before PHP-4.

Artifacts: [machine evidence](PHP-3-EVIDENCE.json),
[file manifest](PHP-3-FILES-CHANGED.txt), [API matrix](API-PARITY-MATRIX.md),
[remaining migration plan](BUSINESS-MIGRATION-PLAN.md).
