# W05 Node deployment and operations

Research date: 2026-10-21. Nothing was deployed; no credentials or live sender were configured.

## Hosting eligibility and documented facts

**Premium compatibility is blocked.** The current [managed Node application guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) lists Business/Unlimited and Cloud plans, Express support, and Node 18/20/22/24. It does not list Premium. Obtain account-specific confirmation of an eligible managed Node entitlement or change plan before deployment; W05 does not authorize a purchase. Select Node **24 LTS**, supported through April 2028 according to the [Node migration guide](https://nodejs.org/en/blog/migrations/v22-to-v24). Do not select an end-of-life runtime merely because it appears in a hosting dropdown.

The [Node limits guide](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/) documents one long-running process per app, a 120-second request limit, and no inbound WebSockets, permanent background workers or extra services/custom ports. UPMS uses one Express listener, no production renderer/worker, and at most 30 seconds for delivery. Do not run PM2 or cluster mode; [Hostinger manages the process](https://www.hostinger.com/support/how-to-fix-503-and-too-many-processes-errors-on-node-js-websites-at-hostinger/).

The [build troubleshooting guide](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/) requires correct build/start scripts and a root package.json, and recommends port 3000. UPMS defaults to 3000 and honors injected PORT. The actual selected account's interface/port/entry-field behavior must be checked in its build settings; no VPS/root/service setup is needed.

## Proposed managed application settings

Use the repository root as application root and Express as framework. Entry file: `server/src/index.js`. This is a full backend deployment, not a static Vite upload. The generated asset directory is `upms.client/dist`; the application must retain that directory plus the server sources and root runtime dependencies.

```sh
# Reproducible dependency installation, from repository root
npm ci
npm ci --prefix upms.client
# Build command (installs client development tooling even for production builds)
npm ci --include=dev --prefix upms.client && npm run build
# Production start command
npm start
# Local combined verification, with development dependencies installed
npm run verify
```

If the build service does not install root dependencies automatically, prepend `npm ci --omit=dev` to the proposed build command. Confirm the build log rather than assuming auto-detection is correct. No .NET or Visual Studio is required. Root development dependencies are test/audit tools and can be omitted at runtime. Do not prune the client build tooling before the build completes. Do not expose the repository root through an independent static web root.

Hostinger supports [environment values in deployment settings](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/). Add all keys manually if detection misses them. Server values are runtime configuration; `VITE_*` values become public build output, so never put secrets there. [Restart from the dashboard](https://www.hostinger.com/support/how-to-fix-changes-not-showing-after-a-node-js-deployment-at-hostinger/) after runtime changes; rebuild for client changes. Restarts/redeployments lose process-local retry/rate state. Do not enable an automatic deployment integration while only review/push is authorized.

## Environment variables

The `.env.example` file is a template, not automatically loaded. In development export values in your shell, or explicitly run Node with `--env-file` for a private file. Production injects secrets from the dashboard.

| Variable | Default / requirement |
| --- | --- |
| NODE_ENV | Set `production` in hosting. Unset means local development. |
| PORT | Platform value, otherwise 3000; listener binds 0.0.0.0. |
| ALLOWED_HOSTS | Required explicit comma/semicolon-separated hostnames in production, no wildcard or scheme/port. Development defaults to loopback names. Include the canonical hostname. |
| PUBLIC_ORIGIN | Blank until the real public HTTPS origin is approved. Blank means noindex, robots disallow-all, sitemap 503. No invented domain. |
| TRUSTED_PROXY_IPS | Empty; exact verified immediate-peer IP addresses only. CIDR/hop counts/trust-all are rejected. |
| WEBSITE_ROOT | `upms.client/dist`, relative to application working directory. Must contain the prerender manifest/documents. |
| INQUIRY_PUBLIC_ORIGIN | Defaults to PUBLIC_ORIGIN, otherwise request's validated host and trusted scheme. Optional explicit same-origin authority. |
| INQUIRY_MODE | `Disabled`; only `DevelopmentFile` in development or explicitly configured `Smtp` can deliver. |
| INQUIRY_TIMEOUT_SECONDS | 15, clamped 1–30. |
| INQUIRY_RATE_LIMIT | 5 per client per ten minutes, clamped 1–100. |
| SMTP_HOST / SMTP_PORT | Empty / 587. Approved SMTP DNS hostname and provider port. |
| SMTP_TLS_MODE | `StartTls` or `SslOnConnect`, normally 587 / 465 respectively. Certificate validation remains enabled. |
| SMTP_USERNAME / SMTP_PASSWORD | Empty; hosting secrets only. |
| SMTP_FROM / SMTP_RECIPIENT | Empty; approved single mailboxes. |
| API_PROXY_TARGET / DEV_SERVER_PORT | Vite only: http://localhost:3000 / 58500. |

## Proxy/TLS security gate

Do not set Express trust proxy true. No public source retrieved established Hostinger's actual peer addresses, forwarded-header sanitation or proxy chain for this account. Before launch, obtain those facts from support and verify on the selected application. Ensure the origin listener cannot be reached by untrusted clients bypassing the platform edge. Configure only exact nearest peer IPs. The app reads only the rightmost client IP/scheme from that peer and ignores forwarded host entirely. Arbitrary clients cannot forge TLS/IP with untrusted peers. Empty trust remains conservative: requests behind unverified TLS termination may redirect repeatedly, and visitors may share one rate-limit bucket. That is an unresolved launch blocker, not a reason to disable protection.

Verify real domain Host/Origin, HTTPS redirection without loops, HSTS, CSP, forwarded-IP spoof resistance, API no-CORS/no-store behavior, static allowlist and error confidentiality at the real edge. Confirm both apex/www deployment behavior and use one canonical site; platform process arrangements across aliases are not asserted by local tests.

## SMTP and storage gates

No official evidence retrieved establishes outbound SMTP connectivity/port restrictions for this particular managed Node account. Verify authenticated TLS connectivity and provider quotas with Hostinger and the mail provider before separately authorizing a live sender. Do not treat a mail provider's general SMTP setup guide as proof of managed app egress. Credentials and approved recipient are still missing; Disabled remains correct.

Nodemailer uses mandatory [TLS transport](https://nodemailer.com/smtp), a fixed company sender/subject/recipient, validated Reply-To and plain text. Relay acceptance is not inbox receipt. Explicit negative SMTP replies are rejected; ambiguous send failures/timeouts remain unknown and are cached to avoid blind resubmission. Confirmed acceptance survives disconnect errors. Logs contain only outcome/reference, never customer content or SMTP exceptions.

`DevelopmentFile` creates atomically renamed private files under `server/.local/inquiry-outbox`, excluded from Git and all public static paths. It never activates in production. Local development files contain synthetic data during tests. Filesystem persistence across managed deployments/restarts, writable path guarantees and backup retention **were not verified**. This milestone does not rely on filesystem persistence in production. Never use that outbox as a durable production queue.

## Future MySQL (design only)

No driver, database, authentication, sales/stock tables, ledgers or inquiry persistence was added. A future database module should own a small bounded `mysql2/promise` pool, prepared/parameterized statements, finite acquisition/query deadlines and a bounded queue; release connections in `finally`, use transactions for coordinated writes, close the pool on shutdown, and keep credentials in hosting secrets with least privilege. Start with a pool of approximately five connections and size it against the actual account/alias process budget. Do not open a new connection per request or claim this suggested size is a hosting guarantee.

Hostinger's [Node MySQL guide](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/) recommends `127.0.0.1`, port 3306, full prefixed database/user names and environment configuration. Its Node-specific IPv4 guidance avoids localhost resolving to ::1. MySQL connectivity still needs account verification. [Plan limits](https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/) vary by purchased plan/version: the current web table lists 3 GB databases, per-user connections of 25/50/75 for Single/Premium/Business, and shared disk/inode/memory budgets. Confirm hPanel values rather than assuming older Premium entitlements carry forward. [Connection-rate documentation](https://www.hostinger.com/support/how-to-fix-mysql-operation-not-permitted-error/) also reports 20 new connections/second. Backups, retention, storage growth, migrations and restore tests belong to the future design. No MySQL limit has been tested against this account.

## Rollback and outstanding blockers

W04 remains available at `bfb28d318939b33e1edd2d76613cc2f4353ba8ba` and its original branch. If a future authorized deployment fails, redeploy its previously verified artifact on its compatible .NET host; do not attempt to start .NET on managed Node hosting. Keep SMTP disabled until state is reconciled. There is no database migration to reverse. Coordinate retries manually after restarts because neither backend promises durable exactly-once delivery.

Outstanding launch gates: Premium entitlement/eligible plan, approved domain/TLS/DNS, actual proxy topology and header sanitation, build/entry/port behavior, filesystem persistence policy, SMTP egress and approved live mail configuration, then real-host security/browser/Lighthouse checks. W05 performs no external deployment or W06 work.
