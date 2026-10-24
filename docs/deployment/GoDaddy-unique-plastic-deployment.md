# Unique Plastic Industry — GoDaddy release preparation

Prepared 2026-10-24. Source: `604c78afc1c16f9ce8df26299201f8bb08b4d192`; branch `feature/upms-w07-2-godaddy-release`. This guide prepares a future deployment. No upload, DNS change, real-data import, SMTP enablement or production management activation is authorized by W07.2.

## Current compatibility decision

The owner identified **Web Hosting**, with exact tier, control-panel capabilities, server platform and app entitlements still unconfirmed. No hosting account was accessed. Ordinary cPanel web space is **not confirmed for UPMS Node**. The static artifact targets Apache 2.4 with `mod_rewrite`, `.htaccess` overrides and required MIME support; those conditions were tested on an isolated local Apache, not the purchased account.

GoDaddy's separate managed Node product documents ZIP/Git deployment and currently **Node 22**, which does not meet this repository's **Node 24.x** requirement. Its FAQ requires top-level package name/version/main, build/start scripts and the assigned `PORT`; the full-stack package provides those fields. Product documentation also describes managed MySQL and encrypted configuration, but that does not prove compatibility with UPMS's database restrictions. [GoDaddy Node product](https://www.godaddy.com/hosting/nodejs), [official app requirements](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915).

