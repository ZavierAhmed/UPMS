# P2.7B test evidence

All SQL/browser acceptance uses generated restricted credentials on fresh isolated P2.7B schemas at recovered MariaDB3309. Private logs, browser diagnostics, backups and populated failed schemas are retained outside Git. No owner operational fixtures or resets.

| Suite | Required/current count | Status |
|---|---:|---|
| Backend | 158 (154 original +4 credit checks) | Passed |
| Frontend | 122 (119 original +2 credit UI +1 ledger response race) | Passed |
| Identity SQL | 17 | Passed regression01 |
| Business SQL/browser | 16 | Passed regression01 |
| Inventory SQL/browser | 20 | Passed inventory01 |
| Purchasing SQL/browser | 29 | Passed purchasing02 |
| Sales SQL/browser | 23 | Passed sales01 |
| Expanded GST/NON_GST SQL/browser | 38 | Passed classification02 |
| Receipts SQL/browser | 48 | Passed receipts01 |
| Cheques SQL/browser | 66 | Passed cheques01 |
| Returns SQL/browser | 86 | Passed returns01 |
| Credit pipeline SQL/browser | 110 (86 prior +24 new) | Passed credits06 (credits05 also passed) |

Larger SQL pipelines repeat the earlier domain baselines; these counts must not be added as independent assertions. All original assertion behavior remains enforced. Only schema/run metadata advanced; the receipt validation order preserves the existing overpayment error and fails before any write.

Credit checks cover manual price/return values, original component/line caps shared across kinds, explicit reusable/damaged policy, concurrent quantity claims, fully/partly/unpaid challans, retained surplus, simultaneous receipt/credit and dishonour/credit, unapplied receipt coexistence, exact approval/revision, immutable posted edits, role/CSRF isolation, SQL fault rollback, durable replay, separate process, COMMIT acknowledgement loss and tamper detection. Independent browser sessions cover Sales price request, Accounts inspected-return request, administrator approval/post, customer ledger and mobile layout without console/page errors.

Preserved development failures: credits01 exposed receipt error precedence; credits02 exposed posted-edit error precedence; credits03 exposed mobile long-hash overflow; credits04 exposed a stale administrator browser list requiring explicit refresh. Purchasing01 retained an old fixture namespace guard; classification01 exposed a real rapid ledger-selection response race. Each fix used a fresh schema. These failed runs are evidence, not silently reused or reported as passed.

Build/lint pass. Dependency audits: backend0/frontend0 vulnerabilities. Extracted106-file package precommit verification passed production-only installation, public routes/assets, seven private probes, native password hashing and disabled SMTP behavior. W06 public regression passed66 route/viewport combinations and22 interactions. Lighthouse mobile scores: home96/catalog97/detail97/contact98 performance; all four pages100 accessibility,100 best practices and100 SEO, no accessibility failures. Main post-restart certification passed original-row preservation, all-empty operational tables, one administrator, normal recovery0, exact restricted runtime and combined reconciliations. Seven encrypted profiles/connection/secret hashes and1037 original plus1037 offline files are preserved.

Final Git review found no credentials, dependency changes, old migration edits or public asset changes. The production package is regenerated from the final commit and independently extracted/verified before push; its private receipt records the source commit and archive SHA. No package is deployed. Failed credits01–04, purchasing01 and classification01 remain preserved. Unused credits07–08 are not created.
