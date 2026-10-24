# Production hosting handoff — review required

Source: website `f619bbc1ad7065941d7c578b790a529746b704b5`, containing accepted management `997dc28dba1a2e45058058b1f2d352b1b86b2d6a`. Release branch: `feature/upms-production-hosting-readiness`. Final source identity and ZIP digests are recorded in the generated `artifacts/production-readiness-receipt.json`; this file contains no credentials.

## Decision

Node **22.23.4** and **24.22.0** passed local compatibility checks. Both packages completed clean production-only dependency installation, integrity checks and actual HTTPS browser login using their installed native Argon2 binding. Express, mysql2, Knex, sessions, CSRF and ESM run successfully. The supported engine floor is explicit; advertising “Node 22” alone does not establish the host's exact version or Linux native-binding compatibility.

**GoDaddy management deployment remains blocked.** The owner reports a remote managed database. UPMS retains its loopback-only database policy; no remote-host exception or tunnel workaround was added. Its database engine/version, exact Node patch, proxy peers, persistence, backup access and restart behavior remain unverified. The owner chose to leave provider selection open. A Node 24 host with a private local MySQL instance is an available architecture, not a selected provider.

The public website remains on its current hosting. Nothing was published, no DNS was changed, no real opening data was imported, and production posting was not activated. Original XAMPP, port 3309 and existing demo databases were not used by this milestone.

