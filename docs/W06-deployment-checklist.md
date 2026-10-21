# W06 deployment procedure and acceptance checklist

This is a reviewable procedure and local artifact, **not authorization to deploy**. All external steps remain pending. No DNS, purchase, upload, GitHub hosting integration, live domain or sender was configured.

## Local preparation

Use Node 24 LTS, npm and the checked-in lockfiles. From the repository root:

```sh
npm ci --include=dev
npm ci --include=dev --prefix upms.client
npm run verify
npm audit
npm audit --prefix upms.client
npm run test:browser:w06
npm run package:deployment
```

The browser harness requires local Chrome and developer TLS certificate/key (TEST_TLS_CERT/TEST_TLS_KEY; see README). It writes separate W06 evidence; W05 reports remain historical. Browser tests use only loopback, synthetic contacts and a local outbox. Build-time rendering produces eleven documents plus 404; no production SSR process is needed.

`package:deployment` builds the frontend and writes ignored `artifacts/upms-node-deployment.zip` plus `.sha256`. It uses Node built-ins, no new dependencies. Files are allowlisted: server runtime JS, built assets/documents/manifest/licenses, root package/lock, Node version, and a release-check script. It excludes .git, .env, node_modules, tests, docs, source brochures, unused source logos and private outboxes. Symlink/unexpected-file checks fail the package build. ZIP32 size limits are explicit; this small site does not need ZIP64. Entry names and timestamps are deterministic; repeat packaging of identical inputs yields identical bytes under Node 24.

The ZIP has package.json at its root. Its generated package.json deliberately changes build to checksum validation because the frontend is already built; start remains `node server/src/index.js`. Dependency resolution uses the original lockfile. `deployment-manifest.json` records file SHA256 values and the checkout commit; local edits are represented by content hashes. The sidecar checksum is an integrity check, not a signed authenticity guarantee. Generate from a clean reviewed commit for release; retain artifact, sidecar and commit together outside the hosting release folders.

Independent local ZIP acceptance:

1. Extract to a **new empty private directory**, never over an existing deployment/user folder. Windows Expand-Archive or a standard unzip utility is sufficient.
2. In the extracted root run `npm ci --omit=dev` and `npm run build`. This verifies checksums and the eleven-route registry with no Vite or .NET runtime.
3. From the source checkout run `npm run test:package -- <absolute-extracted-directory>`. This starts only that extracted server on loopback with delivery Disabled and probes all routes, assets, private paths and synthetic unavailable delivery. It records docs/W06-package-results.json; it is never a hosting entry point.
4. Compare the ZIP SHA256 with the sidecar. Run the release check before altering any bundled file. Credentials belong only in dashboard environment values.

## GitHub deployment (future authorized action)

The [official guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) supports GitHub import. Select the exact reviewed release commit/branch in an eligible Node app, Express, Node 24 and repository root. Proposed explicit build command:

```sh
npm ci --omit=dev && npm run build:hosting
```

`build:hosting` installs frontend development tools explicitly and runs the existing Vite/prerender build even when NODE_ENV=production. Entry: `server/src/index.js`; start: `npm start`. Confirm the backend routing/output settings described in the compatibility report; don't select a Vite-only static export.

GitHub import can activate automatic push deployments and preview builds. **Do not connect it until the user approves that behavior or the account offers a verified manual-only configuration.** If automatic behavior cannot be disabled/controlled, use the ZIP route after separate deployment approval. Pushing the W06 review branch is not permission to activate hosting automation.

## ZIP deployment (future authorized action)

Choose Web App → Upload website files in an eligible managed Node account. Upload the reviewed ZIP, choose Express (or a verified backend Other configuration), Node 24 and archive root. Build command:

```sh
npm ci --omit=dev && npm run build
```

Start `npm start`, entry `server/src/index.js`. In this ZIP only, build checks the prebuilt release; it does not invoke Vite. Hostinger may install dependencies automatically before this explicit command; repeated npm ci is safe but confirm its build log. node_modules is never shipped. This workflow remains locally proven and account-unverified.

## Production environment review

