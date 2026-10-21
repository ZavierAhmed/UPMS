# W05 verification

Completed locally on 2026-10-21, branch `feature/upms-w05-nodejs-migration`, starting SHA `bfb28d318939b33e1edd2d76613cc2f4353ba8ba`. Remote fetched and milestone history checked before branching. No merge, public deployment or W06 work performed.

## Results

| Verification | Result / evidence |
| --- | --- |
| W04 .NET baseline before removal | 74 passed, 0 failed; `dotnet test UPMS.Server.Tests --no-restore --logger trx`. Local original report retained in ignored `tmp/w05/dotnet-baseline.trx`. |
| Node backend | 90 passed, 0 failed on Node 24.22.0 LTS; `node --test server/tests/*.test.js`. Includes real Nodemailer cancellation against a loopback TCP sink with no SMTP greeting or email sent. |
| Differential parity | 82 comparisons passed, 0 failed; [record](W05-parity-results.json), [matrix/limitations](W05-node-parity.md). |
| Existing frontend | All 89 tests across five files passed; no frontend test removed or modified. |
| Frontend build | Eleven public routes plus 404 prerendered. Same output asset names/hashes as W04 build, including `index-D4ALJ3Gv.js` and `index-D5lBnjpj.css`. |
| Frontend lint | Passed. |
| Target runtime | Node 24.22.0 used for complete build/frontend/backend/lint verification; initial exploration/browser runs used installed Node 26.4.0. Root engines and `.nvmrc` select Node 24. |
| Browser matrix | 66/66 combinations: all eleven routes at 360, 390, 768, 1024, 1440 and 1920px. No overflow, missing imagery, page exceptions or hydration errors. [Full summary](W05-browser-results.json). |
| Browser interactions | 22 checks passed: menu/Escape/navigation, search/clear/filter, direct detail refresh, five product WhatsApp actions, five category preselections, unavailable inquiry preserving inputs, actual local development outbox acceptance, HTTP 404 and legacy hash routing. Maps/WhatsApp destination checks also run across every matrix entry. No external link message was sent. |
| Security | Production-mode HTTPS harness exercised strict CSP, real prerender/hydration and disabled delivery; backend assertions cover hosts/proxies, origin, CORS absence, size/chunking, rate/retries and private static paths. |
| Dependency audit | `npm audit` reported zero known vulnerabilities after installing maintained Nodemailer. A sandbox network lookup failed; the successful registry check used authorized network access. |

Browser: Chrome/155.0.8059.84 (recorded in the machine-readable results). Local HTTPS certificate trust was bypassed only by the browser test harness; application SMTP certificate validation remains enabled. `https://www.example.test` is a reserved synthetic canonical origin used only in tests. No production origin was invented or configured. Browser server instances are test harnesses and are not deployment entry points.

Screenshots were generated for [home desktop](screenshots/w05/home-1440.png), [contact mobile](screenshots/w05/contact-390.png) and [product mobile](screenshots/w05/buckets-390.png). Visual review confirms the retained graphite/orange/warm-white layout, approved company logo, address, form and product presentation. Source assets/styles/components/page files are unchanged.

## Lighthouse comparison

Lighthouse 13.5.0, mobile configuration, local production-mode HTTPS, one measured run per page, no run warnings or failed accessibility audits. Full reports are retained under ignored `tmp/w05/lighthouse-*.json`; [summary with timestamps/metrics](W05-lighthouse-summary.json). These are local lab results, not hosted performance claims.

| Page | W04 performance | W05 performance | W04/W05 accessibility | W04/W05 best practices | W04/W05 SEO |
| --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | 98 | 96 | 100 / 100 | 100 / 100 | 100 / 100 |
| Catalog | 99 | 97 | 100 / 100 | 100 / 100 | 100 / 100 |
| Bucket detail | 99 | 97 | 100 / 100 | 100 / 100 | 100 / 100 |
| Contact | 99 | 98 | 100 / 100 | 100 / 100 | 100 / 100 |

W05 performance is 1–2 points lower than W04's recorded runs. W05 home LCP is approximately 2700ms versus W04's 2036ms; all W05 CLS values remain zero. The public build assets are unchanged. Browser version, host/runtime and lab timing differ; these single runs do not isolate a causal regression. No UI changes were made to chase measurement noise. Repeat on the eventual authorized host before launch.

## Dependencies and review

New direct runtime packages (resolved lockfile): Express 5.3.0, compression 1.8.2, Nodemailer 10.1.7. New development packages: Supertest 7.3.1, Puppeteer Core 25.15.0, Lighthouse 13.5.0. Frontend packages/lockfile were retained. Production needs only root runtime dependencies and prebuilt `upms.client/dist`.

Final review checks: no React page/component/style/data/asset modifications; no customer data/credentials; SMTP default Disabled; no database/authentication/management features; nine pre-existing untracked source assets preserved and excluded; no master changes. The obsolete tracked .NET files and JavaScript Visual Studio project were removed after parity; generated/ignored local artifacts were not recursively deleted. The old server's scaffolding changelog is preserved in [legacy record](W05-legacy-dotnet-CHANGELOG.md), and W01–W04 documentation remains intact. [Changed-file manifest](W05-files.txt) lists the exact milestone paths.

## Remaining risks and blockers

Hostinger's official managed Node documentation excludes Premium from its eligible list. Account entitlement is unresolved; Business/Unlimited or Cloud is documented. Actual proxy peers/header trust, platform entry/build/port behavior, durable storage guarantees and SMTP egress were not verified in a real account. Domain/TLS/DNS, approved mail secrets/sender/recipient and live-host verification remain launch prerequisites. See the [deployment guide](W05-hostinger-deployment.md) for sourced facts, assumptions, future MySQL connection/storage guidance and rollback.

Idempotency/rate limiting remain process-local and reset on restart. SMTP relay acceptance cannot promise inbox receipt; uncertain outcomes remain uncertain. Exotic email grammar is not exhaustively equivalent across runtimes, and in-process Brotli is replaced by gzip. These bounded differences are recorded in the parity report. No live SMTP acceptance or hosted compatibility result is claimed.
