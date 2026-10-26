# Delivery return verification — 2026-10-26

Starting branch: `feature/upms-godaddy-managed-db`. Starting SHA: `f167ad4ac3f624cd242b488897a9d531d2cf5d93`.
Delivery branch: `feature/upms-cpanel-db-and-challan-returns`.

## Final results

| Check | Result |
| --- | --- |
| Backend on Node 22.23.4 | 205 passed, 0 failed |
| Frontend | 24 files / 185 tests passed |
| Existing V1.2B MySQL/MariaDB payment suite, unchanged | 16 passed, 0 failed on fresh MariaDB 10.4.32 |
| Existing V1.2 stock, discount and challan suite, unchanged | 20 passed, 0 failed on fresh MariaDB 10.4.32 |
| Return SQL / browser acceptance | 15 check groups passed on fresh Oracle MySQL 8.4.13, schema `upms_test_dcr_20261026_06`, restricted runtime |
| Stock and ledger reconciliation | Matched, including every posted return and original source evidence |
| Production build | Passed; existing management bundle size warning remains (>500 kB) |
| Frontend lint | Passed |
| npm advisory audit, root and frontend, including development dependencies | 0 vulnerabilities in both |
| Public website preservation | All 111 public build files byte-identical to baseline Preview ZIP from starting SHA; source branding/assets unchanged |
| ZIP CRCs, file hashes, paths, entry point and Node engine | Passed, 232 files |
| Extracted production-only dependency install / Node 22 smoke | Passed: manifest build, blocked health, disabled login, API 503, public routes hidden, injected credentials rejected |
| Owner cPanel connectivity, TLS, privileges, isolation and restoration | Not tested; no provider endpoint or evidence supplied. Profile remains blocked |

Final SHA, deployment SHA256 and exact release-byte receipt are recorded in the adjacent generated artifact receipt after committing. See `artifacts/upms-godaddy-cpanel-release-receipt.json`, `.zip.sha256` and [deployment plan](../deployment/UPMS-RETURN-DEPLOYMENT-PLAN.md). Generated artifacts and local logs are intentionally excluded from Git.

## Return coverage

The fresh SQL acceptance checks posted-only sources, draft rejection, wrong client, foreign lines, altered historical rate, invalid/zero/negative/fractional/excess quantities, required reason, unnumbered/no-effect draft, partial/full/selected/multiple returns, 500−100−50=350 remaining, concurrent competing returns and same-document finalization, exact-once stock/credit, duplicate requests, dropped COMMIT response, retry from a separate restarted process, full discounted reconciliation, partial rounding, leading-zero normalization, out-of-creation-order draft finalization, paid-client credit without refund, injected database rollback after stock writes, original document immutability, audit/journal consistency and reporting.

The test database instance uses its own new data directory and verified synthetic server ID, independent from all existing local/demo/production schemas. Runtime cannot mutate journals, perform DDL or read global account data. Setup passwords and application/session secrets are generated privately; none appear in screenshots, source, artifact or test results. No owner database migration/import or real transaction occurred. No existing test was removed or weakened.

Browser checks cover desktop/mobile, Create Return, date-only form, remaining quantities, draft review, finalization, original summary, refresh protection, and acknowledgment print without prices. Actual XLSX bytes from return, stock movement, client ledger and company transaction exports were checked for DCR, original DC and return labels. Reconciliation is repeated after the fault/replay tests.

## Evidence

- [Machine-readable acceptance](evidence/return-acceptance.json)
- [Original challan](evidence/return-original.png)
- [Return form](evidence/return-form.png)
- [Saved draft](evidence/return-draft.png)
- [Posted return](evidence/return-posted.png)
- [Non-priced acknowledgment](evidence/return-acknowledgment.png)
- [Challan summary](evidence/return-summary.png)
- [Mobile detail](evidence/return-mobile.png)
- [Return report](evidence/return-returns.png)
- [Stock movements](evidence/return-stock-movements.png)
- [Client ledger](evidence/return-client-ledger.png)
- [Company transactions](evidence/return-company-transactions.png)
- [Changed files](DELIVERY-RETURN-CHANGED-FILES.txt)

## Earlier diagnostic failures and limits

The shell initially used unsupported Node 26.4.0; two startup checks failed there. The complete required Node 22 suite passes. The initial sandboxed run could not open local listeners; local acceptance used reviewed execution outside that network restriction.

The existing local server on 3309 was stopped. Acceptance used new disposable data directories; all partial fixture schemas were preserved. Initial harness attempts exposed a MySQL username length limit and credential/process-start issues. These were corrected before the successful fresh runs.

The unchanged MariaDB payment fault fixture failed once against MySQL 8.4 because its COMMIT parser assumes MariaDB packet framing. The complete unchanged suites pass on their intended MariaDB engine. New return fault tests recognize MySQL 8 query-attribute framing and pass against MySQL 8.4, including a real dropped COMMIT acknowledgment and separate-process replay. A rollback fixture initially expected HTTP 500; the existing safe database error boundary correctly responds 503, and that expectation was corrected. These were test-harness corrections, not relaxed application protections.

Local engine/browser success is not acceptance of GoDaddy's network, TLS, database architecture, backup service or Preview/Publish isolation. No live connectivity or operational deployment is claimed.
