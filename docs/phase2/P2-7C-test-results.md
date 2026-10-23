# P2.7C automated test results

All counts below are passed with zero failures in the final successful run. Larger domain pipelines deliberately repeat earlier scenarios; do not add them as distinct tests.

| Suite | Passed | Fresh target/run |
|---|---:|---|
| Backend unit |160|final Node24 run|
| Frontend unit |125|15 files|
| Original identity SQL |17|regression01, top-level process|
| Original business SQL |16|regression01|
| Inventory SQL |20|inventory01|
| Purchasing SQL |29|purchasing01|
| Sales SQL |23|sales01|
| GST classification SQL |38|classification01|
| Receipts SQL |48|receipts01|
| Cheques SQL |66|cheques01|
| Returns SQL |86|returns01|
| Credits SQL |110|credits01|
| Expense full pipeline |133|expenses03;110 prior plus23 expense|
| Full-system synthetic E2E |23|UAT02|
| Four-role responsive demo browser |19|UAT02,390/1440px|
| Public route/viewport matrix |66|11 routes, six widths|
| Public interactions |22|W06 regression|

All SQL uses real recovered MariaDB10.4.32 on3309, not a mock or MySQL Server certification. Schemas have generated encrypted credentials and restricted runtime rights; populated/failed targets remain preserved. Original assertions are retained; metadata recognizes the additive schema and exact P27C targets. Backend adds2 expense unit tests; frontend adds3 (prior158/122).

Expense coverage includes versioned active/inactive category history; strict manual totals/no tax; record12000, partial5000/full7000; immediate1000; Admin threshold20000 posted by Accounts; exact deficit200000; separate approvals, stale version/hash/account/policy/permission denial; duplicate references; overpayment/concurrent payment; immutable posting and blocked corrections; seven fault stages with rollback; commit acknowledgement loss, process replay, actual deadlock/lock timeout; unauthorized roles and CSRF; source/journal/projection tamper and read-only reconciliation. Prior inventory concurrency, negative-stock and immutable effects rerun within the pipelines. Independent domain browser tests run inside the SQL pipeline, supplemented by the full demo browser checks.

Build and lint pass. Root/client npm audit each reports0 vulnerabilities. Public Lighthouse home/catalog/detail/contact performance96/97/97/98 respectively; accessibility, best practices and SEO100 on all four. Public identity/copy/assets were not changed; only private management UI and demo-only banner were added. Nine user-supplied untracked logo source files remain untouched and excluded.

Precommit fresh extracted package:113 allowlisted files, production-only npm ci, native Argon verification,11 public routes and asset200, seven private file probes denied, SMTP disabled, deliberate local content corruption rejected then restored. Final package is regenerated after commit and checked against deployment-manifest.sourceCommit; this final SHA receipt remains outside Git. No deployment occurs.

Evidence: tmp/w06/p27c/*-final.log, domain run logs, public and package JSON; server/.local/p27c/sql-acceptance-summary.json, migration/backup/preservation receipts, timestamped UAT receipts. Private reports contain no published credentials. Failure history: expenses01 variable shadowing fixed and fresh02/03 passed; UAT01 seed session column fixed and fresh02 passed; logout harness execution-world races fixed and read-only19-check rerun passed. No data reset or failed-schema reuse.

Owner manual UAT: NOT YET EXECUTED. Automated success does not populate the guide's actual/PASS/FAIL/sign-off fields.
