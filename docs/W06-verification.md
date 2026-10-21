# W06 verification

Date: 2026-10-21. Branch: `feature/upms-w06-hosting-readiness`. Starting commit: `1a60bca4e5f4d41b7f0ef0f9615af3964a56c422`. Fetched origin, inspected branches/history, verified the exact W05 tip and read AGENTS.md before branching. W05 is parented by the verified W04 milestone. No W06 branch existed when work began.

## Scope and implementation review

The W05 production application, frontend sources/styles/assets, inquiry contract and frontend dependencies required no runtime corrections and remain unchanged. W06 adds an explicit managed-host build command, a standard-library-only deterministic prebuilt ZIP/checksum workflow, production entry-point tests and package smoke tests. Browser verification now accepts a validated milestone flag so W06 evidence does not overwrite W05 records. README links the new operations documents. No new dependencies or lockfile changes were needed.

The only production manifest changes are npm scripts; the runtime entry remains `server/src/index.js`, port defaults to 3000 and honors PORT on 0.0.0.0. Source GitHub builds and prebuilt ZIP builds are intentionally distinct and documented. The archive contains only 43 allowlisted files; its dependency installation/build/start were verified after independent extraction with Windows' ZIP implementation.

## Executed checks

| Check | Measured result |
| --- | --- |
| Clean installation | Root npm ci --include=dev and frontend npm ci --include=dev succeeded; repeated with the explicit Node 24 npm CLI to avoid the system npm launcher's Node 26 executable. Both reported zero vulnerabilities. |
| Target runtime | Node 24.22.0 for full verify, production entry tests, ZIP generator/checker/smoke and browser harness. The initial system npm launcher issued a Node 26 engine warning; final target-runtime runs use Node 24 explicitly. |
| npm run verify | Passed: build, 98 backend tests (including eight new production process tests), 89 existing frontend tests in five files, frontend lint. Local log: ignored tmp/w06/verify.log. |
| Production build command | NODE_ENV=production build:hosting succeeded with frontend dev build tools explicitly included, eleven public pages and 404 generated. Local log: tmp/w06/hosting-build.log. |
| Production entry | Real server honors supplied PORT, serves all eleven routes, preserves security headers, redirects HTTP 307, rejects hostile Host, blocks private files, returns honest disabled SMTP response; no separate SSR/service process. |
| Startup failures | Missing/wildcard hosts, bad port, missing build, trust-all configuration, unsafe origin and occupied port all exit nonzero with safe clear diagnostics. |
| Shutdown | Registered SIGTERM handler closes the real listener and exits zero within the six-second test bound. Windows shim emits that handler via IPC because Windows child termination does not deliver POSIX SIGTERM normally; actual Hostinger Linux signal delivery still requires target acceptance. |
| Existing HTTP/security suite | All W05 tests passed: CSP/HSTS/headers, trusted immediate peers, ignored forwarded host, 16 KiB/chunked limits, rate limiting, origins/no CORS, errors/log confidentiality, cached retries/duplicates, SMTP Disabled/test-only outbox, static assets/private-path boundaries, metadata and real 404/405 responses. |
| Dependency audits | Full backend and frontend npm audit each reported zero vulnerabilities. Fresh extracted production-only install also reported zero. No new package added. |
| ZIP portability/integrity | Standard Windows ZIP reader listed/extracted all 43 files; npm ci --omit=dev installed 82 runtime packages, with Express/compression/Nodemailer present and Supertest/Puppeteer/Lighthouse absent. Checksum build verified 42 files plus the manifest. A corruption probe was rejected and the generated test fixture restored. Two generator runs with identical inputs produced identical archive SHA256. |
| Packaged HTTP smoke | All eleven routes 200 with prerendered content, real JS asset 200, seven unknown/private probes 404, synthetic inquiry 503 delivery_unavailable. [Package results](W06-package-results.json) include the tested archive hash. |
| Responsive browser regression | 66/66 combinations: eleven routes × 360/390/768/1024/1440/1920px. No overflow, missing imagery, page errors or hydration errors. [Browser record](W06-browser-results.json). |
| Browser interactions | All 22 retained checks passed: responsive menu/Escape/navigation, catalog search/clear/filter, detail direct refresh, five product-specific WhatsApp actions, five category preselections, disabled-delivery form preserving details, actual local test outbox acceptance, HTTP 404 and legacy hash navigation. Correct WhatsApp and Maps links checked across the route matrix. No messages/maps actions were sent externally. |

The browser harness used Chrome/155.0.8059.84 with local HTTPS and a certificate-trust bypass solely for that local test. Its production-mode instance uses reserved `https://www.example.test` canonical metadata and delivery Disabled; a separate development instance saves only synthetic test inquiry data. This does not configure a real production domain or activate SMTP. Tests ran on Windows; managed Linux/account integration is still untested.

Screenshots: [home desktop](screenshots/w06/home-1440.png), [Contact mobile](screenshots/w06/contact-390.png), [bucket detail mobile](screenshots/w06/buckets-390.png). Public source/build asset hashes remain unchanged from W05, including JS `index-D4ALJ3Gv.js` and CSS `index-D5lBnjpj.css`.

## Lighthouse

Lighthouse 13.5.0 mobile, local production-mode HTTPS, one run per page; no warnings or failed accessibility audits. [Measured summary](W06-lighthouse-summary.json); full local reports are ignored under tmp/w06. Scores match W05's recorded values. These are local lab results, not hosted performance measurements.

| Page | W05 performance | W06 performance | W06 accessibility | W06 best practices | W06 SEO |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 96 | 96 | 100 | 100 | 100 |
| Catalog | 97 | 97 | 100 | 100 | 100 |
| Bucket detail | 97 | 97 | 100 | 100 | 100 |
| Contact | 98 | 98 | 100 | 100 | 100 |

## Hosting/database conclusions and remaining blockers

[Official hosting research](W06-hosting-compatibility.md) confirms managed Express/Node 24 on Business/Unlimited and Cloud, while the current resource table explicitly excludes Web Premium. No account-specific evidence was available. The GitHub/ZIP procedures are prepared and locally tested; no hPanel settings, build/output-directory behavior, actual proxy topology, TLS/DNS or SMTP egress were verified against a live account. Those are explicit unchecked [acceptance gates](W06-deployment-checklist.md), not implied compatibility guarantees. GitHub automatic deploy/preview behavior was documented but not enabled.

[MySQL planning](W06-mysql-readiness.md) covers database/user creation, 127.0.0.1:3306, plan-specific capacity, bounded pooling, transactions, migration/recovery strategy, backups/restore drills and retention ownership. The IPv4 recommendation applies to documented managed Node hosting, not proven connectivity on an unverified Premium account. No MySQL driver, connection, table, migration or management entity was added. Provider backup windows are documented; actual account backup coverage and a future isolated restore drill remain pending.

Final diff review: only W06 tooling/tests/docs/evidence and package scripts changed; W01–W05 historical evidence and all public website/runtime sources retained. The nine pre-existing untracked company/source logo assets were preserved and excluded from staging and the ZIP. No customer data, credentials, SMTP activation, database access, master merge, hosting purchase, DNS configuration or deployment occurred. The review ZIP remains an ignored local artifact; generate a release artifact from the independently approved clean commit before any later authorized deployment. [Changed-file manifest](W06-files.txt).
