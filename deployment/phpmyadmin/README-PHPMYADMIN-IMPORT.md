# UPMS clean SQL import — future operator procedure

Unique Plastic Industry only. This package contains canonical schema and required system catalogs, not a database dump. It creates no users/passwords and no business records. It does not activate UPMS.

**STOP: actual GoDaddy import is not authorized by PHP-8.2.** A local technical validation does not approve any live target. Do not select or empty the old `upms` database.

## Prerequisites before using these instructions

The owner must first approve an exact **new, empty** database name, ownership and complete schema visibility/import grants; verify protected PHP PDO connectivity; retain all 20 old tables in a protected backup and off-device copy with an independently verified restore; approve the exact package/manifest digest and target identity. If a second database cannot be created, stop and review options. No automatic in-place replacement is supplied.

Keep the Laravel backend, credentials, diagnostic/maintenance tools and receipts outside both `/public_html` and `/public_html/dashboard`. Do not upload these PHP utilities through a public URL. The SQL file has no hardcoded destination or USE command: phpMyAdmin's selected database is critical. SQL cannot prove your ownership, backup or approval, or see tables hidden by insufficient privileges.

## Import after separate explicit approval

1. Keep the old `upms` database untouched. Open phpMyAdmin through your authenticated cPanel session; never share its session URL.
2. Click the exact approved **new database** in the left sidebar. Read its name again at the top of the page. It must be empty, with no existing tables or views. Have a second person/record confirm the approved target when practical. Run the single mandatory private preflight below and compare its selected schema/target fingerprint with the approved record. Do not proceed on a failed or unverified preflight.
3. Select **Import**, choose the reviewed `upms-production-clean.sql`, use SQL format and UTF-8 character encoding (the script sets utf8mb4 explicitly), then submit once. Keep the SQL intact, including DELIMITER and the MariaDB anonymous compound block. Do not split it into individual queries or enable an ignore-errors option.
4. Wait for the complete success result. Any error, timeout or missing result means **STOP**. Save only the sanitized error/category and import status privately. Do not re-import, drop tables, clear rows or use a different database to force success without a new review.
5. Refresh the selected database's table list. Expected: 20 canonical tables, including `upms_production_migrations`, and no old `upms_remote_initialization`. The private verifier checks exact structures, catalogs, empty business/users/sessions and PENDING state; table count alone is insufficient.
6. Run private verification and, only after its separately approved operation, private finalization. Finalization performs no schema recreation. It binds genuine server/target/plan/package receipts and leaves SCHEMA_READY/PENDING with zero users. It does not make the system live.
7. Use the existing separately approved private administrator provisioner to create only admin/Admin and haris/Haris with independent random credentials and forced rotation. It binds PENDING; it does not activate posting. Run the private account report. No credentials belong in the SQL, this package, logs or chat.
8. Public activation remains a later operation requiring trusted management endpoint, verified hosting/runtime/SMTP/backup/grants and explicit owner sign-off. The current self-signed certificate may be retained only for a reviewed controlled trust arrangement; do not globally bypass TLS or submit real credentials to an untrusted public endpoint.

## Consolidated private commands (not authorized to execute live now)

Use the reviewed backend and private disabled-profile examples from the repository: `deployment/manual/php82-read-only-socket.disabled.example.json`, `deployment/sql-import-finalization.disabled.example.json` and `deployment/sql-import-approval.NOT-APPROVED.example.json`. All are disabled or NOT_APPROVED. The preflight approval uses operation `import-clean-sql`; finalization uses `finalize-clean-sql-import`. Both require status `APPROVED_FINAL_CUTOVER`, exact reference, MaintenanceApproval targetHash, canonical planHash, SQL/manifest SHA-256, complete backup SHA-256 and independently verified restore reference. These are private owner approval records, not cryptographic signatures. No approval is generated automatically. Fill and approve them privately only after the prerequisites; do not paste passwords. The diagnostic read-only profile cannot activate runtime or maintenance operations.

- Before import: `php verify-clean-import.php --backend /private/backend --profile /private/read-only.json --preflight` requires the exact import approval, backup/restore references and signed-off SQL and manifest digests; it only inspects the selected empty target.
- After import: `php verify-clean-import.php --backend /private/backend --profile /private/read-only.json` performs SELECT-only canonical validation.
- Finalize: `php finalize-clean-import.php --backend /private/backend --profile /private/finalize.json` requires the distinct finalize-clean-sql-import approval, exact target/plan/package digest and durable private receipt location.
- Provision: use the backend's private `scripts/provision-admins.php` with its separate approved profile.
- Report: `php verify-clean-import.php --backend /private/backend --profile /private/read-only.json --accounts` proves exactly the two designated application identities without printing passwords or hashes.

## Failure and rollback limits

MariaDB DDL commits independently. The anonymous block's EXIT handler stops at the first SQL error and marks owned partial imports for review; it cannot roll back created tables. The script refuses nonempty targets, repeated import, missing selection, the known old `upms` and system schemas. An unexpected hidden object or unsupported phpMyAdmin parser can still prevent import. Partial imports and IMPORT_REVIEW_REQUIRED must not be finalized or retried automatically. Preserve the candidate and obtain a reviewed forward-recovery/abandonment decision; do not delete it in this milestone.

The old database and website remain the rollback baseline because they are never changed here. No restore is successful merely because a dump/import exited 0: verify the independent restore's complete schema/count/integrity manifest. After any future legitimate live writes, fence and reconcile before any rollback; never overwrite new transactions blindly.

Validation scope: this artifact was tested with MariaDB 10.11 using a single PDO compound statement and the native MariaDB client with DELIMITER processing. The actual GoDaddy phpMyAdmin version/parser has not been exercised. A parser error is a stop condition; do not split statements or ignore errors.
