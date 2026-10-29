# PHP-8.3 — verify imported upms_v1; finalization blocked

Do not re-import, initialize, recreate tables, seed rows or reset counters. Owner reports canonical import already completed. Codex made no database connection or change on GoDaddy. Existing upms remains preserved. The account upms_view_user@localhost is verified only on old upms; no new-schema privilege is assumed.

## One separate SELECT-only verification account

Owner may use cPanel to create a uniquely named dedicated local verification account with a privately generated password, or separately approve an existing account after reviewing its entire privilege scope. Assign only SELECT to upms_v1; no write/DDL/GRANT OPTION, global SELECT, roles or access to old upms. Do not paste passwords into chat/SQL/command arguments. Keep password file0600 under private runtime/.

For a privileged owner/provider, the narrow grant shape after the exact account already exists is:

```sql
GRANT SELECT ON `upms\_v1`.* TO 'ACTUAL_APPROVED_USER'@'localhost';
```

This is an owner-executable instruction, not an operation performed here. Confirm the actual cPanel-prefixed account name. MariaDB database-level _/% names are wildcard patterns; use literal escaping and privately review what cPanel actually granted. If its UI cannot express the required restriction, request the precise provider correction rather than grant ALL. [MariaDB GRANT reference](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant).

The runner rejects visible wildcard/writer/global/role/grant-option grants, but SHOW GRANTS alone cannot prove all effective privileges where other host-pattern grants or inherited/public roles apply. A privileged owner/provider must review those and confirm the account is genuinely SELECT-only; then set effectivePrivilegesReviewed true in the private profile. No broader system-table privileges are requested for the verification account. Keep raw SHOW GRANTS private because it may include authentication data. [SHOW GRANTS reference](https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-grants).

Copy tools/upms-v1-read-only.DISABLED.json to runtime/read-only.json privately. Fill actual account/user/password-file, exact full VERSION() string and review reference. Retain schema upms_v1, verified socket/UID981/server-ID1/hostname pins, actual public roots and privateRoot=/home/tsn6az96j3v7/upms-php83-staging. Enable only read-only-transport-verification and the explicit reviewed socket/metadata flags after approval. No host/port/caFile in Unix-socket mode. Production flags stay disabled.

Run the single consolidated command from GODADDY-DEPLOYMENT with --database-profile. It first checks grant scope, then invokes the **unchanged PHP-8.2 verify-clean-import.php** against the staged backend/import package, inside a READ ONLY transaction. It verifies20 exact canonical structures/keys/FKs/decimal types, roles/permissions/seeds, utf8mb4, empty users/business/sessions, PENDING/numbering, no extra/partial/duplicate import, exact authenticated account/schema/server pins and genuine imported receipt. No writes or manual dozens-query checklist.

## Existing backup: request missing evidence, not another export

Backup is owner-confirmed; filename/SHA-256/object coverage/off-device verification/restore reference remain unsupplied. Locate the existing protected file and record filename, size, timestamp, source/tool version and checksum. PowerShell:

```powershell
Get-Item -LiteralPath 'ACTUAL_EXISTING_BACKUP' | Select-Object Name,Length,LastWriteTimeUtc
Get-FileHash -Algorithm SHA256 -LiteralPath 'ACTUAL_EXISTING_BACKUP'
```

Privately verify dump/archive scope includes all20 old tables and applicable triggers/routines/events, schema/data/identity/history/upms_remote_initialization. Verify a protected off-device copy by checksum, without putting the backup into this staging package or web roots. Do not infer complete coverage just from a file existing.

Restore only to a separately approved isolated destination, **never upms or upms_v1**; preferably an isolated MariaDB10.11 instance. Review source USE/CREATE DATABASE/DEFINER and other destination-affecting statements before execution; no blind restore of a dump that can redirect to the original. Compare every schema/key/type/collation, row count and integrity/hash, applicable financial/stock reconciliation, identities/history and counters against the source backup evidence. Record a durable independent restore reference and checksum. No backup file or isolated restore destination was available to Codex, so no independent restore was performed. If unavailable, leave the gate blocked and continue private staging only.

## Future finalization — NOT authorized now

Use tools/upms-v1-finalization.DISABLED.json and approval.NOT-APPROVED.json as private copies, never enable them while restore/approval gates are missing. The approval must bind actual maintenance identity/socket/paths, unchanged canonical plan, SQL SHA and the **SQL package manifest SHA** (not the staging manifest), verified backup SHA, independent restore reference and exact operation finalize-clean-sql-import/reference/status APPROVED_FINAL_CUTOVER. MaintenanceApproval::targetHash is a profile/account/path/transport fingerprint; do not substitute the database-only targetHash from the import report. Compute it privately from the final reviewed profile using the existing helper after all fields are known.

Only following separate actual authorization:

```sh
php /home/tsn6az96j3v7/upms-php83-staging/payload/import-tools/finalize-clean-import.php --backend /home/tsn6az96j3v7/upms-php83-staging/payload/release/private/backend --profile /home/tsn6az96j3v7/upms-php83-staging/runtime/finalize.json
```

The existing finalizer verifies the imported state, binds genuine schema/plan/target/package/durable private receipts, leaves SCHEMA_READY/PENDING/zero users and does not recreate tables. Preserve committed-intent failures for reviewed retry; never reset or replay import. This command was prepared, not executed.