| Requirement | Evidence / decision |
|---|---|
| Node 24 | Local Node 24.22.0 verified. Purchased host unverified; documented managed Node 22 is incompatible. Do not downgrade engines to bypass this gate. |
| Native argon2 0.45.1 | Clean production install and hashing tests pass locally. Host OS/architecture/libc, native addon loading and resource limits must pass independently. Official project supplies platform-specific binaries; source builds require a suitable compiler/toolchain. [node-argon2](https://github.com/ranisalt/node-argon2#prebuilt-binaries). |
| Persistent process | `npm start` runs an ESM Express listener using assigned numeric `PORT`; SIGTERM/SIGINT close connections. Actual supervisor, restart policy and platform timeout limits remain unverified. |
| Passenger | Not tested. Require Node 24 executable selection, ESM entry support, assigned-port handling and restart behavior before choosing it. No Passenger wrapper or cPanel feature is assumed. |
| Database | Current code permits loopback DB hosts only. Oracle MySQL >=8.0.16 can pass the version gate; this is not a production integration certification. MariaDB is explicitly local-development-only and rejected in production. Managed remote MySQL cannot be used by merely changing DB_HOST. |
| Simple V1 management | Synthetic-database-only activation guard remains. No live Simple V1 cutover is implemented or approved. Keep MANAGEMENT_ENABLED=false. |
| Sessions/CSRF | HTTPS management origin, fresh private session secret, database session store, restricted runtime grants, exact-origin unsafe requests and synchronizer CSRF token required. Host restore/auth tests remain pending. |
| Proxy | Only verified nearest-hop IPs may supply forwarding headers. No trust-all setting; require edge overwrite of forwarded headers and a protected upstream listener. |
| Private storage | Entire Node application, configuration, SQL backups and logs outside any Apache static document root. No local recovery directory or Windows credential profile is deployable. |
| Upload | cPanel ZIP upload/extract documented; account quotas and overrides unverified. Managed Node ZIP support is separate from cPanel file serving. |

## Artifacts and local verification

- `artifacts/upms-public-website.zip`: public assets, ten prerendered routes, real 404 document, Apache routing/security rules, sitemap/robots and checksum manifest. No management build, server source, APIs, database, credentials, tests or recovery evidence. Forms remain disabled in static mode; direct phone/email/WhatsApp links remain available. Client-side navigation and galleries work.
- `artifacts/upms-fullstack-node.zip`: production Express source, public build, management build, lockfile, Node 24 declaration, `main`, start/build integrity commands and deployment manifest. No installed node_modules, private profiles, .env, databases or migration execution. Management and SMTP must remain disabled. Do **not** extract this ZIP under public_html.
- Each ZIP has a sibling `.sha256`. `artifacts/W07-2-release-receipt.json` records final source SHA, exact digests and rollback paths. Full-stack ZIP bytes match the existing `upms-node-deployment.zip` output.
- `artifacts/rollback/w072/<final-source-sha>/` contains byte-verified copies of both prepared releases and checksums. These are recovery copies of this release, **not** a backup of an unknown existing live website. The preexisting Node artifact is separately preserved by its digest.

To reproduce locally from the review commit with Node 24:

```text
npm ci
npm ci --prefix upms.client
npm run build
node scripts/package-godaddy.mjs
```

The helper uses the existing allowlisted full-stack packager and shared deterministic ZIP encoding. Files are hashed; existing differing rollback copies stop the operation. The source commit is the checkout base: regenerate packages after committing. Never substitute a stale artifact if an earlier command fails.

## A. GoDaddy cPanel static website — future owner-approved procedure

1. Confirm the purchased Web Hosting account's actual cPanel domain document root for `unique-plastic.com`. Confirm Apache 2.4 rewrite support, AllowOverride permission, ZIP extraction and space for current/staged/rollback files. Obtain the hosting destination values from the account; this guide supplies no IP address or account path.
2. Download a complete copy of the current live document root, including hidden `.htaccess`, and export current DNS records before changes. Keep that backup outside the public root. Record checksums and prove it can be opened in a separate staging location. The prepared rollback copies do not replace this live-site backup.
3. Compare the downloaded static ZIP with its SHA256 sidecar before uploading. Use cPanel **File Manager → domain's document root → Upload**. Upload only `upms-public-website.zip`, then extract into a new staging directory outside the current live root. Enable **Show Hidden Files** and verify `.htaccess` was extracted. [Official upload procedure](https://www.godaddy.com/help/upload-files-using-my-web-hosting-cpanel-file-manager-3239), [ZIP extraction](https://www.godaddy.com/help/unzip-files-in-my-web-hosting-cpanel-account-8396).
4. Inspect the staging file list against `release-manifest.json`. Do not copy server/, management/, node_modules/, .env, SQL files or development sources. Install at the domain root, not a subdirectory: asset URLs and the error-document path are root-relative. Do not expose the ZIP as a public downloadable archive.
5. Before DNS switching, test in an owner-approved private staging environment with Apache overrides enabled. Required results: `/`, `/about`, `/products`, `/manufacturing`, `/industries`, `/contact`, and the four active product paths return 200; `/products/jars` and unknown URLs return 404, not an SPA fallback. API/management/source paths are unavailable; direct `_site` access is blocked. If `.htaccess` yields 500 or is ignored, stop and have GoDaddy confirm support; do not remove the protections just to show a page.
6. Request owner approval for the **actual document-root swap/upload**. After that separate approval, use the hosting account's supported staging/root-swap process or a bounded maintenance window. Avoid mixing old and new hashed assets. Keep the prior root recoverable.
7. DNS: in **Domain → DNS**, use the exact address/target furnished by the hosting account for the apex A/AAAA and supported www alias. Do not guess an address, change mail MX/TXT records, or retain an obsolete AAAA that routes elsewhere. Choose apex `https://unique-plastic.com` as canonical; redirect www at the verified hosting edge. Export values/TTL first; obtain separate owner approval for DNS edits.
8. Issue/attach an SSL certificate covering the chosen apex/www hostnames using the actual account's supported certificate workflow. Verify chain, renewal and both names. Enable its supported HTTP→HTTPS redirect after certificate verification. Do not blindly trust client-supplied X-Forwarded-Proto in an Apache rule. HSTS should be enabled only after HTTPS/rollback impact is reviewed. This static ZIP intentionally leaves certificate/proxy-specific redirection to the verified hosting configuration. [GoDaddy HTTPS/cPanel instructions](https://www.godaddy.com/help/redirect-my-website-to-https-using-cpanel-27870).
9. Validate real HTTPS responses, canonical metadata, sitemap, mobile layout, hover images, keyboard, gallery swipe, contact links and 404 statuses. Online form submission remains disabled. Do not add a third-party form endpoint or enable SMTP without a separate reviewed change and delivery test.

## B. Node 24-compatible hosting — conditional, not approved for this Web Hosting plan

Do not upload the full-stack package to the documented Node 22 product expecting it to work. First obtain written/runtime evidence of **Node 24**, native-addon support, protected application storage, exact proxy topology, restart controls and database compatibility. A properly administered VPS may meet these conditions, but none is purchased or configured by this milestone.

On an approved Node 24 host, deploy a new versioned directory **outside** the static document root, with a nonprivileged application account. Verify the archive checksum, extract it, and run the following inside that new directory:

```sh
node --version                 # must report v24.x
npm ci --omit=dev
npm run build                  # verifies every packaged checksum and exact route set
node --input-type=module -e 'import argon2 from "argon2"; const h=await argon2.hash("synthetic-install-check"); if(!await argon2.verify(h,"synthetic-install-check"))process.exit(1); console.log("argon2 installation verified")'
```

This synthetic string is not a login credential. If native-addon installation fails, stop and confirm supported prebuilt platform or an approved build toolchain; do not switch password algorithms or reuse Windows node_modules. No Vite compiler is needed on the host because the ZIP contains the built frontend.

Configure the following through the **actual platform's private environment facility**, not committed files or a downloadable .env:

| Variable | Public-backend staging value / activation requirement |
|---|---|
| NODE_ENV | production |
| PORT | Actual assigned numeric port; never an invented hosting value |
| PUBLIC_ORIGIN | https://unique-plastic.com |
| ALLOWED_HOSTS | unique-plastic.com;www.unique-plastic.com (add a staging hostname only after explicit review) |
| INQUIRY_PUBLIC_ORIGIN | https://unique-plastic.com, or exact reviewed staging HTTPS origin during testing |
| INQUIRY_MODE | Disabled |
| MANAGEMENT_ENABLED | false |
| WEBSITE_ROOT | upms.client/dist, with process working directory at release root |
| TRUSTED_PROXY_IPS | Only actual verified nearest-hop IPs; leave empty for direct TLS. Never set TRUST_PROXY=true or ForwardedHeaders_Enabled=true. |
| SMTP_* | Unset until separate mail configuration approval and synthetic delivery tests |
| UPMS_SIMPLE_V1 | Unset; no synthetic-mode production bypass |
| MANAGEMENT_ORIGIN / SESSION_SECRET | Not needed while disabled; future activation requires exact HTTPS origin and fresh private random secret of at least 32 bytes, never demo values |
| DB_HOST/PORT/NAME/USER/PASSWORD | Unset while management is disabled. Future authorized target must satisfy loopback host, permitted UPMS schema name, supported engine and restricted account guards. Store secrets privately. |

Use the hosting supervisor's verified start command `npm start`, Node 24 executable and release-root working directory. Restrict the app's `0.0.0.0:PORT` listener behind the verified HTTPS edge/firewall; public clients must not reach it directly. Establish the actual supervisor restart/stop command from the provider, then test graceful termination, process recovery and log access on staging. No Passenger command is supplied as though it were a confirmed account feature.

Before any future management activation: obtain a separately approved production foundation/cutover plan; provision dedicated restricted runtime/migration/backup accounts; apply reviewed migrations with the repository's owner tooling (not automatic package startup); bootstrap a new administrator privately; test permissions, login/logout/rotation, secure cookie flags, origin/CSRF rejection and session recovery against a synthetic staging database. Resolve the current synthetic-only Simple V1 gate through review, not an environment workaround. Test backups and restoration before opening network access. Do not import real balances.

Database backup procedure for that **future approved** target: use a separate protected client option file and backup account. Dump the selected UPMS schema **without --databases**, so the dump does not force the original schema name. Example command shape, with owner-supplied private paths:

```sh
mysqldump --defaults-extra-file=/PRIVATE/backup-client.cnf --single-transaction --routines --events --triggers --hex-blob upms > /PRIVATE/BACKUPS/upms-reviewed.sql
sha256sum /PRIVATE/BACKUPS/upms-reviewed.sql
mysql --defaults-extra-file=/PRIVATE/restore-client.cnf OWNER_APPROVED_NEW_EMPTY_RESTORE_SCHEMA < /PRIVATE/BACKUPS/upms-reviewed.sql
```

These placeholders must be replaced after owner review. Creating the new restore schema and granting access require separate approval; never point the restore command at the live schema. Verify tables, migrations, accounts/permissions, fingerprints and reconciliation in that isolated restoration. Encrypt/offsite the backup and retain recovery instructions. Original local XAMPP data, snapshots and recovery evidence are not a production deployment source.

## C. Static GoDaddy site with UPMS hosted privately elsewhere

Use procedure A for `unique-plastic.com`. Keep UPMS on a separately approved Node 24 private host/VPN/restricted network, outside GoDaddy's static document root. Do not add a public management link, reverse proxy, CORS exception or credential to the static website. The public static artifact needs no database. If a public inquiry API is later desired, review same-origin routing, delivery/privacy, CSRF/origin behavior and authentication boundaries as a new change; the current form remains disabled.

## Validation, rollback and approval checkpoints

Local verification includes full backend/frontend suites (including management UI), public route/browser and gallery checks, Lighthouse, audits, extracted full-stack checksum/corruption/private-path tests, and an extracted static release served by an isolated Apache. Linux/native-addon acceptance, actual GoDaddy SSL/proxy/restart limits and production database restoration remain unverified. A local pass is not hosting acceptance.

Before any release, compare the final source SHA and both ZIP digests to `W07-2-release-receipt.json`, and compare the rollback copies byte-for-byte. A corrupted or differing existing copy stops packaging. For a future static rollback, restore the verified **previous live document root** and its hidden rules from the predeployment backup; restore DNS only from the saved owner-approved records if DNS changed. Retest HTTPS, routing and mail records. For a Node rollback, select the previous reviewed release directory and supervisor configuration, restart through the verified platform mechanism, and validate public/private routes. Do not restore a database automatically: this milestone makes no database changes, and any future database rollback requires its own reviewed restore decision.

Owner approval is still required for hosting/product selection or upgrade, any account access/upload/deployment, document-root swap, DNS/certificate changes, production secrets/accounts/database provisioning or restoration, SMTP enablement, real-data cutover, and management activation. W07.2 stops before all of those actions.
