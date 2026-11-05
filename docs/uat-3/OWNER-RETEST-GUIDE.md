# Owner retest guide

Use only synthetic data. Existing ports 5173, 5180, 5196 and 5197 keep their databases, administrators and records. No migration or production deployment is part of this milestone.

## Review links and startup

- Public website: http://127.0.0.1:3125
- Independent management: http://127.0.0.1:5205/management

Both HTTP 200 responses were verified. Management initially waits for a new synthetic password; it does not reuse an owner binding. Its cookie name is separate from existing owner workspaces. Setup/restart was exercised in an additional disposable fixture.

```powershell
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File scripts/start-uat3-preview.ps1
```

## Required manual retest

1. Open the independent UAT-3 workspace. If setup is required, choose a new synthetic password privately in the browser.
2. At desktop/tablet/mobile widths, open Cheques → Register New Cheque. Compare paired input tops, widths and heights. Check the issuer field, its Add Issuing Bank button, file control/clear button and primary action.
3. Open Add Issuing Bank. Verify every input is full-width and Save/Cancel share a consistent action group (stacked at phone widths). Cancel and confirm the original cheque draft remains. Repeat with Save using a synthetic issuer.
4. Review deposit and clearance forms. Confirm fields, approval checkbox, evidence and actions remain readable and aligned. Do not clear any old owner instrument merely to test alignment.
5. Print the synthetic acknowledgment and multi-row register. Compare the provided PDF/Excel numerical examples. Check the linked canonical receipt and receiving bank statement.
6. Open Stock In → Production and review employee/item selectors, quantities, labor rates and initial-stock explanation without posting. Review challans, ledgers, money accounts and Hafta coverage/evidence.
7. Use navigation search, small-screen menu, Escape, Tab and browser Back/Forward. Leave/revisit an unfinished synthetic draft and confirm preservation. Logout should still warn and clear drafts according to existing behavior.
8. Review the public home, catalog, category gallery, manufacturing, industries, contact and 404 pages on phone/tablet/desktop. Verify primary phone, secondary phone and unchanged WhatsApp separately. Do not send real inquiry data during testing.

Only the owner can change the cheque print/mobile item from PENDING RETEST to ACCEPTED.

## Reproduce verification

Run from `C:\Users\zasah\source\repos\UPMS` under the Windows identity owning the isolated local engine. Node hosting tests require the existing supported Node 22.23.4 executable, not system Node 26.

```powershell
npm run build --prefix upms.client
node upms.client/node_modules/vitest/vitest.mjs run --root upms.client --maxWorkers=2
npm run lint --prefix upms.client
& 'tmp/production-readiness/node22/node_modules/node/bin/node.exe' --test --test-concurrency=2 server/tests/*.test.js
node scripts/uat3-contact-verification.mjs
node scripts/uat3-run.mjs uat2a-php-suite.mjs
node scripts/uat3-run.mjs uat2a-regressions.mjs --full
node scripts/uat3-run.mjs uat2a-extras-http.mjs
node scripts/uat3-cheque-browser.mjs
node scripts/uat3-form-alignment.mjs
node scripts/uat3-management-browser.mjs
node scripts/uat3-navigation-browser.mjs
node scripts/uat3-public-browser.mjs
node scripts/uat3-lighthouse.mjs
node scripts/uat3-report-artifacts.mjs
```

Browser helpers require the pinned local engine, independent fixture/session produced by the HTTP suite and a separate management build at `tmp/php-runtime/uat3-assets`. They never target owner bindings. `uat3-print-fixture.mjs` creates only independent long-name custody fixtures for multi-page acceptance. Do not run it against an owner environment.

The exact final commit/remote comparison is supplied in the final handoff receipt. Check `git status` before using scripts; unrelated pre-existing owner evidence/assets are intentionally not part of release commits.

The isolated review package is generated with `scripts/uat3-package.mjs` using Node 22.23.4. It preserves the generic deployment archive. Extract its ZIP into a fresh local directory and run `npm ci --omit=dev` with Node 22 before the parity command. The completed verification used:

```powershell
& 'tmp/production-readiness/node22/node_modules/node/bin/node.exe' scripts/uat3-package.mjs
& 'tmp/production-readiness/node22/node_modules/node/bin/node.exe' server/tests/verify-package.mjs tmp/uat3/package-final tmp/uat3/artifacts/upms-node-deployment.zip docs/uat-3/evidence/package-parity.json
```

These are review artifacts, not a production release package. A future approved deployment must regenerate its manifest from the approved release commit.

For a long-running isolated test whose session has expired, `node scripts/uat3-fixture-session.mjs` renews only the bound disposable UI-test session. It rejects owner bindings and never resets a password. Real password-login acceptance is performed by `uat3-startup-browser.mjs`, not by this factory. Retest filtering a cheque register, following its receipt, and returning through both explicit buttons and browser Back/Forward. Repeat from filtered Company Transactions and Client Payments.
