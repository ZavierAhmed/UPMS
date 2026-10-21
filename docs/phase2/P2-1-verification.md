> **2026-10-21 P2.1A decision amendment:** The owner approved existing XAMPP MariaDB for local development. Historical P2.1 results below remain evidence of the earlier milestone; Oracle MySQL installation is no longer a local acceptance prerequisite. Current provisioning, restricted-account testing and bootstrap status are recorded in [P2.1A executive summary](P2-1A-executive-summary.md). This amendment does not convert historical compatibility tests into current acceptance or production certification.
# P2.1 verification and independent-review handoff

Date: 2026-10-21, Asia/Karachi. Branch: `feature/upms-p2-1-identity-foundation`. Starting commit: `ad77c391cf6a8d640503330f090cb74e0e4d669e` (verified local and fetched remote P2.0). History reviewed through W06 `868c488d7365fc148f21ca264d992a43f0f3990a`, W05 and W04. Final commit is reported in the handoff; this report does not embed a self-referential commit SHA.

**Overall: partially complete against the requested definition of done.** Functional implementation, automated regressions and actual-server compatibility tests pass. Real MySQL acceptance, least-privilege runtime/migration account provisioning and owner-controlled development bootstrap remain pending. MariaDB results are not represented as MySQL results.

## Executed results

| Check | Actual result |
| --- | --- |
| Node runtime | 24.22.0; no Docker/cloud/embedded database |
| `npm run verify` | PASS: build, 106 backend tests (98 existing + 8 identity), 94 frontend tests in six files (89 existing + 5 management), lint |
| Public build isolation | Eleven public prerendered routes plus 404 retained; management built as a second isolated entry; public JS/CSS filenames unchanged from baseline |
| `npm run test:mysql` against local server | **17 tests PASS on MariaDB 10.4.32 compatibility infrastructure**, zero failed/skipped/mocked; includes parent test plus sixteen integration subtests |
| Real MySQL Server integration | **NOT RUN / REQUIRED**: supplied listener is MariaDB; no MySQL Server endpoint was available |
| HTTPS management Chrome | PASS: six summarized checks, no page errors, desktop login/admin screenshots and 390px staff shell; Secure/HttpOnly/SameSite=Strict/Path=/ cookie verified |
| Existing public browser assertions | PASS: eleven routes at 360/390/768/1024/1440/1920px = 66 combinations; 22 interactions; no page/hydration errors |
| Lighthouse public pages | Home 96, catalogue 97, detail 97, contact 98 performance; accessibility/best-practices/SEO 100 for each |
| Root and client dependency audits | Both report zero vulnerabilities |
| Argon2id benchmark | Approximately 24 ms hash / 23 ms verify locally, 19,456 KiB per operation, concurrency cap two |
| Local deployment ZIP | PASS: 55 allowlisted files; no private references/secrets/unused conflicting logos; packaging guard unchanged for runtime source |
| Extracted ZIP production-only install and existing smoke assertions | PASS: independent `npm ci --omit=dev`, integrity/corruption check, eleven public routes, static asset, seven private probes; inquiry remains delivery_unavailable with SMTP disabled |
| Owner development database | Read-only final check: `upms` still has zero tables; no real owner account/bootstrap performed |
| Runtime least-privilege acceptance | **NOT VERIFIED**: supplied account has global/all privileges. Scoped review SQL supplied; existing grants unchanged |

## Actual database evidence

Unauthenticated protocol greeting and authenticated version query agreed on MariaDB 10.4.32. Workbench client is 8.0.46. The owner approved using MariaDB for compatibility tests and creating dedicated disposable schemas. InnoDB is available with transaction support, utf8mb4_unicode_ci exists and application connections report UTC `+00:00`. No unrelated application data was inspected.

Final integration schema: `upms_test_p21_20261021_run8`. Final HTTPS browser schema: `upms_test_p21_20261021_browser5`. Earlier disposable run fixtures are preserved and listed in [risks](P2-1-open-risks.md). Every full integration run starts on an empty dedicated schema, confirms exact target name and applies the real migration. A repeat invocation on an occupied test schema was also verified to refuse before writes, with user/audit/session counts unchanged. Earlier failed development attempts were corrected; no schema/data was destroyed to make a test pass. The final run passes after the expired-session and timeout fixes.

Executed integration scenarios:

1. Production/mismatched-target safety, initial migration, tracking and repeated no-op migration.
2. Concurrent one-time bootstrap: exactly one success, one refusal; administrator audit evidence and login uniqueness.
3. Valid login, pre-auth/session rotation, cookie scope, token-hash persistence and absence of plaintext password in stored session/audit details.
4. Invalid/unknown/missing credentials, CSRF/origin/Fetch Metadata rejection and unauthenticated direct API denial.
5. Administrator creates Inventory user; staff cannot view identities/audit or assign themselves Administrator; response excludes secret fields.
6. Test-only Express protected inventory resource returns quantity without rates/balances; revoking its independent permission under the guard/version protocol invalidates its session.
7. Sales/Dispatch and Accounts can access own authenticated profile while direct identity administration is denied.
8. A temporary test-schema database trigger rejects audit INSERT: staff creation returns unavailable, and the inserted user is rolled back. The synthetic trigger is then removed; this is an actual database rejection, not a mock audit backend.
9. Disabling/removing the only enabled administrator is rejected.
10. Original database pool closes; a separately spawned Node process loads the existing browser cookie/session from SQL and returns the same user. The parent then reconstructs its pool/app. This verifies actual process-boundary persistence.
11. Concurrent access/revocation serializes; after revocation commit, repeated stale requests fail and another connection sees affected sessions removed.
12. Disabled login, expired session and logout fail closed; a stale store set and a previously loaded session cannot resurrect a logged-out token hash.
13. Durable account/global login control and password-change session revocation.
14. A refused local DB connection returns sanitized 503 while public home still returns 200.
15. Explicit failed transaction rolls back audit; database pools are destroyed in finally paths.
16. A five-second statement timeout destroys the connection; the uncommitted audit row is absent after another guard-coordinated transaction can proceed.

