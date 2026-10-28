# cPanel layout and validation — design only

No cPanel installation, upload, DNS change or live file change is part of PHP-1.
The examples under `upms.php/deployment/` are not a deployable package. This milestone's
database profile rejects the owner's schema; a reviewed production profile is required.

## Proposed layout

```text
/home/ACCOUNT/
  public_html/                         unique-plastic.com
    index.html, approved React assets and prerendered public pages
    backend.php                        future reviewed public API entry
    .htaccess                          API rewrite before public deep-link fallback
  app_public/                          app.unique-plastic.com; separate cPanel root
    backend.php                        reviewed private API entry only
    .htaccess
    management/index.html
    management/assets/                 locally compiled management assets
  upms_private/
    current/                           reviewed release pointer/directory
      app/, bootstrap/, config/, routes/, vendor/, .env
      storage/                         private logs/cache/reports
    releases/<commit>/                 immutable source and Linux vendor tree
    backups/                           approved backups, never under either web root
```

If cPanel forces an app root beneath public_html, verify an explicit main-host denial
for that subtree and its direct URL before accepting the layout. Prefer independent
roots outside one another. Keep the entire source/vendor tree outside both roots in
either case. No symlink or alias may expose private paths.

## Review checklist

- [ ] Verify actual account PHP version/build and all extensions for both CLI and web
  SAPI using a private CLI/support session. Do not publish phpinfo/debug probes.
- [ ] Confirm the provider-local hostname/socket in this account. GoDaddy documents
  localhost; never substitute the external allowlisted development IP by assumption.
- [ ] Verify MariaDB identity/version/schema and least-privilege grants without writes.
  Preserve the administrator, Argon2id hash, roles, authorization version, counters,
  existing journals and all migration records. Do not run `artisan migrate` or seed.
- [ ] Confirm independent document roots, correct HTTPS certificates and actual
  mod_rewrite/AllowOverride behavior. No wildcard forwarded-header trust.
- [ ] Produce production dependencies on matching Linux/PHP with the committed lockfile:
  `composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction`.
  Run `composer check-platform-reqs --no-dev`. No Composer or Node is needed on hosting.
- [ ] Build React locally. Public root excludes management; app root includes only
  the management static build plus the reviewed PHP entry. Verify official approved
  Unique Plastic Industry branding in content, metadata, imagery, alt text and downloads.
- [ ] During future packaging, set `data-upms-mode="simple-v1"` on the copied management
  index HTML. The existing Express server injects it dynamically, while Vite's current
  plugin injects it only for local development. A static PHP deployment must preserve
  that selection explicitly; the React component source needs no rewrite. Never alter
  the public site's HTML for this management-only marker.
- [ ] Set APP_DEBUG=false, stable private APP_KEY, exact per-host origin and host-only
  secure cookies. Public inquiry and management origin rules remain separate. Do not
  set cookie Domain=.unique-plastic.com or use cross-origin CORS as a shortcut.
- [ ] Verify storage/bootstrap cache permissions under the web PHP user. No public
  storage link, world-writable private directory or downloadable log/backup/report path.
- [ ] Validate existing file/static handling, `/management/` deep links, API precedence,
  missing assets returning 404, hidden-file/PHP denial and unknown route responses.
- [ ] Run auth/CSRF/expiry/permission/differential SQL and browser tests on isolated
  staging. Test concurrent requests against account memory/time/connection budgets.
  Local CLI performance is not hosted capacity evidence.
- [ ] Validate contact-delivery and print/Excel downloads. Confirm no live inquiry
  route is replaced by an unimplemented response or generic HTML fallback.
- [ ] Complete financial-write parity and review backup/rollback/cutover evidence.
  Startup must never migrate, seed, bootstrap an administrator or reset counters.
- [ ] Obtain the owner's release approval only after these checks have concrete
  evidence. Deploying is outside this task's authorization.

Health/readiness endpoints return minimal status only. Readiness checks existing
schema compatibility without migrations. No HTTP diagnostic, migration, test, Artisan
or administrator-bootstrap endpoint exists. No Node, Vite, queue daemon or scheduler
is required on hosting by this foundation.
