# Controlled one-shot GoDaddy diagnostic deployment

Baseline: `79acffb3d3a62c000c942c022916db633b545e0c`. This is a separate read-only package, not an operational UPMS release. Delivery Challan Returns, stock, ledger, payment and posting source, public website and production database gates remain unchanged.

## Execution contract and current blocker

The owner confirms that Managed Node Hosting has no interactive private terminal, injects the five `DB_*` variables and supports controlled application/deployment workflows. Preview and Publish of one app share its database. These confirmations do **not** specify whether a process that exits can be run once without health-check failure or automatic restart.

GoDaddy's [official launch article](https://www.godaddy.com/resources/news/godaddy-nodejs-hosting-launch), retrieved 2026-10-26, describes a persistent Node 22 process. The [official FAQ](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915) does not establish a one-shot exit/no-restart contract. Thus this startup package is **prepared but blocked pending exact lifecycle/storage confirmation**. It is not claimed to work as an ordinary always-running web service. No package has been uploaded, deployed or published in this change.

Before using the package, obtain provider confirmation of all of the following for the specific app/deployment method:

1. The configured startup command may run once and exit, without requiring an HTTP listener, readiness URL, keepalive process or automatic restart/redeploy.
2. It inherits the intended app's exact attached database variables; no database credential copying, fallback endpoint or database URL is required.
3. Sanitized stdout is retained in private app/deployment logs with suitable access control and retention, not exposed through a public log URL.
4. A private persistent, exclusive directory outside the package/web roots is available, survives process restarts and repeat invocations of the same run, and can be provisioned without a diagnostic build hook. On POSIX it must have mode 0700 and permit 0600 marker files. The owner/provider must verify permissions and persistence; environment strings alone do not attest them.
5. The actual dashboard allows selecting this isolated package/start command for a reviewed controlled workflow without publishing or silently changing the management deployment, production domain or live posting flags.

If GoDaddy requires a persistent process or cannot provide these conditions, record `ONE_SHOT_LIFECYCLE_UNSUPPORTED` or `PRIVATE_PERSISTENCE_UNAVAILABLE` and stop. Ask for a supported private one-time deployment task instead. Do not add a hidden HTTP trigger, health-only listener, sleep loop, SQL editor trigger, recurring build hook or migrations to work around the limitation. The one-shot package deliberately exits; it cannot satisfy an always-on service contract.

## Package, install and startup

`artifacts/upms-godaddy-controlled-diagnostic-node22.zip` contains only the diagnostic core, deployment wrapper, run-marker/integrity helpers, locked mysql2 dependency metadata, this guide, environment template, Node version and deterministic manifest. It contains no application server, HTTP routes, public assets, administrator creation, migrations, company data, credentials or collected results.

Prepare it locally on Node 22.23.4+ with `node scripts/package-godaddy-controlled-diagnostic.mjs`. Verify the adjacent SHA256/receipt with `node scripts/verify-godaddy-controlled-diagnostic.mjs`. The release receipt identifies the exact source commit and package hashes. Verify these before a separately reviewed controlled execution.

Only after the contract above is confirmed and execution is reviewed, select the separate diagnostic artifact in the provider-supported workflow. Installation is `npm ci --omit=dev --ignore-scripts`; build is `npm run build`; start is `npm start` → `node startup.mjs`. Build only checks package integrity and never imports mysql2, connects to a database or invokes the diagnostic. Do not add execution to the general application's build/start hooks. Do not change the operational app's start command or publish a diagnostic replacement over it. If the provider cannot safely execute a separate artifact against the intended attachment without replacing management, stop for a supported one-time task.

Use `ENVIRONMENT.template.txt` from the ZIP, whose release SHA is already filled in. Set reviewed app identity, non-secret review reference, purpose, one UUID per intended assessment, exact independently approved hostname/port, and the provisioned private persistent state directory. Never set the expected endpoint by automatically copying `DB_HOST`/`DB_PORT`; independent provider assignment must be reviewed. An optional verified CA bundle stays in private storage and is referenced only by path. Do not reveal injected settings, enable debug logging, or provide owner/admin credentials.

Configuration rejects missing credentials, unknown `DB_*`/diagnostic variables, alternate connection URLs, management/session/production flags, invalid mode/purpose/review identity, wrong release, wrong endpoint, insecure TLS and missing lifecycle/storage acknowledgments before database access. Provider-injected `PORT` is ignored; no listener exists. Node 22.23.4+ is required and the observed Node version is included even in a blocked report.

## Once-only behavior and security

After release/file integrity, configuration and CA checks, startup atomically creates a hashed `.consumed` file in the reviewed private state directory using exclusive creation. The fixed contents are only `READ_ONLY_RUN_CONSUMED`; no results, endpoint, credentials or company data are written to it. The marker is scoped by app identity, run UUID and release SHA. It is consumed **before connecting** and retained after success, timeout, TLS failure or crash. Concurrent/restarted attempts return `DIAGNOSTIC_RUN_ALREADY_CONSUMED` and never reassess. Partial/failed marker writes also prevent a blind retry. A missing/unsafe/unavailable state directory fails closed.

The marker is a private filesystem safety record, not a database write. Persistence cannot be inferred from one local process test: the provider must prove that the directory remains stable across the supported deployment lifecycle. A new container/volume or unreviewed run UUID can defeat continuity; that is why a no-restart lifecycle, exclusive persistent storage and reviewed fixed UUID are required. Do not delete markers or rotate the UUID automatically. A new intentional attempt requires a separate review and a new receipt/run UUID.

Only the existing fixed read-only assessor executes SQL. It requires authenticated certificate-chain and hostname verification with TLS 1.2/1.3, reports cipher/version, and issues only bounded SELECT/SHOW metadata queries. It reports full engine/version, schema/account, server ID/UUID/port/read-only state, base-table/migration presence and sanitized grants. Encrypted-only/unverified TLS, raw IP endpoints, CA errors and wrong assignments fail closed. There is no arbitrary remote fallback or operational-profile change.

The process emits one sanitized JSON record to private stdout and exits (0 for collected/already-consumed; 2 for blocked). A 16-second hard watchdog bounds startup too. Raw errors, stacks, connection strings, endpoint settings, passwords and CA/state paths are never logged. Current schema/account/server observations are intentionally private review metadata. Operator-declared app identity is hashed in logs and explicitly labeled as not provider runtime attestation. No application HTTP endpoint, public diagnostic URL, posting, accounts or automatic migrations exist.

Successful collection never authorizes initialization, full runtime grant acceptance, staging isolation or operational management. The standalone CLI from the previous milestone remains available unchanged for a future supported private terminal/job; the new package does not change its no-server default.

## Reviewing actual results

Record the reviewed artifact SHA256, source SHA, run UUID, private execution receipt/time, app identity/control-plane reference and sanitized private log. Keep complete schema/account/server identities in owner-controlled private evidence, outside deployed files and Git; publish only an approved non-secret summary. `COLLECTED` means observations were gathered, not production compatibility.

Compare the observations with the exact intended assignment. Investigate unknown/mismatched engine, TLS, schema/account, UUID, port or grants separately. A zero base-table count is not authorization to create tables. Any existing tables/history require preservation and a forward review. Do not execute migrations, create users, initialize production, import real data or enable posting based only on connectivity. Actual hosted observations remain in [the hosted record](GODADDY-STAGING-HOSTED-OBSERVATIONS.md), separate from local tests.
