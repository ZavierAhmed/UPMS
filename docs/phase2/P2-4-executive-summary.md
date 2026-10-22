# P2.4 delivery and operational status

**Locally tested and accepted; real operational posting remains blocked pending explicit owner decisions. Not production ready.** Stop for independent review. No merge, deployment or P2.5.

Starting SHA: `7701c32cc61dadd495dd391938ad72a41ab8c1a3`. Branch: `feature/upms-p2-4-purchases-vendor-accounts`. Exact commit message: `UPMS-P2.4: Implement purchasing and vendor settlement foundation`. Final SHA is supplied in the completion response/Git history rather than a self-referential commit hash in this document.

## Delivered behavior

Versioned purchase receipt/invoice/payment documents reuse P2.2 coordination, period/numbering, immutable events/audit and durable idempotency. Receipt can remain invoice-pending with null rates/amounts. Later invoice recognition references exact received lines, adds one gross payable and never repeats stock. Purchased materials/components/packing/finished goods use the same P2.3 stock balances and shared locking/projection service; production never auto-consumes materials.

Vendor journal, invoice outstanding, explicit settlement allocations and vendor balance are independently traceable. Immediate full/partial payment has a first-class linked payment document/batch/number and commits stock, gross payable, settlement, money debit, audit and durable result in one transaction. Deferred partial/full/multi-invoice payments reject cross-vendor, surplus, duplicate and unsupported instruments. No advances, refunds, returns or invented GST.

Money accounts remain unverified until audited genuine-new/no-history authorization; historical openings are deferred. Immutable exact-decimal journals reconcile balance projections. Insufficiency fails closed. Account-specific exact Administrator exceptions bind document version/hash, amount, account, expected balance/version, policy and resulting deficit; every later debit needs its own authorization. Staff cannot approve. Negative inventory has no exception.

The private Purchases and accounts UI provides entry/edit/review/post, receipt/invoice status, vendor invoice-wise outstanding/history, explicit allocation/remaining review, money state/journals, deficit approval and read-only reconciliation. Inventory and Sales have no vendor/money visibility. Correction requests retain linked evidence; effects remain disabled pending policy.

## Database and preservation

Recovered endpoint: `127.0.0.1:3309/upms`, MariaDB 10.4.32, normal recovery mode 0. Fresh 44-table backup restored exactly in `upms_restore_p24_20261022` before main migration. Only new `202610220004_purchasing_accounts.js` applied as `upms_migrator@localhost`: fifteen added tables/permissions, four migration records, 59 physical tables. Runtime authenticated as `upms_runtime@localhost` with exact 57-table allowlist; no global/DDL/DELETE/delegation additions. All three historical migration sources and original data rows retained.

The original 1,037 XAMPP files and their offline copies match preserved hashes. Original directory/configuration/port3306, old backups and recovery evidence remain unchanged. Existing administrator/password/permissions, encrypted main profiles and signing key are preserved. Main new business tables, original inventory tables, periods, cutoff/policy acceptance and master opening state remain empty; five technical movement-catalogue rows are the only new non-permission seeds. Local development app is restored at http://127.0.0.1:3000/management using the existing restricted profile, without bootstrap or startup migrations.

## Verification and changed files

Final results: 128 backend, 104 frontend, 17 original identity SQL, 16 business SQL, 20 inventory SQL/browser and 29 purchase SQL/browser; zero failures/skips in each final run. Build/lint, zero-vulnerability audits, 66 public route/viewport combinations, 22 interactions, Lighthouse and extracted production-package/native-identity checks passed. Stock/vendor/invoice/allocation/money/source reconciliation matched. See [test evidence and preserved failures](P2-4-test-results.md).

Changed areas: new purchasing migration; `server/src/purchases/{catalog,amounts,validation,service,router}.js`; shared `server/src/inventory/stock.js`, stock history/reconciliation and existing posting projection; live identity router/grant/preflight catalogue; money-master type guard; guarded `Invoke-UPMSPurchases.ps1`/`purchase-operations.mjs`; new unit/SQL/browser/UI tests and prior-suite connection/evidence metadata; private `Purchases.jsx`/display arithmetic and management navigation/errors; eleven milestone documents and README. Public website source/dependencies/lockfiles and all nine unused original logo assets remain unchanged and excluded from the commit.

Owner decisions remain unresolved for timing, currency/precision/rounding/tax scope, four prefixes, cutoff/period, vendor/money openings, payment instruments, deficit account types, supplier reference uniqueness and correction treatment. No synthetic test policy activates main. [Decision register](P2-4-open-decisions-and-risks.md) and [migration/rollback evidence](P2-4-migration-verification.md) describe limits. Recommended next action is independent technical/owner/accountant review and explicit activation decisions, not automatic next-milestone implementation.
