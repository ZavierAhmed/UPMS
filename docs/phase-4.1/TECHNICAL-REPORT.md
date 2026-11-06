# P4.1 technical report

Baseline 2899adb90ba66600776ef8324a0480f03082dede was verified against GitHub before branching. P4.0 recovery and owner UAT evidence were retained. P4.1 uses local isolated fixtures and read-only provider inspection. Production release remains BLOCKED.

Use the repository-pinned Node 22 executable and run from the repository root. The commands below require the existing isolated MariaDB engine and synthetic P4 fixture. Do not point the tooling at a production or owner UAT profile.

```powershell
$node = './tmp/production-readiness/node22/node_modules/node/bin/node.exe'
& $node scripts/p41-php-suite.mjs
& $node --test server/tests/*.test.js
& $node scripts/p4-build.mjs
Copy-Item -Recurse upms.client/dist/management tmp/php-runtime/p41-assets
& $node scripts/p4-uat3-fixture-session.mjs
& $node scripts/p41-management-browser.mjs
& $node scripts/p41-host-https.mjs
& $node scripts/p41-package-static.mjs
& ./scripts/p41-verify-static.ps1 -Browser
& $node scripts/p4-package.mjs --label=p41-final-review
python scripts/p41-verify-review-archives.py
```

Use a fresh p41-assets directory for the copy. The Apache test requires a private extraction and XAMPP Apache with mod_ssl. Its loopback certificate is a fixture. Public HTTPS checks retain certificate validation. See the individual reports and receipts for scope, observed failures and remaining gates.

Committed source `3ce5e00f5c5c6950b7c61b27695d22169ac849b8` was used for the final static, Node and PHP review archives. Verify the per-file receipts under evidence. The dependency-only archive uses the patched lock already present in the P4.0 baseline and has its own independent hash receipt.

| Review artifact | SHA-256 |
|---|---|
| Static public catalogue | `eafbfa070fed99d9efb7b6b70008e876cc3289d4f3fef7dcd5cbbc7179ec3fdf` |
| Public Node | `99d5f461b70784c0b8f765b012f6e3ee96a77c28013bd5fb6f5085f95ce52315` |
| PHP management | `cf6c09708d4d2040b8fa08c5832644df150722b2ffe6ddae198cd318e9572e5d` |
| Symfony dependency review | `4ba656f4eded61359caf93bd58f1a7feeef6f185643d925b46de90f004216ed6` |

Fresh checks passed 304 Node, 325 React and 169 PHP tests with 1,912 assertions. The React baseline failed the first reconciliation test while the workspace was still loading. A later new-test attempt failed because this suite lacks the Jest DOM assertion helpers. The final run used the repo's configured matchers. The Chrome PDF/Excel rerun generated four PDFs and two workbooks, and visual inspection covered all 11 pages. Export and statement totals matched the independent synthetic oracle.

Run the 768 px filter checks with scripts/p41-management-browser.mjs --filters. Run the financial scenarios with scripts/p41-financial-regressions.mjs, or --resume after a failed scenario. Run scripts/p41-report-artifacts.mjs with a freshly minted fixture session after the browser run. Keep these runs separate when they share the same database identity guard.

The hosted diagnosis included one GET to the live management CSRF endpoint. The route can create an anonymous session. Later external probes used only public pages and denial paths. No login, financial action or configuration change was requested.

Run scripts/p41-management-browser.mjs --financial-records after the first consolidated financial scenario to test the seeded vendor and challan lists. The focused synthetic fixture readiness proof identifies interface simple-v1.2, 47 tables and 133 guards, valid session and CSRF consistency. Composer and the two npm runtime audits reported zero advisories.

The final single-session Chrome run passed all 60 cases. All 12 fresh financial/security scenarios passed, including synthetic protected recovery and cheque attachment tamper rejection. See `evidence/financial/results.json`. Local frontend lint, syntax checks and production builds passed. The overlapping-browser timeout, external denial failure, hosted vendor preconditions and independent operator recovery remain separate release gates.

Verify the branch tip after publication:

```powershell
git rev-parse HEAD
git ls-remote --exit-code origin refs/heads/feature/upms-p4-1-release-blocker-remediation
```

The two hashes must match. The artifact source hash is recorded separately because the evidence commit follows the build.
