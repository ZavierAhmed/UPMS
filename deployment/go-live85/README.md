# Private PHP-8.5 CRUD policy and guard tools

All PHP tools are CLI-only and remain under private staging, outside both web roots. Read `docs/php-migration/PHP-8-5-CRUD-ACTIVATION.md` before any operation.

- `verify-grants.php --policy=godaddy_database_crud`: read-only exact four-grant/current-account verification. Default is the preserved `strict_scoped` policy.
- `install-guards.php --guard-hash=...`: already executed; additive 45-trigger installation using a separate SELECT+TRIGGER definer, record-preservation checks and durable evidence. Existing/partial trigger sets stop for review, not replacement.
- `test-host-guards.php`: already executed, fresh isolated fixture setup only. Never re-run on existing databases.
- `test-kernel.php`: isolated `upms_security85` guard/kernel/financial regressions; synthetic credentials only. Never targets production. Evidence retains the exact guard hash.
- `test-live-protection.php`: already executed rollback-only production probes on existing rows; no financial probe INSERTs. Preserves its first committed evidence receipt.
- `verify-hosted.php`: validated HTTPS/Apache checks with SQL runtime disabled; no real passwords or SMTP.
- `verify-readiness.php` / `readiness-support.php`: fresh grant/guard/definer/account/record/recovery/HTTPS/host/release/business-state checks. Includes all published file copies and original manifest plus explicit source patch. Does not approve or enable anything.
- `activate.php --owner-approve=<current-readiness-digest>`: prepared, NOT executed. Requires explicit owner approval after the final risk/readiness report; uses the existing target-bound maintenance/activation workflow. No import, users, reset or financial smoke records.
- `deploy-patch.ps1`: validates `PATCH85.json`; transfers only entries marked `deploy:true` on explicit `-Mode Deploy`. Other entries bind retained PHP-8.4 patches to the original immutable release. No public frontend upload or SQL/account/activation action.

Production runtime needs no TRIGGER or DDL privileges. The separate definer must retain SELECT+TRIGGER for the verified guard plane. Do not delete that identity or revoke required definer privileges casually; runtime execution depends on the guards. Secret profiles, passwords, approvals, backups, environment files and credential handoffs are never included in the patch or Git.
