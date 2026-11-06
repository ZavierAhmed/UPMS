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
& ./scripts/p41-verify-static.ps1
```

Use a fresh p41-assets directory for the copy. The Apache test requires a private extraction and XAMPP Apache with mod_ssl. Its loopback certificate is a fixture. Public HTTPS checks retain certificate validation. See the individual reports and receipts for scope, observed failures and remaining gates.

Committed application source eee4767748a3eb4a604d27318051eea34b5bb38b was used for the static, Node and PHP review archives. Verify the per-file receipts under evidence. The dependency-only archive uses the patched lock already present in the P4.0 baseline and has its own independent hash receipt.

Fresh checks passed 304 Node, 325 React and 169 PHP tests with 1,912 assertions. The React baseline failed the first reconciliation test while the workspace was still loading. A later new-test attempt failed because this suite lacks the Jest DOM assertion helpers. The final run used the repo's configured matchers. The Chrome PDF/Excel rerun generated four PDFs and two workbooks, and visual inspection covered all 11 pages. Export and statement totals matched the independent synthetic oracle.

Run the 768 px filter checks with scripts/p41-management-browser.mjs --filters. Run the financial scenarios with scripts/p41-financial-regressions.mjs, or --resume after a failed scenario. Run scripts/p41-report-artifacts.mjs with a freshly minted fixture session after the browser run. Keep these runs separate when they share the same database identity guard.
