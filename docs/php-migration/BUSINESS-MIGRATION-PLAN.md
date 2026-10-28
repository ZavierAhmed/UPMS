# Remaining business migration plan

This is a backend migration of the existing application. Existing Express services,
tests and SQL schema remain authoritative; this milestone does not authorize their
replacement with reduced calculations or activate legacy ERP modules. Stop for owner
review before implementing the remaining write modules below.

| Milestone | Scope | Required parity and acceptance |
| --- | --- | --- |
| PHP-1 (complete) | Guarded Laravel/PDO foundation, exact schema mapping, authentication, all ten Simple V1 read routes, API inventory and deployment design | Read/status/JSON types, existing Argon2id identities, CSRF/session expiry/rotation/revocation, no real DB writes, immutable business tables during reads. |
| PHP-2 (complete; isolated acceptance) | Item masters, generated immutable ITM codes, saved selling prices, clients/vendors, explicit stock and party openings | Shared command protocol, exact versions, immutable codes/kinds, column-scoped grants, explicit opening verification, independent Express/PHP schema comparison, rollback/concurrency/lost-acknowledgement tests. See PHP-2 results and differential evidence. |
| PHP-3 (complete; isolated acceptance) | Production/purchase stock-in, drafts/cancellation, delivery challans, fixed/percentage discounts, numbering | Exact cents/whole-bottle limits, saved pricingVersion and party/item snapshots, stale draft rejection, numeric stock locks, transactional journal/projection/number/audit/command writes. Verified DC rollover block, rollback, lost acknowledgement and concurrency against Express on both PHP versions. See PHP-3 results and differential evidence. |
| PHP-4 (complete; isolated acceptance) | Challan return draft/edit/post/cancel and original return context | Original posted challan/client/line identities, remaining units across partial returns, ordered net-credit allocation with telescoping floors, immutable historical snapshots, appended stock/party journals and global-document DCR identities. Node vectors cover all 96 small partitions and large values; independent differential and actual HTTPS browser tests pass on both PHP versions. |
| PHP-5 | Client/vendor payments, receipts, cheque dishonour/reversals, opening/stock corrections | CR/VP shared-ID numbering, reference normalization/duplicate detection, party opening/date rules, balances including advances, traceable compensations, no journal rewrite and no cash/bank balance invented for Simple V1. |
| PHP-6 | Expenses, Company Transactions register and reconciliation hardening | Paid-only expense evidence, account-level payment semantics, date/range/reference-filter totals, running balances independent of reference visibility, client/vendor advance exclusions, audit and no repair side effects. Read implementations exist; write parity remains pending. |
| PHP-7 | Public inquiry/contact delivery and report/download integration | Preserve current validation, same-origin rules, anti-abuse/idempotency, mail acceptance vs unknown-delivery states. Audit the existing React print/Excel behavior and preserve visible/downloaded fields and approved identity. Do not introduce a false-success contact stub or invent a backend PDF API. |
| PHP-8 | Linux packaging, cPanel validation and reviewed cutover | Matching production vendor tree, verified account limits/extensions/hostname/roots, least-privilege runtime grants, same-origin HTTP/browser tests, backup and rollback review; no automatic migrations. Separate approval before actual release. |

## Transaction invariants for every write milestone

1. Validate/authenticate before work; reauthorize inside the identity_guard transaction.
2. Preserve canonical fingerprints, UUID Idempotency-Key validation, actor binding,
   saved response replay and mismatch conflict. Never create a fresh key to retry an
   unknown commit. Verify restarted-process replay and lost acknowledgements.
3. Keep stock locks ordered by exact item ID; preserve stock-journal reconciliation
   checks before projection updates. Use no binary floating-point money or IDs.
4. Keep immutable posting, version checks and every journal/audit/command effect in
   the original transaction. Test failure at each effect and concurrent finalization.
5. Preserve original counters and migration history. Additive schema changes, if ever
   necessary, require a separately reviewed forward-only plan and isolated rehearsal.
6. Add differential tests for each new write against Express using two independent
   synthetic schemas. Compare responses, stored snapshots/journals/commands/counters,
   concurrency, rollback, duplicate submission and authorization failures.

## Explicitly unfinished modules

Item/party creation and editing plus STOCK_OPENING, CLIENT_OPENING, VENDOR_OPENING,
PRODUCTION, PURCHASE, CHALLAN and CHALLAN_RETURN draft creation/editing/posting are implemented.
Draft cancellation supports these seven kinds. Standalone payments, expenses
and compensating corrections remain pending, including stored drafts and saved receipts.
Public inquiry delivery,
production database configuration, cPanel Apache verification, hosted load/resource
checks and broader report/export acceptance remain pending. Local Apache HTTPS/FastCGI
browser transaction and delivery-note print acceptance is covered by PHP-3. PHP-4 adds
actual partial-return, excess-return rejection, stock/ledger reconciliation, original
return history and return-acknowledgment print acceptance on both PHP versions. Legacy
business/inventory/purchase/sales/receipt/cheque/return/credit/expense routes are
inventoried but remain profile-disabled; do not silently enable them during migration.

PHP-4 is not hosting or production approval. The loopback/test-schema database gate
is unchanged. Review [PHP-4-TEST-RESULTS.md](PHP-4-TEST-RESULTS.md) and
[PHP-4-DIFFERENTIAL-EVIDENCE.md](PHP-4-DIFFERENTIAL-EVIDENCE.md) before PHP-5.

The separate PHP session cookie requires signing in again when switching backends;
it does not require a password reset. Existing Node sessions/hashes remain preserved.
PHC parameter ordering is normalized only for verification. Hashing is bounded across
PHP workers with two per-schema advisory locks and the same BUSY response.