These prove the local MariaDB behavior only. Repeat all scenarios on the chosen MySQL engine and actual scoped accounts, without setting the MariaDB compatibility opt-in, before satisfying the MySQL gate.

## Browser and public regression evidence

`server/tests/verify-identity-browser.mjs` used local HTTPS on 7447, synthetic generated credentials, installed Chrome, existing local certificate/key, and direct loopback browser routing. It verified administrator sign-in/cookie, UI staff creation, restricted audit view, logout followed by Inventory sign-in, hidden unauthorized navigation plus direct API 403, mobile overflow, and clearing private UI after separately committed session revocation. Screenshots were visually inspected; no private company records appear.

The existing W06 public browser/Lighthouse harness was run from an ignored local copy with only output locations and Chrome direct-loopback arguments adapted. Its assertions were unchanged. Results/screenshots were written under `tmp/w06/p21-public-browser` to preserve historical W05/W06 reports. The existing extracted-ZIP smoke harness also passed; its newly generated report was retained privately as `tmp/w06/p21-package-results.json`, and the historical W06 tracked report was restored to its original bytes. No historical report replacement is included in the change.

Private evidence paths (ignored, not release assets): `tmp/w06/p21-verify.log`, `p21-integration.log`, `p21-browser.log`, `p21-browser/results.json`, `p21-public-browser/results.json`, `p21-public-browser/lighthouse-summary.json`, `p21-package.log`, `p21-package-install.log` and `p21-package-smoke.log`. Reproduce checks using [setup commands](P2-1-mysql-setup.md); integration/browser scripts print their dedicated schema and do not silently substitute mocks.

Public components/copy/images/styles, public Vite config, public route registry/prerender script, inquiry implementation and W06 host/proxy logic have no source changes. The sole addition within public `src/test` is a private-shell test import, outside the public build graph. No management route enters public HTML/sitemap; public API tests retain their contract. The ZIP packager adds only exact management HTML/JS/CSS paths and still rejects arbitrary runtime documents.

## Private reference placement

Before moving, exact directory contents and Git status identified five untracked private reference files. The user explicitly approved `C:\Users\zasah\Documents\UPMS_Private_References`. Each destination was checked for collision, every source SHA-256 was compared before/after `Move-Item`, and all five matched. No destination file was overwritten. The source runtime folder is empty; packaging now passes. The files remain outside Git and are not read into UI, metadata, assets, tests or fixtures. Nine pre-existing unused untracked logo assets remain preserved and excluded from the commit.

## Definition-of-done disposition

| Requested gate | Disposition |
| --- | --- |
| Functional private shell, login/logout, persistent sessions, permissions, staff management | Implemented; unit/compatibility/browser evidence passes |
| Bootstrap on dedicated local MySQL | Bootstrap/concurrency passes on disposable MariaDB schemas; **real MySQL and owner bootstrap pending** |
| Immediate revocation, atomic identity/audit writes, CSRF/browser protections | Local compatibility/HTTPS evidence passes; repeat on real MySQL/scoped runtime account |
| Real MySQL integration passes | **Pending; milestone cannot be called fully complete** |
| Existing public functionality | Build, tests, lint, all eleven routes, browser matrix, SEO and package smoke pass |
| No sensitive files/credentials, no business transaction modules | Source references relocated with approval; synthetic fixtures only; no inventory/sales/financial schema/API/UI implemented |
| Reviewable documented changes | Seven P2.1 documents, operator template, explicit commands, migration and tests; independent review required |

Changed-file groups and architecture are catalogued in [implementation](P2-1-implementation.md). [Security](P2-1-authentication-security.md), [permission/API matrix](P2-1-authorization-matrix.md), [schema/recovery](P2-1-schema-and-migrations.md) and [open risks](P2-1-open-risks.md) are part of the review. The final diff is limited to this identity foundation and its build/verification/documentation support. No master merge, public deployment, live SMTP activation or P2.2 implementation occurred.

## Exact changed-file manifest

36 files; A = added, M = modified. Existing source assets and private evidence are excluded.

```text
M	.env.example
M	README.md
A	docs/phase2/P2-1-authentication-security.md
A	docs/phase2/P2-1-authorization-matrix.md
A	docs/phase2/P2-1-implementation.md
A	docs/phase2/P2-1-mysql-setup.md
A	docs/phase2/P2-1-open-risks.md
A	docs/phase2/P2-1-schema-and-migrations.md
A	docs/phase2/P2-1-verification.md
M	package-lock.json
M	package.json
M	scripts/package-deployment.mjs
A	server/migrations/202610210001_identity.js
M	server/src/app.js
A	server/src/identity/catalog.js
A	server/src/identity/config.js
A	server/src/identity/database.js
A	server/src/identity/migrations.js
A	server/src/identity/passwords.js
A	server/src/identity/router.js
A	server/src/identity/service.js
A	server/src/identity/session-store.js
A	server/src/identity/validation.js
M	server/src/index.js
A	server/tests/identity.test.js
A	server/tests/mysql/identity.integration.js
A	server/tests/verify-identity-browser.mjs
A	server/tools/identity.mjs
A	server/tools/provision-local.review.sql
A	upms.client/management/index.html
A	upms.client/management/src/Management.jsx
A	upms.client/management/src/main.jsx
A	upms.client/management/src/management.css
M	upms.client/package.json
A	upms.client/src/test/Management.test.jsx
A	upms.client/vite.management.config.js
```
