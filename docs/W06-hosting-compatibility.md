# W06 hosting compatibility

Reviewed 2026-10-21 against official sources. Baseline: `1a60bca4e5f4d41b7f0ef0f9615af3964a56c422`. No Hostinger account was connected or inspected, so this is a documentation and local readiness assessment, not a hosted acceptance result.

## Eligibility decision

**Premium is blocked for the proposed Express deployment.** The [current resource table](https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/) explicitly marks Node.js unavailable on Web Premium. The [managed Node guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) supports Express on Business/Unlimited and Cloud Startup/Professional/Enterprise/Enterprise Plus, with Node 18/20/22/24. UPMS selects Node 24 LTS. Business is now marketed as Unlimited on most pages; older Business customers retain their purchased limits. Confirm the exact account product/version before choosing it. No purchase or upgrade was made, and no price/cheapest-plan claim is made.

Static React hosting alone cannot run the inquiry API. A Premium account with MySQL does not thereby gain managed Express support. Do not substitute an unsupported persistent SSH process. Use an eligible managed Node entitlement or stop at this gate.

## Confirmed capabilities and local mapping

| Area | Confirmed documentation | UPMS mapping / limits of verification |
| --- | --- | --- |
| Framework/runtime | Express and Node 24 are listed in the managed Node guide above. | Root engines and .nvmrc select 24; local Node 24.22.0 checks passed. Actual account runtime is unknown. |
| GitHub / ZIP | Same guide supports both workflows and exposes editable build settings/entry file. GitHub integration can deploy automatically on pushes. | Source and prebuilt ZIP procedures below. No integration enabled, upload or deployment performed. |
| Startup/build | [Build troubleshooting](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/) requires root package.json, valid build/start scripts and port 3000; node_modules should be installed by the platform, not uploaded. | Entry server/src/index.js; npm start; PORT overrides default 3000; 0.0.0.0 listener. GitHub build uses build:hosting. ZIP build verifies prebuilt content. |
| Environment | [Environment guide](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/) supports manual values/import, including keys auto-detection misses, without committing them. | NODE_ENV, hosts, origin, proxy and inquiry settings must be entered explicitly; .env is not loaded implicitly. No DB settings are consumed by W06. |
| Process/resources | [Node limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/) describes one long-running process per site, shared NPROC/memory, 120-second requests and no permanent workers/inbound WebSockets/custom services. Business/Unlimited permits five Node sites, NPROC 120, entry processes 60; Cloud Startup permits ten, 200 and 100 respectively. | UPMS has one listener, no worker/SSR/child process in production and delivery timeout at most 30 seconds. Hostname aliases may add processes; process-local idempotency is not shared. No PM2, Docker, nginx or systemd required. |
| Storage/redeploy | Managed Node guide describes new version folders, a current symlink, latest two successful versions retained, failed deployment leaving the previous live version, and deployment-managed folders overwritten. | Do not store durable customer data/outbox in release folders. Keep a separate known-good artifact and its settings; no filesystem durability was tested. |
| MySQL | [Node MySQL guide](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/) documents local 127.0.0.1:3306, prefixed database/user names and dashboard configuration. | Applies to eligible managed Node apps generally; not evidence of connectivity on the selected unverified account. See MySQL planning report. |
| SMTP | Resource documentation distinguishes server-based mail limits from authenticated SMTP. | No source retrieved established account-specific Node SMTP egress ports or relay quotas. No SMTP connection to an external host was made. Delivery remains Disabled. |
| Proxy/HTTPS | No retrieved official source specified this account's immediate peer IPs, header sanitation/chain, or origin-listener reachability. | Exact peer allowlist stays empty by default. HTTPS redirects/strict hosts/CSP are locally tested; actual edge behavior remains a launch gate. |

Official sources were retrieved with Firecrawl. A broad SMTP/proxy search returned no relevant results; this does not prove either service is unsupported. An initially requested backup URL redirected to a VPS guide and was excluded from managed-host conclusions. Managed web/cloud backup sources are in the MySQL report.

## Deployment settings requiring account verification

Use a backend Express application, repository/archive root as working directory, entry `server/src/index.js` and `npm start`. The app needs `server/src` and `upms.client/dist` in the same release tree. It must retain the route manifest and private prerender files for the application to read.

The actual selected account's output-directory/entry-field behavior was not inspected. **Do not publish the repository root or all of dist as an independent static site**: direct static HTML could bypass runtime canonical/noindex/security/404 handling, and copying _pages could expose private prerender files. Public HTML, APIs, robots and sitemap must reach Express; only the application's asset allowlist may bypass it after verification. If hPanel requires an output directory for Express, obtain the backend-specific setting from support and prove it on the authorized target before launch. Guessing `.` or selecting Vite static mode is not acceptance.

Account evidence still required: plan name/version and Node app entitlement; Node 24/entry/cwd/PORT; all HTML routed through Express; immediate proxy addresses and sanitation of X-Forwarded-For/Proto; direct-origin isolation; TLS and apex/www topology; SMTP egress and provider policy; MySQL version/engine/limits/127.0.0.1 reachability; backup coverage and retention. No account credentials are needed in the repository or this report.
