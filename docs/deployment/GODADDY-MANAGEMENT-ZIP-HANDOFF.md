# GoDaddy management ZIP handoff

Artifact: `artifacts/upms-godaddy-management-compliant-node22.zip`.
Mode: **disabled management preview**, persistent Express, database unconnected, operational false. This is neither a database diagnostic nor a working staging/production UPMS deployment.

## Exact uploaded package.json

```json
{
  "name": "upms",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "^22.23.4"
  },
  "scripts": {
    "build": "node scripts/check-deployment.mjs",
    "start": "node server/src/godaddy/management-index.js"
  },
  "dependencies": {
    "argon2": "^0.45.1",
    "compression": "^1.8.1",
    "csrf-sync": "^4.2.1",
    "express": "^5.1.0",
    "express-session": "^1.19.0",
    "knex": "^3.3.0",
    "mysql2": "^3.24.6",
    "nodemailer": "^10.1.7",
    "zod": "^4.6.7"
  },
  "main": "server/src/godaddy/management-index.js"
}
```

`npm run build` verifies packaged file hashes and management-only scope, without compiling or running diagnostics. `npm start` launches the persistent Express server on the assigned PORT and 0.0.0.0. There is no dev script, Vite server, database pool, administrator, usable login or automatic migration on this path.

## Local preparation and release evidence

On the reviewed Node 22 line: build the repository with `npm run build`, then `node scripts/package-godaddy-management.mjs`. Verify with `node scripts/verify-godaddy-management.mjs`. The adjacent `.zip.sha256` and `upms-godaddy-management-compliance-receipt.json` identify exact bytes/source SHA, size in decimal MB, exact package.json and test receipts. Repackage after the release commit. The ZIP root contains package.json, main, lock and manifest; upload the ZIP itself without an extra enclosing folder. Never upload node_modules, source asset collections, private config or database exports.

Local verification uses `npm ci --omit=dev` in a clean extracted directory, then the packaged build/start commands. The locked dependency metadata remains compatible with the platform's documented npm installation. Native Argon2 must load/hash/verify on the tested Node runtime; local OS verification does not prove a native install on GoDaddy's actual runtime.

## Preview environment settings

Configure only the reviewed private Preview environment; do not copy production settings or publish. This exact already-approved Preview hostname is currently allowed. If GoDaddy assigns a different hostname, stop for a narrow hostname-policy review instead of using a wildcard or arbitrary-host override.

```text
NODE_ENV=production
UPMS_HOSTING_PROFILE=godaddy-management-disabled
UPMS_DATABASE_PROFILE=godaddy-managed
MANAGEMENT_ENABLED=true
PUBLIC_ORIGIN=https://2idp3wfsef.preview.c35.airoapp.ai
MANAGEMENT_ORIGIN=https://2idp3wfsef.preview.c35.airoapp.ai
ALLOWED_HOSTS=2idp3wfsef.preview.c35.airoapp.ai
TRUSTED_PROXY_IPS=<independently verified exact immediate proxy peer IPs>
INQUIRY_MODE=Disabled
```

PORT is supplied by hosting, not hardcoded in settings. DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD may be automatically injected; this entry point ignores them completely. Do not manually copy credentials into code, ZIP, scripts, logs or environment templates. Keep UPMS_PRODUCTION_*, UPMS_DIAGNOSTIC_*, UPMS_SIMPLE_V1, UPMS_SIMPLE_V1_SYNTHETIC, UPMS_OPERATION_APPROVAL, DB_OWNER_PASSWORD, UPMS_ADMIN_PASSWORD and SESSION_SECRET absent. Their presence is rejected; they cannot select an operational mode. HTTPS/origin/host/proxy checks still apply. A missing/unverified proxy or unfamiliar health-probe Host must be resolved with provider evidence, not trust-all settings or a public health exception.

PUBLIC_ORIGIN here identifies the Node app's approved HTTPS origin for request security; it does not serve or duplicate the cPanel website. The fixed allowlist also recognizes `https://app.unique-plastic.com` for a future reviewed domain change. No domain attachment, DNS change, publication or operational approval is included now.

## Manual GoDaddy Preview procedure — owner review first

The [official upload guide](https://www.godaddy.com/en-ph/help/upload-my-ai-generated-app-to-godaddy-nodejs-hosting-42987) describes ZIP upload, Deploy, Preview and runtime/settings tools. These are documented controls, not dashboard actions executed during this task.

1. Review the package SHA256/mode and preserve the previous management deployment for rollback. Confirm the intended GoDaddy app, its actual assigned Preview hostname and exact immediate proxy peers. Do not touch the separately hosted cPanel website.
2. In Node Hosting, use the intended app's documented ZIP/new-code upload flow. Select this exact management artifact, then Deploy to private Preview only. Confirm the platform installs production dependencies, runs the integrity build and starts the persistent entry point. Do not choose either diagnostic ZIP or the repository-root development project.
3. Set the reviewed Preview variables through Settings and use the assigned private Preview URL. Inspect private Runtime Logs for `upms-management-disabled-preview`, event `listening`, Node 22, database `unconnected`, operational false. Do not print environment dumps or DB credentials.
4. Confirm disabled sign-in, no loaded React business script, no session cookie, blocked management API, management stylesheet availability and truthful `/healthz` JSON. A 200 health response means only that the disabled process is serving; it is not database readiness. Strict Host/HTTPS checks apply to health too.
5. Use Restart Preview App only if needed after settings changes, and verify the same disabled state after restart. Unexpected host/proxy errors or native install failures remain failures requiring evidence, not relaxed security.
6. Stop for owner review. Do not choose Publish Now, attach `app.unique-plastic.com`, change DNS, initialize the database or enable real transactions. Successful Preview rendering does not resolve [database blockers](GODADDY-REMAINING-BLOCKERS.md).

No GoDaddy dashboard, upload, build, runtime, private log or database result was observed in this change. All installation, lifecycle, route and cryptography evidence is local and labeled accordingly.
