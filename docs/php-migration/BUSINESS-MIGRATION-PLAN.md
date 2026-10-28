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
| PHP-5 (complete; isolated acceptance) | Client/vendor payments, receipts, supported reversals, opening/stock corrections | CR/VP shared-ID numbering, reference normalization/duplicate detection, exact balances/advances, traceable compensations, unchanged journals. Independent parity, rollback, real lost-COMMIT-acknowledgement recovery and actual HTTPS browser acceptance on both PHP runtimes. See PHP-5 results and reversal review. |
| PHP-6 (complete; isolated acceptance) | Paid expenses, Company Transactions, ledgers/inventory and observational reconciliation | All thirteen active kinds; paid-only expense posting; exact event/as-of balances; string-zero/Unicode filter compatibility; all-kind corruption probes and preserved source blind spots; real lost-COMMIT recovery; actual HTTPS print and XLSX acceptance. See PHP-6 results, report acceptance and findings. |
| PHP-7 (isolated acceptance) | Public inquiry/contact delivery and report/download integration | Preserve current validation, same-origin rules, anti-abuse/idempotency, mail acceptance vs unknown-delivery states. Audit the existing React print/Excel behavior and preserve visible/downloaded fields and approved identity. Do not introduce a false-success contact stub or invent a backend PDF API. |
| PHP-8 | Linux packaging, cPanel validation and reviewed cutover | Matching production vendor tree, verified account limits/extensions/hostname/roots, least-privilege runtime grants, same-origin HTTP/browser tests, backup and rollback review; no automatic migrations. Separate approval before actual release. |

## Transaction invariants for every write milestone

PHP-7 isolated integration is complete for review: public inquiries use independent
origin/security routing, bounded cross-worker rate/replay state and verified-TLS
Symfony SMTP; both PHP runtimes pass inquiry, management, React/Express and actual
HTTPS browser/export regressions. The public asset manifest is unchanged. The only
React change corrects the posted expense print/detail heading with specific tests.
See [PHP-7 results](PHP-7-TEST-RESULTS.md) and [inquiry operating differences](PHP-7-INQUIRY-PARITY.md).

Next are separately reviewed PHP-7.1 (preserved reversal snapshot and reconciliation
findings) and owner-operated PHP-7.5 [full-system UAT](FULL-SYSTEM-UAT-PLAN.md).
Neither is executed by PHP-7. The owner database gate, legacy-module exclusions and
hosting/release restrictions remain unchanged. Native Excel/printer checks, backup
restore, owner signoff and shared-host process/filesystem/resource preflight remain
prerequisites; automatic tests alone do not establish production readiness.

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
PRODUCTION, PURCHASE, CHALLAN, CHALLAN_RETURN, CLIENT_PAYMENT, VENDOR_PAYMENT,
PAYMENT_REVERSAL, STOCK_CORRECTION, OPENING_CORRECTION and EXPENSE draft creation/editing/posting
are implemented. Draft cancellation supports all thirteen active Simple V1 kinds.
No active Simple V1 document kind remains pending.
Production database configuration, cPanel Apache verification, hosted load/resource
checks and broader report/export acceptance remain pending. Local Apache HTTPS/FastCGI
browser transaction and delivery-note print acceptance is covered by PHP-3. PHP-4 adds
actual partial-return, excess-return rejection, stock/ledger reconciliation, original
return history and return-acknowledgment print acceptance on both PHP versions. PHP-5
adds receipt/payment/reversal/correction browser workflows and payment printing. PHP-6
adds expenses, date/type/reference filters, real XLSX register/ledger/stock downloads
and register/expense printing on both runtimes. Legacy
business/inventory/purchase/sales/receipt/cheque/return/credit/expense routes are
inventoried but remain profile-disabled; do not silently enable them during migration.

PHP-6 is not hosting or production approval. The loopback/test-schema database gate
is unchanged. Review [PHP-6-TEST-RESULTS.md](PHP-6-TEST-RESULTS.md),
[PHP-6-REPORT-ACCEPTANCE.md](PHP-6-REPORT-ACCEPTANCE.md),
[PHP-6-RECONCILIATION-FINDINGS.md](PHP-6-RECONCILIATION-FINDINGS.md) and the preserved
[PHP-5-REVERSAL-REVIEW.md](PHP-5-REVERSAL-REVIEW.md) before PHP-7.
Any proposed source reconciliation hardening is a separate owner-reviewed change to
both backends, not a silent alteration of this parity milestone.

The separate PHP session cookie requires signing in again when switching backends;
it does not require a password reset. Existing Node sessions/hashes remain preserved.
PHC parameter ordering is normalized only for verification. Hashing is bounded across
PHP workers with two per-schema advisory locks and the same BUSY response.
