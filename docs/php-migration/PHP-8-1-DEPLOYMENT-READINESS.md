# PHP-8.1 deployment readiness

**PARTIAL local readiness; production activation BLOCKED.**

| Area | Status |
| --- | --- |
| Canonical initialization, DDL receipts/recovery, clean two-admin ordering | Implemented and tested locally |
| TLS/socket mode distinction and synthetic guards | Implemented; actual Linux socket integration passes; GoDaddy transport unverified |
| Owner SSH/PHP CLI/extensions/process/scratch/InnoDB evidence | Accepted as owner-supplied, within documented limits |
| Linux no-dev dependencies/platform/audit/allowlist manifest | Locally verified staging candidate; not a production-ready artifact |
| Nested document roots and exact-host boundaries | Local Linux Apache checks pass; actual GoDaddy rewrite/PHP behavior unverified |
| Public management trust | BLOCKED: owner-retained self-signed endpoint is not publicly trusted |
| SMTP endpoint/TLS and actual web worker/journal behavior | BLOCKED pending approved provider endpoint and matching-host evidence |
| Exact new schema/quota and restricted accounts/grants | BLOCKED pending cPanel/provider verification |
| Actual complete backup/off-device copy/independent restore | BLOCKED |
| Production initialization/provisioning/files/DNS/activation | NOT AUTHORIZED; none performed |

## Layout and release preparation

Private backend/vendor/config/storage/logs/credentials/backups/maintenance scripts must live outside both /public_html and /public_html/dashboard, under a verified owner-home prefix. Only approved public assets and inquiry.php go to the public root. Only SimpleV1 HTML/assets and gateway.php go to management. The parent public rules allow the app virtual host to apply its own boundary while refusing public /dashboard and /management access; the management rules and PHP middleware enforce the exact host and HTTPS. No forwarded-host workaround is trusted. CSP/no-store/noindex/frame denial, Secure HttpOnly host cookies and CSRF remain intact.

`php-8-1-release-source.mjs` uses an explicit source allowlist, marks SimpleV1 HTML and preserves its /management/assets URL mapping. `linux-release-finalize.sh` installs locked Composer --no-dev dependencies on Linux, validates platform/audit, removes only generated fresh builder cache, resolves staging entry paths and emits a SHA256/byte manifest through verify-release.php. It never migrates, seeds, provisions, uploads or activates. No Windows vendor, test datasets/dumps, secrets, SSH/CA private keys, logs, journals or temporary workspace state are included. Canonical production DDL/catalog JSON is required application code, not a UAT dump.

The local Linux candidate's absolute entry paths belong to its private staging directory. They are not approved GoDaddy paths. Any future final-path build must use the reviewed actual destination and regenerate/verify its manifest; never upload the staging candidate blindly. The verified Linux fixture uses a different distribution/patch build from GoDaddy, so exact host acceptance is still required.

Keep the existing website untouched during preparation. Retain the self-signed certificate for owner-controlled private staging only through a separately reviewed explicit trust arrangement, e.g. an out-of-band fingerprint-verified public certificate trust file. Never globally disable verification or collect actual administrator passwords through an unverified endpoint. No SSL purchase or DNS change is proposed.

Remaining owner actions are consolidated in deployment/manual/PHP-8-1-README.md. Existing residual boundaries still require explicit disposition before cutover: original fingerprint authenticity, SQL posted-row immutability, shared-SQL-account self-password-row scope, provenance of any future imports, uncertain SMTP delivery, operational recovery/retention, and owner business/visual/native print/Excel acceptance. Local test success accepts none of these risks for the owner.

The final locally verified candidate contains6,038 payload files, including the private supervised inquiry-mail worker. check-release.php independently verifies the existing manifest without rebuilding it; use a trusted copy plus the approved external manifest digest. Local tampering and extra-file tests both failed as intended, and the restored artifact passed. Current artifact metadata and digests are in PHP-8-1-LOCAL-EVIDENCE.json.
