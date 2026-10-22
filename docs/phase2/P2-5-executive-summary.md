# P2.5 local acceptance

P2.5 implements direct Sales/Dispatch delivery challans and one tax-free operational customer receivable ledger. Ordinary posting needs no administrator approval. Posting atomically consumes finished-goods AVAILABLE stock, issues an official number and increases receivables exactly once using shared exact arithmetic and transaction coordination. Posted sources and journals are immutable to runtime credentials.

Administrator correction decisions bind original and request versions/hashes. All correction effects remain blocked pending approved policies. Receipts belong to P2.6, physical returns to P2.7 and historical openings to P2.8. Unknown balances remain unverified/null. New customers receive no classifications; legacy structures/records survive the explicit P2.5 override. Private preview exists; print/export remains disabled.

Starting SHA: `c15bbe6b13afb376cfa06b4e0af227ff992f4a51`. Branch: `feature/upms-p2-5-sales-delivery-challans`. Commit title: `UPMS-P2.5: Implement tax-free delivery challans and customer receivables`; the final handoff includes its full SHA.

Recovered development endpoint: `127.0.0.1:3309/upms`, MariaDB10.4.32, normal recovery0. The backed-up additive migration yields68 physical tables,66 runtime-visible tables and five migrations. All original rows, administrator, encrypted profiles and signing secret survived. Main sales/stock/customer financial state remains empty and unactivated. Original unhealthy port3306 data/configuration and recovery evidence remain unchanged. See [migration/rollback](P2-5-migration-verification.md).

Validation:131 backend,107 frontend and105 database-suite checks passed:17 identity,16 business,20 inventory,29 purchasing,23 sales. Public regression passed66 route/viewport combinations and22 interactions. Build/lint and both security audits passed; package verification covered79 files with real production dependencies and native password hashing. See [test results](P2-5-test-results.md).

Changed areas: nine-table migration; Sales domain/API/private UI; shared stock reconciliation/history; grants/preflight; new-customer classification behavior; cross-module money-policy consistency; operator tooling; SQL/browser/unit/UI acceptance; eleven milestone documents. No dependency or historical migration changes. Public website source and company identity remain unchanged.

Locally accepted synthetic functionality, not production ready. Currency/rounding, cutoff/open period, prefixes, genuine-new starting states, historical balances, backdating, print layout and correction effects require explicit owner decisions. See [remaining decisions](P2-5-open-decisions-and-risks.md). Stop for independent review; no merge, deployment or P2.6.