Official references: [GoDaddy Node hosting](https://www.godaddy.com/hosting/nodejs), [GoDaddy FAQ](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915), [Argon2 supported runtimes and binaries](https://github.com/ranisalt/node-argon2), [Oracle MySQL 8.4 Windows downloads](https://dev.mysql.com/downloads/mysql/8.4.html?os=3). Account-specific acceptance still requires inspection on the selected host.

## Release contents and isolation

`artifacts/upms-management-node22.zip` and `artifacts/upms-management-node24.zip` include the built application, lockfile, source, four explicitly selected production migrations, their three baseline migration dependencies and the offline production CLI. No credentials, test database, local profiles, owner source assets, backups or node_modules are included. Install with `npm ci --omit=dev` on the target platform; do not upload Windows node_modules to Linux. Keep an immutable copy of each ZIP and its SHA256 receipt. Packaging is `node scripts/package-production-readiness.mjs` after `npm run build`.

The production profile selects only identity plus Simple V1 tables. It does not run the legacy ERP migration directory. The UI retains the single operator, bottles, stock, clients/vendors, challans, payments, transactions, expenses, exports and printing. Management hosting rejects public website routes. Schema, runtime account, server ID, instance UUID, port, migration history, table set and InnoDB checks bind each connection to its reviewed deployment.

## Environment and startup

Store secrets in a host secret store or a private environment file outside the release and web root, readable only by the service owner. The application does not automatically load an arbitrary `.env` file. Supply these values through the service manager:

| Variable | Required production value |
|---|---|
| NODE_ENV | production |
| PORT | provider-assigned internal application port |
| PUBLIC_ORIGIN / MANAGEMENT_ORIGIN | https://app.unique-plastic.com |
| ALLOWED_HOSTS | app.unique-plastic.com |
| MANAGEMENT_ENABLED | true |
| MANAGEMENT_LOCAL_HTTP | false |
| INQUIRY_MODE | Disabled |
| TRUSTED_PROXY_IPS | exact independently verified immediate proxy IPs; never trust all |
| UPMS_SIMPLE_V1 | production-v1 |
| UPMS_PRODUCTION_PURPOSE | production |
| DB_HOST | 127.0.0.1 (local private database) |
| DB_PORT | reviewed new instance port; never the old 3309 endpoint |
| DB_NAME / DB_CONFIRM_NAME | upms_live_v1 |
| DB_USER | upms_runtime_production |
| DB_PASSWORD | fresh private runtime credential |
| IDENTITY_DB_PURPOSE | runtime |
| SESSION_SECRET | fresh cryptographically random secret, at least 32 bytes |
| UPMS_EXPECTED_SERVER_ID | independently verified numeric MySQL server_id |
| UPMS_PRODUCTION_INSTANCE | newly generated UUID recorded in the handoff |

Leave `UPMS_PRODUCTION_POSTING` unset during setup. Never set `UPMS_SIMPLE_V1_SYNTHETIC`. Do not put owner, migrator, backup or bootstrap passwords in the web service environment. Require normal InnoDB startup (`innodb_force_recovery=0`), writable InnoDB, utf8mb4 and a supported engine; this milestone tested fresh Oracle MySQL **8.4.13**. MariaDB production compatibility was not newly established here.

Run `npm start` from the extracted release with Node 22.23.4+ or 24.22.0+. Startup checks the database before listening. Configure an unprivileged service with automatic restart on failure, private working directory, protected logs and graceful SIGTERM. Put TLS at the selected provider's reverse proxy; firewall the application's internal port and database port from public access. The application currently listens on all local interfaces, so that firewall is required. Reject unknown hosts at the proxy and permit forwarded headers only from the configured immediate peer. Verify HTTPS redirection, HSTS and certificate renewal on that host. Do not expose the internal port directly.

Example service-manager settings to adapt after host selection: `WorkingDirectory=/srv/upms/current`, `ExecStart=/absolute/node/bin/node server/src/index.js`, `EnvironmentFile=/etc/upms/runtime.env`, `User=upms`, `Restart=on-failure`, `UMask=0077`, `NoNewPrivileges=true`. These are instructions, not an installed or host-tested service. Keep writable backup/log directories outside `/srv/upms/current`.

Health probe: `GET https://app.unique-plastic.com/healthz` returns only `{"status":"ok"}` and no-store. This is process liveness; independently monitor database availability and successful authenticated reads. Unauthorized API access must return 401, private files 404. Cookies use Secure, HttpOnly, SameSite=Strict and the `__Host-` prefix; sessions retain 30-minute idle and eight-hour absolute expiry, CSRF checks and login throttling. Never log secrets, session values or database error payloads.

## New database and administrator — separate owner operation

The offline tool is `node server/tools/production.mjs <action>`. It never runs from HTTP startup. **No real production provisioning action has been executed.** Rehearse the complete CLI on the selected host before approving real initialization. DDL is not atomic: any partial failure must preserve its database/accounts and receive a forward plan, never a reset or rerun against a populated target.

1. Obtain owner approval for a new empty `upms_live_v1` and new localhost-only `upms_runtime_production`, `upms_migrator_production`, `upms_backup_production`. Record server ID, port, instance UUID, backup location and engine. Existing account/schema collisions stop provisioning.
2. In a private operator process, supply the common production identity, `DB_OWNER_USER`/`DB_OWNER_PASSWORD` and fresh separate `UPMS_RUNTIME_PASSWORD`, `UPMS_MIGRATOR_PASSWORD`, `UPMS_BACKUP_PASSWORD` (at least 32 characters each). For `provision`, set `UPMS_OPERATION_APPROVAL=provision:upms_live_v1:<instance-uuid>`. Owner credentials are never passed on the command line. The migrator receives rights on this schema only; runtime has no rights until reviewed initialization. Backup rights are SELECT, SHOW VIEW, TRIGGER and EVENT on this schema.
3. Use `IDENTITY_DB_PURPOSE=operator`, `DB_USER=upms_migrator_production`, its private `DB_PASSWORD`, and `UPMS_OPERATION_APPROVAL=initialize:upms_live_v1:<instance-uuid>`. Supply private `UPMS_ADMIN_LOGIN`, `UPMS_ADMIN_DISPLAY_NAME`, `UPMS_ADMIN_PASSWORD` (at least 16 characters), owner-confirmed `UPMS_OPENING_DATE` (ISO date, not future), `UPMS_NEXT_CHALLAN` (1–10999) and `UPMS_OPENING_REVIEW_REFERENCE` (at least eight characters). Run `initialize` once. It refuses any existing table, applies exactly four migrations and creates one administrator requiring password rotation. It starts in OPENING.
4. Review the receipt and migration history, then use the owner process and `UPMS_OPERATION_APPROVAL=grant-runtime:upms_live_v1:<instance-uuid>` with `grant-runtime`. Exact per-table runtime grants come from `productionRuntimePrivileges`; no CREATE/DROP/ALTER or global grants. Run `inspect` under the respective dedicated credentials and verify CURRENT_USER resolves to the exact localhost identity. Remove bootstrap/owner/migrator secrets from the web process.
5. Start the app with only runtime credentials. Rotate the initial administrator password immediately. No demo password or synthetic operator is supplied in either package.

## Opening entry and cutover review

Have the owner sign a dated source sheet containing bottle codes/descriptions/units/prices/initial quantities, clients and signed opening balances, vendors and signed opening balances, official next DC number and cutoff date. Preserve its hash privately. No real values are supplied by this release.

Prefer controlled manual entry through the existing forms. For a future import, first prepare a read-only mapping/dry-run report: reject duplicate codes, unknown parties, invalid dates, fractional quantity/amount precision and invalid signed balances; show row counts, totals and all rejected rows. Obtain owner review before any write. No bulk import has been executed or silently enabled.

In OPENING, operational posting is blocked even if a posting environment flag is accidentally supplied. Create items/parties and post only STOCK_OPENING, CLIENT_OPENING and VENDOR_OPENING dated exactly at cutoff. Verify zero openings explicitly as well. Posted openings and their journals/audit remain immutable; correct mistakes through an independently reviewed forward procedure. Resolve all drafts; compare quantities and signed ledger totals against the signed sheet. `review-opening` returns the canonical opening fingerprint and reconciliation without enabling posting.

Take and restore a consistent backup as below while business writes are paused. Verify identity/permissions, all table counts and records in addition to the source/journal reconciliation. Review the new immutable restore receipt and exact opening fingerprint with the owner. **A later separate owner approval is mandatory**: only then use the migrator process, `UPMS_OPERATION_APPROVAL=approve-openings:upms_live_v1:<instance-uuid>`, `UPMS_OWNER_RELEASE_APPROVAL=<review-reference>` and `approve-openings <verified-receipt-path>`. This sets database phase LIVE, but operational posting additionally requires the web service to receive `UPMS_PRODUCTION_POSTING=owner-approved` and restart. Neither approval is granted by this milestone. Transactions before cutoff remain rejected.

## Daily backup, restore and rollback

Schedule `production.mjs backup` daily under **upms_backup_production**, with common identity values, `IDENTITY_DB_PURPOSE=operator`, private DB password and `UPMS_BACKUP_DIRECTORY` pointing to a private absolute directory outside the release. Supply the correct native `UPMS_MYSQLDUMP` path. Use compatible MySQL client tools. The CLI uses a single-transaction InnoDB dump, saves a fresh non-overwriting SQL file and SHA256 receipt; failure is nonzero. Keep encrypted off-host copies, restrict access, monitor daily success and periodically verify recovery. Proposed retention: daily 30 days and monthly 12 months, subject to owner policy/storage approval. Never serve backups through the app or include them in ZIPs.

For a recovery drill, use an independently approved NEW `upms_restore_production_<12-lowercase-hex>` schema, private owner credentials, `UPMS_MYSQL`, `UPMS_RESTORE_SCHEMA`, `UPMS_RESTORE_REVIEW_REFERENCE` and `UPMS_OPERATION_APPROVAL=verify-restore:upms_live_v1:<instance-uuid>`. Run `verify-restore <backup-receipt-path>`. It refuses reuse, verifies SHA256, imports once, checks reconciliation and an opening fingerprint when available, then writes a separate `.verified.json`. Preserve failed/partial restores. Always inspect restored identity/permissions and compare all table fingerprints before operational recovery. A backup taken during concurrent writes may have no opening fingerprint; it must never authorize opening cutover. Pause writes and repeat a fresh backup for cutover evidence.

Rollback before opening approval: stop the new app, retain the new database and evidence, restore the previous service environment/release symlink and restart only against its matching reviewed schema. Do not point an old synthetic package at production. Rollback after postings requires a separately reviewed forward recovery plan: retain all later transactions; never overwrite production with an older dump or run migration down. ZIP rollback copies are under `artifacts/rollback/production-readiness/<source-sha>/`. Database recovery must be into a fresh isolated target first, followed by explicit identity/cutover review.

## DNS and owner decisions

Provider selection is open, so no honest A/CNAME target can yet be specified. After selection, record the provider's exact verified target, existing DNS snapshot, certificate procedure, proxy peers and rollback values. Change only the `app` record (A to the supplied fixed IPv4, or CNAME to the supplied hostname, as the selected provider requires). Never alter apex, www, MX or TXT records, nameservers or the existing public hosting. Review the concrete target before any DNS operation. This milestone performs none.

Remaining decisions: provider/local database placement; exact Node and database engine versions; private credentials and sole administrator identity; owner opening values/cutoff/next DC; backup retention/off-host destination; proxy/firewall/certificate/restart acceptance; separately approved real cutover and posting activation.

## Evidence and limits

Fresh isolated Oracle MySQL 8.4.13 ran on loopback **3311**, schema `upms_test_production_20261024_01`, with new restricted accounts and encrypted local credentials. The original databases/demos were untouched. Four migrations produced exactly 22 InnoDB tables. Synthetic SQL acceptance passed **14 workflow checks plus the parent (15 tests)** on Node 22; Node 24 passed **five** read-only compatibility tests. Workflow checks cover forced password rotation, openings, production/purchase stock, pricing, discounted DC and journal deduction, client/vendor payments, paid expense, references, immutable posting, negative-stock rejection, access and backup restore.

The opening backup was restored once into a separate new schema. An initial comparison failed because the comparison connection lacked UTC; the preserved restore was rechecked read-only in UTC, with zero mismatches across all 22 table snapshots. No database was reset or reimported. An initial migration-account caller mismatch also stopped safely and was corrected without relaxing its guard. All populated staging data and failed-run evidence remain private and preserved.

Backend: **187 tests**; frontend: **182 tests**; lint/build and dependency security audits passed (zero reported vulnerabilities). Each packaged runtime passed **20 actual HTTPS browser checks**, including login, secure cookies, feature navigation, XLSX download, PDF print, mobile layout, unauthorized access, private-path isolation, throttling and reconciliation. Browser exports/screenshots contain synthetic data only. Public regression: **60 route/viewport checks + 20 interactions**, Lighthouse performance 94/96/94/98, accessibility/best practices/SEO 100, CLS 0. Committed reports are `PRODUCTION-browser-results.json` and `PRODUCTION-lighthouse-summary.json`.

These are local Windows/native runtime and fresh MySQL results, not a claim that GoDaddy's Linux service, remote database or actual production infrastructure has passed. Existing full ERP SQL suites were not redirected into this Simple V1 database. Stop for independent review; do not deploy, change DNS, import company data or enable production posting.
