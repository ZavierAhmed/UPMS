# Private PHP-8.4 operator tools

These scripts are CLI-only and target the existing reviewed GoDaddy layout. They are not web endpoints and must stay outside `public_html`. Actual execution/results and the next provider action are in `docs/php-migration/PHP-8-4-GO-LIVE.md`.

- `prepare-maintenance.php`: one-time private maintenance identity, explicit legacy waiver and target-bound approvals. Already executed; do not rerun.
- `publish.php`: one-time verified reversible copy and publication of the existing staged frontend, with private backend, disabled SQL/SMTP and HTTPS rules. Already executed; do not rerun.
- `verify-new-recovery.php`: actual fresh baseline snapshot/restoration in an isolated recovery database. Already executed; do not rerun against existing artifacts.
- `prepare-runtime.php`: separate SELECT-only runtime identity and disabled profile backed by actual new-schema recovery evidence. Already executed; do not rerun.
- `runtime84-grants.sql`: exact provider DBA grants; contains no passwords. `runtime84-policy.json` mirrors the existing approved privilege review.
- `verify-runtime-grants.php`: read-only exact privilege comparison, safe after provider completion, never enables HTTP runtime.
- `verify-hosted.php`: validated HTTPS/static/routing/private-boundary checks while runtime is disabled; no real credentials or SMTP submission.
- `install-management-ssl.php`, `renew-management-ssl.sh`, `schedule-renewal.php`: free trusted certificate installation and explicitly owner-approved renewal. Preserve existing cron entries. No TLS bypass.
- `support.php`: JSON stdin cPanel calls through GoDaddy's `/usr/bin/uapi` CageFS wrapper and durable private JSON writes.

All secret-bearing files remain in private mode-0600 server runtime storage. Do not collect or commit them. Source SQL import and original staged payload are preserved unchanged.