| Setting | Required launch value |
| --- | --- |
| NODE_ENV | production |
| PORT | Use the platform-provided value; UPMS fallback 3000. Confirm the selected workflow's port requirement. |
| ALLOWED_HOSTS | Exact approved real hostname(s), no wildcard, scheme or port. The .env.example loopback list is for local safety, not a production domain. |
| PUBLIC_ORIGIN | Blank during private readiness checks; approved real HTTPS origin before public indexing. Blank intentionally returns noindex/disallow-all and sitemap 503. |
| TRUSTED_PROXY_IPS | Exact verified immediate peers only. Empty until support/target evidence is available. Never trust all or copy loopback test settings blindly. |
| INQUIRY_PUBLIC_ORIGIN | Normally blank to inherit PUBLIC_ORIGIN; an override must be the verified browser origin. |
| WEBSITE_ROOT | Leave default upms.client/dist with the release root as cwd, or an explicitly verified absolute directory. |
| INQUIRY_MODE | Disabled throughout W06 and first hosting acceptance. DevelopmentFile cannot activate in production. |
| INQUIRY_TIMEOUT_SECONDS / INQUIRY_RATE_LIMIT | Defaults 15 seconds / 5 per ten minutes. Review any change against the tested 1–30 / 1–100 bounds. |
| SMTP_* | Leave empty until separate live-mail approval and connectivity/provider verification. |
| DB_* | Not consumed by this website; do not configure a database merely for readiness checks. Future-only proposal is in the MySQL report. |

[Hostinger supports dashboard environment settings](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/). Add missed keys manually. Never place secrets in VITE_* variables; those become public bundle contents. The app does not implicitly load .env. Restart/redeploy after configuration changes as required by hPanel; restart resets process-local inquiry/rate state.

## Acceptance checklist

- [x] W05 baseline verified; W06 feature branch; master untouched; untracked source assets preserved.
- [x] Node 24 local build, backend/frontend tests and lint; real startup, invalid configuration, occupied port and shutdown handler tested.
- [x] ZIP independently extracted, production-only install/checksum validation and eleven-route smoke test.
- [x] Responsive/interaction regression and dependency audits performed locally; see verification report.
- [ ] Account proves eligible Express entitlement; Premium alone fails the documentation gate.
- [ ] User authorizes deployment and any GitHub automation; no such action is part of W06.
- [ ] Confirm Node 24, cwd, entry, build, PORT and actual backend output/routing configuration.
- [ ] Verify immediate proxy peers, header sanitation and origin isolation before setting trust; no redirect loops or spoofed HTTPS/client IP.
- [ ] Approve real domain/TLS/DNS and canonical origin. With origin blank, prove no indexing/canonical leakage; then approve and verify real-domain canonical, sitemap and robots.
- [ ] All eleven direct URLs and refreshes return meaningful HTML 200; unknown public URLs are 404; known public unsupported methods 405; unknown APIs JSON 404. Preserve the tested GET-only robots/sitemap behavior.
- [ ] Edge responses retain CSP, HSTS, DENY, nosniff, no-cache HTML and no-store/uncompressed API. No CORS exposure.
- [ ] Probe /.env, /package.json, /deployment-manifest.json, /server/src/index.js, /_pages/home.html and private outbox paths through the **real edge**: no contents or static bypass.
- [ ] Confirm static imagery/fonts/licenses, responsive navigation/filtering, category preselection, WhatsApp/Maps URLs and inquiry failure UI with synthetic data only. No real SMTP messages.
- [ ] Confirm actual alias process topology/resource budget, release-folder overwrite behavior, backup coverage and rollback artifact availability.
- [ ] If later enabling SMTP, independently approve sender/recipient/secrets, verify TLS/egress/provider quotas, and distinguish relay acceptance from inbox receipt. W06 does not do this.

## Troubleshooting and rollback

Follow [official build troubleshooting](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/): inspect logs for the first failure, verify root package.json, Node version/framework/root and entry, then confirm commands and dependency installation. Missing prerender manifest means the build didn't complete or cwd/artifact layout is wrong. A production startup failure can be explicit-host/origin/trust configuration; don't print environment secrets or disable validation. A redirect loop indicates unverified TLS/proxy handling: stop acceptance and obtain topology evidence. A 503 may mean startup failure, resource limits or honest delivery_unavailable; identify the layer using safe correlation/outcome logs. Never enable SMTP to make a test green.

For an authorized rollback, preserve safe diagnostics and the current configuration, keep inquiry delivery Disabled, and redeploy the retained last-known-good **Node** artifact/commit with its matching environment settings. W05 at `1a60bca4e5f4d41b7f0ef0f9615af3964a56c422` is the Node baseline; the W04 .NET artifact cannot run on managed Node hosting. Prefer a fresh managed redeployment over manually editing hbuilds symlinks or release files. Hostinger retains only two successful versions and overwrites managed folders, so retain your own artifact and checksums. Re-run the acceptance checks after rollback and reconcile uncertain inquiries manually before any sender activation. There is no W06 database migration to reverse.
